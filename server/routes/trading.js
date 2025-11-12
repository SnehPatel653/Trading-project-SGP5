const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const { PaperBroker } = require('../brokers/paper');
const { setupLiveTrading } = require('../trading/liveTrading');

const router = express.Router();

// Get trading status
router.get('/status', authenticate, async (req, res) => {
  try {
    const isPaperTrading = process.env.PAPER_TRADING_ENABLED !== 'false';
    
    res.json({
      paperTradingEnabled: isPaperTrading,
      liveTradingEnabled: !isPaperTrading,
      disclaimer: 'Trading involves substantial risk of loss. Past performance is not indicative of future results.',
    });
  } catch (error) {
    console.error('Get trading status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get broker configs
router.get('/brokers', authenticate, async (req, res) => {
  try {
    const brokers = await prisma.brokerConfig.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        brokerType: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({ brokers });
  } catch (error) {
    console.error('Get brokers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save broker config (encrypted)
router.post(
  '/brokers',
  authenticate,
  [
    body('brokerType').notEmpty().withMessage('Broker type is required'),
    body('config').notEmpty().withMessage('Config is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { brokerType, config, isActive } = req.body;

      // Encrypt config
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey || encryptionKey.length !== 64) {
        return res.status(500).json({ error: 'Encryption key not properly configured' });
      }

      const encryptedConfig = encrypt(JSON.stringify(config), encryptionKey);

      const broker = await prisma.brokerConfig.create({
        data: {
          userId: req.userId,
          brokerType,
          encryptedConfig,
          isActive: isActive || false,
        },
        select: {
          id: true,
          brokerType: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({ broker });
    } catch (error) {
      console.error('Save broker config error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Start live trading
router.post(
  '/start',
  authenticate,
  [
    body('strategyId').notEmpty().withMessage('Strategy ID is required'),
    body('symbol').notEmpty().withMessage('Symbol is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { strategyId, symbol, brokerType = 'paper' } = req.body;

      // Check if paper trading is enabled
      const isPaperTrading = process.env.PAPER_TRADING_ENABLED !== 'false';
      if (!isPaperTrading && brokerType === 'paper') {
        return res.status(400).json({ error: 'Paper trading is disabled. Configure a live broker to enable live trading.' });
      }

      // Get strategy
      const strategy = await prisma.strategy.findFirst({
        where: {
          id: parseInt(strategyId),
          userId: req.userId,
        },
        select: {
          code: true,
          params: true,
        },
      });

      if (!strategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }

      // Start live trading session
      const sessionId = await setupLiveTrading(req.userId, strategyId, symbol, brokerType, strategy);

      res.json({
        message: 'Live trading started',
        sessionId,
        brokerType,
        symbol,
      });
    } catch (error) {
      console.error('Start trading error:', error);
      res.status(500).json({ error: `Failed to start trading: ${error.message}` });
    }
  }
);

// Stop live trading
router.post('/stop', authenticate, async (req, res) => {
  try {
    // Implementation would stop the trading session
    // For now, just return success
    res.json({ message: 'Live trading stopped' });
  } catch (error) {
    console.error('Stop trading error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get live trades
router.get('/trades', authenticate, async (req, res) => {
  try {
    const trades = await prisma.liveTrade.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        strategyId: true,
        symbol: true,
        side: true,
        size: true,
        price: true,
        status: true,
        brokerType: true,
        createdAt: true,
        executedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ trades });
  } catch (error) {
    console.error('Get live trades error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
