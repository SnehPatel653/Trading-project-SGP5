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
    this.timeframe = options.timeframe || '1h';
  }

  /**
   * Load OHLCV data from CSV file
   * Expected format: timestamp,open,high,low,close,volume
   */
  async loadData(filePath) {
    const candles = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const candle = {
            timestamp: new Date(row.timestamp || row.time || row.date),
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
      vm.runInContext(code, sandbox, { timeout: 1000 });
      
      if (typeof sandbox.module.exports !== 'function') {
        throw new Error('Strategy must export a function');
      }

      return sandbox.module.exports;
    } catch (error) {
      throw new Error(`Strategy code error: ${error.message}`);
    }
  }

  /**
   * Run backtest
   */
  async run(strategyCode, data, params = {}) {
    const strategy = this.createStrategyFunction(strategyCode);
    
    // Initialize state
    let capital = this.initialCapital;
    let position = null; // { side: 'LONG'|'SHORT', size, entryPrice, entryTime }
    const trades = [];
    const equityCurve = [{ timestamp: data[0]?.timestamp, equity: capital }];
    const state = {};

    // Process each candle
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const ctx = {
        candles: data.slice(0, i + 1), // All candles up to current
        index: i,
        params: params,
        state: state,
      };

      try {
        // Get strategy signal
        const signal = await strategy(ctx);
        
        if (!signal || !signal.signal) {
          continue;
        }

        const { signal: action, size, meta } = signal;

        // Handle position management
        if (action === 'BUY' && !position) {
          // Open long position
          const tradeSize = size || 1.0;
          const entryPrice = candle.close * (1 + this.slippage);
          const cost = entryPrice * tradeSize;
          const commissionCost = cost * this.commission;
          
          if (capital >= cost + commissionCost) {
            position = {
              side: 'LONG',
              size: tradeSize,
              entryPrice: entryPrice,
              entryTime: candle.timestamp,
              entryIndex: i,
              meta: meta || {},
            };
            capital -= (cost + commissionCost);
          }
        } else if (action === 'SELL' && position) {
          // Close position
          const exitPrice = candle.close * (1 - this.slippage);
          const revenue = exitPrice * position.size;
          const commissionCost = revenue * this.commission;
          const netRevenue = revenue - commissionCost;
          
          capital += netRevenue;
          
          const pnl = netRevenue - (position.entryPrice * position.size * (1 + this.commission));
          const pnlPercent = (pnl / (position.entryPrice * position.size)) * 100;
          
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
          // Open short position (if supported)
          // For simplicity, we'll skip short positions in this implementation
        }

        // Update equity curve
        let currentEquity = capital;
        if (position) {
          const currentValue = candle.close * position.size;
          const unrealizedPnL = currentValue - (position.entryPrice * position.size);
          currentEquity = capital + unrealizedPnL;
        }
        
        equityCurve.push({
          timestamp: candle.timestamp,
          equity: currentEquity,
        });
      } catch (error) {
        console.error(`Strategy error at candle ${i}:`, error.message);
        // Continue execution even if strategy throws
      }
    }

    // Close any open position at the end
    if (position && data.length > 0) {
      const lastCandle = data[data.length - 1];
      const exitPrice = lastCandle.close * (1 - this.slippage);
      const revenue = exitPrice * position.size;
      const commissionCost = revenue * this.commission;
      const netRevenue = revenue - commissionCost;
      
      capital += netRevenue;
      
      const pnl = netRevenue - (position.entryPrice * position.size * (1 + this.commission));
      const pnlPercent = (pnl / (position.entryPrice * position.size)) * 100;
      
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
        exitIndex: data.length - 1,
        meta: position.meta,
      });
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(trades, equityCurve, this.initialCapital);

    return {
      trades,
      equityCurve,
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

    await csvWriter.writeRecords(trades);
    return filePath;
  }
}

module.exports = BacktestEngine;

