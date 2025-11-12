const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const BacktestEngine = require('../backtest/engine');

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Get all backtests for user
router.get('/', authenticate, async (req, res) => {
  try {
    const backtests = await prisma.backtest.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        name: true,
        strategyId: true,
        dataFile: true,
        params: true,
        results: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ backtests });
  } catch (error) {
    console.error('Get backtests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single backtest
router.get('/:id', authenticate, async (req, res) => {
  try {
    const backtest = await prisma.backtest.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId,
      },
      select: {
        id: true,
        name: true,
        strategyId: true,
        dataFile: true,
        params: true,
        results: true,
        tradesCsv: true,
        createdAt: true,
      },
    });

    if (!backtest) {
      return res.status(404).json({ error: 'Backtest not found' });
    }

    res.json({ backtest });
  } catch (error) {
    console.error('Get backtest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Run backtest
router.post(
  '/run',
  authenticate,
  upload.single('dataFile'),
  async (req, res) => {
    try {
      const { strategyId, name, commission, slippage, initialCapital, timeframe } = req.body;

      if (!strategyId || !name) {
        return res.status(400).json({ error: 'Strategy ID and name are required' });
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

      const strategyParams = strategy.params || {};

      // Get data file path
      let dataFilePath;
      if (req.file) {
        dataFilePath = req.file.path;
      } else if (req.body.dataFile) {
        // Use existing file path
        dataFilePath = req.body.dataFile;
      } else {
        return res.status(400).json({ error: 'Data file is required' });
      }

      // Initialize backtest engine
      const engine = new BacktestEngine({
        commission: parseFloat(commission) || 0.001,
        slippage: parseFloat(slippage) || 0.0005,
        initialCapital: parseFloat(initialCapital) || 10000,
        timeframe: timeframe || '1h',
      });

      // Load data
      const data = await engine.loadData(dataFilePath);

      if (data.length === 0) {
        return res.status(400).json({ error: 'No valid data found in CSV file' });
      }

      // Run backtest
      const results = await engine.run(strategy.code, data, strategyParams);

      // Export trades to CSV
      const tradesCsvPath = `uploads/backtest_${Date.now()}_trades.csv`;
      await engine.exportTradesToCSV(results.trades, tradesCsvPath);

      // Read trades CSV as text for storage
      const tradesCsvText = await fsPromises.readFile(tradesCsvPath, 'utf8');

      // Save backtest results
      const backtest = await prisma.backtest.create({
        data: {
          userId: req.userId,
          strategyId: parseInt(strategyId),
          name,
          dataFile: req.file ? req.file.originalname : dataFilePath,
          params: strategyParams,
          results: results,
          tradesCsv: tradesCsvText,
        },
        select: {
          id: true,
          name: true,
          strategyId: true,
          dataFile: true,
          params: true,
          results: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        backtest,
        results: results,
      });
    } catch (error) {
      console.error('Backtest error:', error);
      res.status(500).json({ error: `Backtest failed: ${error.message}` });
    }
  }
);

// Download trades CSV
router.get('/:id/trades', authenticate, async (req, res) => {
  try {
    const backtest = await prisma.backtest.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId,
      },
      select: {
        tradesCsv: true,
      },
    });

    if (!backtest || !backtest.tradesCsv) {
      return res.status(404).json({ error: 'Backtest not found' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="backtest_${req.params.id}_trades.csv"`);
    res.send(backtest.tradesCsv);
  } catch (error) {
    console.error('Download trades error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete backtest
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const backtest = await prisma.backtest.deleteMany({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId,
      },
    });

    if (backtest.count === 0) {
      return res.status(404).json({ error: 'Backtest not found' });
    }

    res.json({ message: 'Backtest deleted successfully' });
  } catch (error) {
    console.error('Delete backtest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
