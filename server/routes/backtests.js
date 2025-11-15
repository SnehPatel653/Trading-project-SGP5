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

/**
 * Convert Date objects in results to ISO strings for JSON serialization
 */
function serializeResults(results) {
  return {
    ...results,
    trades: results.trades.map(trade => ({
      ...trade,
      entryTime: trade.entryTime instanceof Date ? trade.entryTime.toISOString() : trade.entryTime,
      exitTime: trade.exitTime instanceof Date ? trade.exitTime.toISOString() : trade.exitTime,
    })),
  };
}

/**
 * Convert ISO strings in results back to Date objects after retrieval
 */
function deserializeResults(results) {
  if (!results) return results;
  
  return {
    ...results,
    trades: (results.trades || []).map(trade => ({
      ...trade,
      entryTime: new Date(trade.entryTime),
      exitTime: new Date(trade.exitTime),
    })),
  };
}

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

    // Deserialize results
    const deserializedBacktests = backtests.map(b => ({
      ...b,
      results: deserializeResults(b.results),
    }));

    res.json({ backtests: deserializedBacktests });
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

    // Deserialize results
    backtest.results = deserializeResults(backtest.results);

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
  // accept any files (we'll validate CSVs and map them to timeframes)
  upload.any(),
  async (req, res) => {
    try {
      const { strategyId, name, commission, slippage, initialCapital, timeframe, timeframes } = req.body;

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

      // Initialize backtest engine
      // Parse timeframes: support `timeframes` (JSON array or comma-separated) or legacy `timeframe`
      let tfs = [];
      if (timeframes) {
        try {
          tfs = typeof timeframes === 'string' ? JSON.parse(timeframes) : timeframes;
        } catch (e) {
          // Fallback to comma-separated
          tfs = typeof timeframes === 'string' ? timeframes.split(',').map(s => s.trim()) : timeframes;
        }
      } else if (timeframe) {
        tfs = typeof timeframe === 'string' && timeframe.includes(',') ? timeframe.split(',').map(s => s.trim()) : [timeframe];
      }

      const engine = new BacktestEngine({
        commission: parseFloat(commission) || 0.001,
        slippage: parseFloat(slippage) || 0.0005,
        initialCapital: parseFloat(initialCapital) || 10000,
        timeframes: tfs.length > 0 ? tfs : ['1h'],
      });

      // Load data: support single CSV (legacy) or multiple CSVs mapped to timeframes
      let dataParam = null;
      const uploadedFiles = Array.isArray(req.files) ? req.files : [];

      if (uploadedFiles.length > 1) {
        // Expect one file per timeframe
        if (tfs.length === 0) {
          return res.status(400).json({ error: 'When uploading multiple files, please provide `timeframes` to map them.' });
        }
        if (uploadedFiles.length !== tfs.length) {
          return res.status(400).json({ error: `Uploaded ${uploadedFiles.length} files but ${tfs.length} timeframes provided` });
        }

        // Load each file and map to timeframe by order
        const dataByTf = {};
        for (let i = 0; i < tfs.length; i++) {
          const f = uploadedFiles[i];
          const loaded = await engine.loadData(f.path);
          if (!Array.isArray(loaded) || loaded.length === 0) {
            return res.status(400).json({ error: `No valid data found in uploaded file: ${f.originalname}` });
          }
          dataByTf[tfs[i]] = loaded;
        }

        dataParam = dataByTf;
      } else if (uploadedFiles.length === 1) {
        // Single uploaded file
        const f = uploadedFiles[0];
        const loaded = await engine.loadData(f.path);
        if (!Array.isArray(loaded) || loaded.length === 0) {
          return res.status(400).json({ error: `No valid data found in uploaded file: ${f.originalname}` });
        }
        dataParam = loaded;
      } else if (req.body.dataFile) {
        // Existing stored file path (legacy)
        const loaded = await engine.loadData(req.body.dataFile);
        if (!Array.isArray(loaded) || loaded.length === 0) {
          return res.status(400).json({ error: 'No valid data found in CSV file' });
        }
        dataParam = loaded;
      } else {
        return res.status(400).json({ error: 'Data file is required' });
      }

      // Run backtest
      const results = await engine.run(strategy.code, dataParam, strategyParams);

      // Export trades to CSV
      const tradesCsvPath = `uploads/backtest_${Date.now()}_trades.csv`;
      await engine.exportTradesToCSV(results.trades, tradesCsvPath);

      // Read trades CSV as text for storage
      const tradesCsvText = await fsPromises.readFile(tradesCsvPath, 'utf8');

      // Serialize results for storage (convert Dates to ISO strings)
      const serializedResults = serializeResults(results);

      // Save backtest results
      const backtest = await prisma.backtest.create({
        data: {
          userId: req.userId,
          strategyId: parseInt(strategyId),
          name,
          dataFile: (uploadedFiles && uploadedFiles.length > 0)
            ? uploadedFiles.map(f => f.originalname).join(',')
            : (req.body.dataFile || ''),
          params: strategyParams,
          results: serializedResults,
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

      // Deserialize results for response
      backtest.results = deserializeResults(backtest.results);

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
