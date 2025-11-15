/**
 * Backtesting Engine
 * 
 * Simulates trading strategy execution over historical OHLCV data
 * with commission, slippage, and comprehensive metrics calculation
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const vm = require('vm');

class BacktestEngine {
  constructor(options = {}) {
    this.commission = options.commission || 0.001; // 0.1% default
    this.slippage = options.slippage || 0.0005; // 0.05% default
    this.initialCapital = options.initialCapital || 10000;
    // Support multiple timeframes (array). Backwards compatible with single 'timeframe' option.
    this.timeframes = options.timeframes || (options.timeframe ? [options.timeframe] : ['1h']);
  }

  // Convert timeframe string like '1m', '5m', '1h', '1d' to milliseconds
  timeframeToMs(tf) {
    const match = String(tf).toLowerCase().match(/^(\d+)(m|h|d)$/);
    if (!match) throw new Error(`Invalid timeframe: ${tf}`);
    const n = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'm') return n * 60 * 1000;
    if (unit === 'h') return n * 60 * 60 * 1000;
    if (unit === 'd') return n * 24 * 60 * 60 * 1000;
    throw new Error(`Unsupported timeframe unit: ${unit}`);
  }

  // Aggregate raw candles into the given timeframe
  aggregateCandles(candles, timeframe) {
    if (!Array.isArray(candles) || candles.length === 0) return [];
    const interval = this.timeframeToMs(timeframe);
    const grouped = new Map();

    for (const c of candles) {
      const ts = c.timestamp instanceof Date ? c.timestamp.getTime() : new Date(c.timestamp).getTime();
      const bucket = Math.floor(ts / interval) * interval;
      if (!grouped.has(bucket)) grouped.set(bucket, []);
      grouped.get(bucket).push(c);
    }

    // Convert groups into candles
    const result = [];
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => a - b);
    for (const key of sortedKeys) {
      const group = grouped.get(key);
      if (!group || group.length === 0) continue;
      const open = group[0].open;
      const close = group[group.length - 1].close;
      const high = group.reduce((m, v) => Math.max(m, v.high), -Infinity);
      const low = group.reduce((m, v) => Math.min(m, v.low), Infinity);
      const volume = group.reduce((s, v) => s + (v.volume || 0), 0);
      result.push({ timestamp: new Date(key), open, high, low, close, volume });
    }

    return result;
  }

  // Create multi-timeframe datasets from raw data
  createMultiTimeframeData(rawCandles, timeframes) {
    const tfs = Array.isArray(timeframes) ? timeframes : [timeframes];
    const out = {};
    for (const tf of tfs) {
      out[tf] = this.aggregateCandles(rawCandles, tf);
    }
    return out;
  }

  /**
   * Load OHLCV data from CSV file
   * Expected format: timestamp,open,high,low,close,volume
   * Supports column names: timestamp, time, date, or datetime
   */
  async loadData(filePath) {
    const candles = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Try different timestamp column names
          const timeValue = row.timestamp || row.time || row.date || row.datetime;
          
          // Parse the timestamp - handle both ISO 8601 and "YYYY-MM-DD HH:MM:SS" formats
          let timestamp;
          if (typeof timeValue === 'string') {
            // Replace space with T for ISO 8601 format conversion
            const isoString = timeValue.includes(' ') ? timeValue.replace(' ', 'T') : timeValue;
            timestamp = new Date(isoString);
          } else {
            timestamp = new Date(timeValue);
          }
          
          // Validate the parsed date
          if (isNaN(timestamp.getTime())) {
            console.warn(`Skipping row with invalid timestamp: ${timeValue}`);
            return; // Skip invalid timestamps
          }
          
          const candle = {
            timestamp: timestamp,
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            volume: parseFloat(row.volume || 0),
          };
          
          // Validate candle data
          if (isNaN(candle.open) || isNaN(candle.high) || isNaN(candle.low) || isNaN(candle.close)) {
            return; // Skip invalid rows
          }
          
          candles.push(candle);
        })
        .on('end', () => {
          console.log(`Loaded ${candles.length} candles from ${filePath}`);
          resolve(candles);
        })
        .on('error', reject);
    });
  }

  /**
   * Sandbox strategy code execution
   */
  createStrategyFunction(code) {
    // Create a sandboxed context
    const sandbox = {
      module: { exports: {} },
      exports: {},
      require: (module) => {
        // Only allow safe modules
        const allowed = ['crypto'];
        if (allowed.includes(module)) {
          return require(module);
        }
        throw new Error(`Module ${module} is not allowed in strategy code`);
      },
      console: {
        log: () => {}, // Suppress console logs in strategy
        error: () => {},
      },
      setTimeout: undefined,
      setInterval: undefined,
      process: undefined,
      Buffer: undefined,
      __dirname: undefined,
      __filename: undefined,
    };

    try {
      // Execute strategy code in sandbox
      vm.createContext(sandbox);
      
      // Wrap the code to handle module.exports properly
      // This wrapping ensures module and exports are available in the context
      const wrappedCode = `
        (function(module, exports, require, console) {
          'use strict';
          ${code}
        })(module, exports, require, console);
      `;
      
      vm.runInContext(wrappedCode, sandbox, { timeout: 1000 });
      
      // Get the exported function from either module.exports or exports
      const strategyFn = sandbox.module.exports || sandbox.exports;
      
      if (typeof strategyFn !== 'function') {
        throw new Error('Strategy must export a function');
      }

      return strategyFn;
    } catch (error) {
      throw new Error(`Strategy code error: ${error.message}`);
    }
  }

  /**
   * Run backtest
   */
  async run(strategyCode, data, params = {}) {
    const strategy = this.createStrategyFunction(strategyCode);
    // Determine if `data` is a mapping of timeframe -> candles (object), or a single array
    const isMapping = data && typeof data === 'object' && !Array.isArray(data);

    // Prepare candlesByTf and choose primary timeline for iteration
    let candlesByTf = {};
    let primarySeries = null;
    if (isMapping) {
      // Data provided per timeframe (already aggregated)
      candlesByTf = data;
      // Pick the highest-resolution timeframe (smallest ms) among provided keys
      const keys = Object.keys(candlesByTf);
      if (keys.length === 0) throw new Error('No timeframe data provided');
      let primaryTf = keys[0];
      let minMs = this.timeframeToMs(primaryTf);
      for (const k of keys) {
        try {
          const ms = this.timeframeToMs(k);
          if (ms < minMs) {
            minMs = ms;
            primaryTf = k;
          }
        } catch (e) {
          // ignore invalid timeframe strings here
        }
      }
      primarySeries = candlesByTf[primaryTf] || [];
    } else {
      // Single raw series provided; build aggregated timeframes from it
      const raw = Array.isArray(data) ? data : [];
      candlesByTf = this.createMultiTimeframeData(raw, this.timeframes);
      // Choose primary as the raw data (highest resolution available)
      primarySeries = raw;
    }

    // Initialize state
    let capital = this.initialCapital;
    let position = null; // { side: 'LONG'|'SHORT', size, entryPrice, entryTime }
    const trades = [];
    const state = {};

    // We'll iterate over the primarySeries and provide aggregated candles up to the current timestamp for each requested timeframe.
    const tfIndices = {};
    for (const tf of Object.keys(candlesByTf)) tfIndices[tf] = 0;

    // Process each candle (primary timeline)
    for (let i = 0; i < primarySeries.length; i++) {
      const candle = primarySeries[i];
      const currentTs = candle.timestamp instanceof Date ? candle.timestamp.getTime() : new Date(candle.timestamp).getTime();

      // For each timeframe, advance index while its candles are <= currentTs
      const ctxCandlesByTf = {};
      for (const tf of Object.keys(candlesByTf)) {
        const arr = candlesByTf[tf] || [];
        let idx = tfIndices[tf] || 0;
        while (idx < arr.length && (arr[idx].timestamp instanceof Date ? arr[idx].timestamp.getTime() : new Date(arr[idx].timestamp).getTime()) <= currentTs) {
          idx++;
        }
        tfIndices[tf] = idx;
        // Provide a shallow copy slice up to idx
        ctxCandlesByTf[tf] = arr.slice(0, idx);
      }

      const ctx = {
        candles: primarySeries.slice(0, i + 1), // Backwards compatibility: primary timeline candles up to now
        index: i,
        params: params,
        state: state,
        candlesByTf: ctxCandlesByTf,
        currentCandle: candle,
      };

      try {
        // Get strategy signal
        const signal = await strategy(ctx);
        
        const { signal: action, size, meta } = signal || { signal: 'HOLD' };

        // Handle position management
        if (action === 'BUY' && !position) {
          // Open long position
          const tradeSize = size || 1.0;
          const entryPrice = candle.close * (1 + this.slippage);
          const cost = entryPrice * tradeSize;
          const commissionCost = cost * this.commission;
          const totalCost = cost + commissionCost;
          
          if (capital >= totalCost) {
            position = {
              side: 'LONG',
              size: tradeSize,
              entryPrice: entryPrice,
              entryTime: candle.timestamp,
              entryIndex: i,
              meta: meta || {},
              totalCost: totalCost,
            };
            capital -= totalCost;
          }
        } else if (action === 'SELL' && position) {
          // Close position
          const exitPrice = candle.close * (1 - this.slippage);
          const revenue = exitPrice * position.size;
          const commissionCost = revenue * this.commission;
          const netRevenue = revenue - commissionCost;
          
          let pnl;
          if (position.side === 'LONG') {
            // For long positions: profit if exit > entry
            pnl = netRevenue - position.totalCost;
          } else {
            // For short positions: profit if entry > exit (inverted logic)
            pnl = position.totalCost - netRevenue;
          }
          const pnlPercent = (pnl / position.totalCost) * 100;
          
          capital += netRevenue;
          
          trades.push({
            entryTime: position.entryTime,
            exitTime: candle.timestamp,
            side: position.side,
            size: position.size,
            entryPrice: position.entryPrice,
            exitPrice: exitPrice,
            pnl: pnl,
            pnlPercent: pnlPercent,
            entryIndex: position.entryIndex,
            exitIndex: i,
            meta: position.meta,
          });
          position = null;
        } else if (action === 'SELL' && !position) {
          // Open short position
          const tradeSize = size || 1.0;
          const entryPrice = candle.close * (1 - this.slippage);
          const cost = entryPrice * tradeSize;
          const commissionCost = cost * this.commission;
          const totalCost = cost + commissionCost;
          
          if (capital >= totalCost) {
            position = {
              side: 'SHORT',
              size: tradeSize,
              entryPrice: entryPrice,
              entryTime: candle.timestamp,
              entryIndex: i,
              meta: meta || {},
              totalCost: totalCost,
            };
            capital -= totalCost;
          }
        }

        // Calculate total equity including unrealized P&L
        let totalEquity = capital;
        if (position) {
          const currentPrice = candle.close;
          let unrealizedPnL;
          if (position.side === 'LONG') {
            unrealizedPnL = (currentPrice - position.entryPrice) * position.size;
          } else {
            // Short position: profit when price goes down
            unrealizedPnL = (position.entryPrice - currentPrice) * position.size;
          }
          totalEquity = capital + unrealizedPnL;
        }

        // Record equity curve at each candle (includes unrealized P&L)
        equityCurve.push({
          timestamp: candle.timestamp,
          equity: totalEquity,
        });
      } catch (error) {
        console.error(`Strategy error at candle ${i}:`, error.message);
        // Continue execution even if strategy throws
      }
    }

    // Close any open position at the end
    if (position && primarySeries.length > 0) {
      const lastCandle = primarySeries[primarySeries.length - 1];
      const exitPrice = lastCandle.close * (1 - this.slippage);
      const revenue = exitPrice * position.size;
      const commissionCost = revenue * this.commission;
      const netRevenue = revenue - commissionCost;
      
      capital += netRevenue;
      
      let pnl;
      if (position.side === 'LONG') {
        // For long positions: profit if exit > entry
        pnl = netRevenue - position.totalCost;
      } else {
        // For short positions: profit if entry > exit (inverted logic)
        pnl = position.totalCost - netRevenue;
      }
      const pnlPercent = (pnl / position.totalCost) * 100;
      
      trades.push({
        entryTime: position.entryTime,
        exitTime: lastCandle.timestamp,
        side: position.side,
        size: position.size,
        entryPrice: position.entryPrice,
        exitPrice: exitPrice,
        pnl: pnl,
        pnlPercent: pnlPercent,
        entryIndex: position.entryIndex,
        exitIndex: primarySeries.length - 1,
        meta: position.meta,
      });
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(trades, [], this.initialCapital);

    return {
      trades,
      metrics,
      finalCapital: capital,
    };
  }

  /**
   * Calculate comprehensive backtest metrics
   */
  calculateMetrics(trades, equityCurve, initialCapital) {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        accuracy: 0,
        netPnL: 0,
        roi: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        expectancy: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        sharpeRatio: 0,
      };
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const wins = winningTrades.length;
    const losses = losingTrades.length;
    const winRate = (wins / trades.length) * 100;
    
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const roi = ((totalPnL / initialCapital) * 100);
    
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
      : 0;
    const averageLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
      : 0;
    
    const expectancy = (winRate / 100) * averageWin - ((100 - winRate) / 100) * averageLoss;
    
    // Calculate max drawdown
    let peak = initialCapital;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    
    for (const point of equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
      }
      const drawdown = peak - point.equity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = (drawdown / peak) * 100;
      }
    }

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Sharpe ratio (simplified - using returns)
    const returns = equityCurve.slice(1).map((point, i) => {
      const prevEquity = equityCurve[i].equity;
      return prevEquity > 0 ? (point.equity - prevEquity) / prevEquity : 0;
    });
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    return {
      totalTrades: trades.length,
      wins,
      losses,
      winRate: parseFloat(winRate.toFixed(2)),
      accuracy: parseFloat(winRate.toFixed(2)), // Same as win rate
      netPnL: parseFloat(totalPnL.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
      expectancy: parseFloat(expectancy.toFixed(2)),
      averageWin: parseFloat(averageWin.toFixed(2)),
      averageLoss: parseFloat(averageLoss.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    };
  }

  /**
   * Export trades to CSV
   */
  async exportTradesToCSV(trades, filePath) {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Convert Date objects to ISO strings for CSV export
    const tradesForCsv = trades.map(trade => ({
      ...trade,
      entryTime: trade.entryTime instanceof Date ? trade.entryTime.toISOString() : trade.entryTime,
      exitTime: trade.exitTime instanceof Date ? trade.exitTime.toISOString() : trade.exitTime,
    }));

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'entryTime', title: 'Entry Time' },
        { id: 'exitTime', title: 'Exit Time' },
        { id: 'side', title: 'Side' },
        { id: 'size', title: 'Size' },
        { id: 'entryPrice', title: 'Entry Price' },
        { id: 'exitPrice', title: 'Exit Price' },
        { id: 'pnl', title: 'P&L' },
        { id: 'pnlPercent', title: 'P&L %' },
      ],
    });

    await csvWriter.writeRecords(tradesForCsv);
    return filePath;
  }
}

module.exports = BacktestEngine;

