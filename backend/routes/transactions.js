import express from 'express';
import Transaction from '../models/Transaction.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get today's transactions
router.get('/today', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const transactions = await Transaction.find({
    createdAt: { $gte: today }
  })
    .populate('driverId', 'name email')
    .sort({ createdAt: -1 })
    .exec();

  const total = transactions.reduce((sum, t) => sum + t.feeAmount, 0);

  res.json({ transactions, total });
});

// Get transactions with filters
router.get('/', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const { date, start_date, end_date } = req.query;
  const query = {};

  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    query.createdAt = { $gte: startDate, $lt: endDate };
  }

  if (start_date) {
    query.createdAt = query.createdAt || {};
    query.createdAt.$gte = new Date(start_date);
  }

  if (end_date) {
    query.createdAt = query.createdAt || {};
    query.createdAt.$lte = new Date(end_date);
  }

  const transactions = await Transaction.find(query)
    .populate('driverId', 'name email')
    .sort({ createdAt: -1 })
    .exec();

  res.json({ transactions });
});

// Get by date range (helper for reports)
router.get('/range', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: 'start and end dates required' });
  }

  const transactions = await Transaction.find({
    createdAt: {
      $gte: new Date(start),
      $lte: new Date(end)
    }
  })
    .populate('driverId', 'name')
    .sort({ createdAt: 1 })
    .exec();

  res.json({ transactions });
});

export default router;