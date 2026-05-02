import express from 'express';
import Setting from '../models/Setting.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const settings = await Setting.find().exec();
    const result = {};
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    res.json({ settings: result });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update setting (upsert, allows empty string for optional keys like api keys)
router.put('/:key', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value required' });
    }

    await Setting.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, value: String(value) },
      { upsert: true, new: true, runValidators: false }
    );

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
