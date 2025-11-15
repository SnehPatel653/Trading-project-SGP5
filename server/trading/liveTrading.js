/**
 * Live Trading Manager
 * 
 * Manages live trading sessions with broker integration and WebSocket updates
 */

const { PaperBroker } = require('../brokers/paper');
const { MarketSimulator } = require('./marketSimulator');
const vm = require('vm');

// Active trading sessions
const activeSessions = new Map();

/**
 * Setup live trading session
 */
async function setupLiveTrading(userId, strategyId, symbol, brokerType, strategy) {
  const sessionId = `session_${userId}_${Date.now()}`;

  // Initialize broker
  let broker;
  if (brokerType === 'paper') {
    broker = new PaperBroker(10000); // $10,000 starting capital for paper trading
  } else {
    throw new Error('Live broker adapters not yet implemented. Use paper trading.');
  }

  // Initialize market simulator
  const marketSimulator = new MarketSimulator(symbol, 100); // Start at $100

  // Create strategy function in sandbox
  const sandbox = {
    module: { exports: {} },
    require: (module) => {
      const allowed = ['crypto'];
      if (allowed.includes(module)) {
        return require(module);
      }
      throw new Error(`Module ${module} is not allowed`);
    },
    console: { log: () => {}, error: () => {} },
  };

  vm.createContext(sandbox);
  vm.runInContext(strategy.code, sandbox, { timeout: 1000 });
  const strategyFn = sandbox.module.exports;

  // Store session with all necessary data
  activeSessions.set(sessionId, {
    userId,
    strategyId,
    symbol,
    brokerType,
    broker,
    marketSimulator,
    strategyFn,
    strategyParams: strategy.params || {},
    state: {},
    isRunning: false,
    ws: null,
    trades: [], // Track trades for this session
    candles: [], // Store candle history for strategy
    lastSignal: null,
    createdAt: new Date(),
  });

  return sessionId;
}

/**
 * Start trading session - begins executing strategy on market data
 */
function startTradingSession(sessionId, ws) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Trading session not found');
  }

  if (session.isRunning) {
    return; // Already running
  }

  session.isRunning = true;
  session.ws = ws;

  console.log(`Started live trading session ${sessionId} for ${session.symbol}`);

  // Send initial status
  sendUpdate(ws, {
    type: 'session_started',
    sessionId,
    symbol: session.symbol,
    broker: session.brokerType,
  });

  // Simulate market data and execute strategy at intervals (every second)
  session.tradingInterval = setInterval(async () => {
    try {
      // Generate next candle
      const candle = session.marketSimulator.generateCandle();
      session.candles.push(candle);

      // Update positions with current price (for unrealized P&L)
      const currentPrice = session.marketSimulator.getCurrentPrice();
      session.broker.updatePositionPrice(session.symbol, currentPrice);

      // Prepare context for strategy
      const strategyContext = {
        candles: session.candles,
        index: session.candles.length - 1,
        params: session.strategyParams,
        state: session.state,
      };

      // Execute strategy
      const signal = await session.strategyFn(strategyContext);

      // Process signal
      if (signal && signal.signal) {
        const signalType = signal.signal.toUpperCase();

        if (signalType === 'BUY' && signal.size) {
          // Execute BUY order (open long or close short)
          const order = await session.broker.placeOrder(
            session.symbol,
            'BUY',
            signal.size,
            currentPrice
          );

          if (order.status === 'filled') {
            session.trades.push(order);
            sendUpdate(ws, {
              type: 'trade_executed',
              trade: order,
              accountSummary: await session.broker.getAccountSummary(),
            });
          } else {
            sendUpdate(ws, {
              type: 'order_rejected',
              order,
            });
          }
        } else if (signalType === 'SELL' && signal.size) {
          // Execute SELL order (open short or close long)
          const order = await session.broker.placeOrder(
            session.symbol,
            'SELL',
            signal.size,
            currentPrice
          );

          if (order.status === 'filled') {
            session.trades.push(order);
            sendUpdate(ws, {
              type: 'trade_executed',
              trade: order,
              accountSummary: await session.broker.getAccountSummary(),
            });
          } else {
            sendUpdate(ws, {
              type: 'order_rejected',
              order,
            });
          }
        }
      }

      // Send regular market update
      sendUpdate(ws, {
        type: 'market_update',
        candle,
        currentPrice,
        accountSummary: await session.broker.getAccountSummary(),
      });
    } catch (error) {
      console.error('Strategy execution error:', error);
      sendUpdate(ws, {
        type: 'error',
        message: `Strategy execution error: ${error.message}`,
      });
    }
  }, 1000); // Update every second
}

/**
 * Stop trading session
 */
function stopTradingSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.isRunning = false;
    
    if (session.tradingInterval) {
      clearInterval(session.tradingInterval);
    }

    if (session.ws) {
      sendUpdate(session.ws, {
        type: 'session_stopped',
        sessionId,
        finalSummary: session.broker.getAccountSummary(),
      });
    }
  }
  
  activeSessions.delete(sessionId);
}

/**
 * Get session details
 */
function getSession(sessionId) {
  return activeSessions.get(sessionId);
}

/**
 * Send update through WebSocket
 */
function sendUpdate(ws, data) {
  if (ws && ws.readyState === 1) { // OPEN
    ws.send(JSON.stringify(data));
  }
}

/**
 * Get all active sessions for a user
 */
function getActiveSessions(userId) {
  const userSessions = [];
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      userSessions.push({
        sessionId,
        symbol: session.symbol,
        brokerType: session.brokerType,
        isRunning: session.isRunning,
        tradesCount: session.trades.length,
        createdAt: session.createdAt,
      });
    }
  }
  return userSessions;
}

module.exports = {
  setupLiveTrading,
  startTradingSession,
  stopTradingSession,
  getSession,
  getActiveSessions,
  sendUpdate,
};

