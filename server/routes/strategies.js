const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all strategies for user
router.get('/', authenticate, async (req, res) => {
  try {
    const strategies = await prisma.strategy.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        params: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ strategies });
  } catch (error) {
    console.error('Get strategies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single strategy
router.get('/:id', authenticate, async (req, res) => {
  try {
    const strategy = await prisma.strategy.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        params: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({ strategy });
  } catch (error) {
    console.error('Get strategy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create strategy
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('code').notEmpty().withMessage('Code is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, code, params } = req.body;

      // Validate strategy code structure (basic check)
      if (!code.includes('module.exports') || !code.includes('async function strategy')) {
        return res.status(400).json({ error: 'Invalid strategy code format. Must export async function strategy(ctx)' });
      }

      const strategy = await prisma.strategy.create({
        data: {
          userId: req.userId,
          name,
          description: description || '',
          code,
          params: params || {},
        },
        select: {
          id: true,
          name: true,
          description: true,
          code: true,
          params: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({ strategy });
    } catch (error) {
      console.error('Create strategy error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update strategy
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('code').optional().notEmpty().withMessage('Code cannot be empty'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, code, params } = req.body;

      // Check ownership
      const existingStrategy = await prisma.strategy.findFirst({
        where: {
          id: parseInt(req.params.id),
          userId: req.userId,
        },
      });

      if (!existingStrategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }

      // Build update data
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (code !== undefined) {
        if (!code.includes('module.exports') || !code.includes('async function strategy')) {
          return res.status(400).json({ error: 'Invalid strategy code format' });
        }
        updateData.code = code;
      }
      if (params !== undefined) updateData.params = params;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const strategy = await prisma.strategy.update({
        where: { id: parseInt(req.params.id) },
        data: updateData,
        select: {
          id: true,
          name: true,
          description: true,
          code: true,
          params: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ strategy });
    } catch (error) {
      console.error('Update strategy error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete strategy
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const strategy = await prisma.strategy.deleteMany({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId,
      },
    });

    if (strategy.count === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('Delete strategy error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
