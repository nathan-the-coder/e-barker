import express from 'express';
import mongoose from 'mongoose';
import Tricycle from '../models/Tricycle.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all tricycles
router.get('/', verifyToken, async (req, res) => {
  try {
    const tricycles = await Tricycle.find()
      .populate('driverId', 'name username')
      .sort({ bodyNumber: 1 })
      .exec();

    res.json({ tricycles });
  } catch (error) {
    console.error('Get tricycles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available tricycles (not assigned)
router.get('/available', verifyToken, async (req, res) => {
  try {
    const tricycles = await Tricycle.find({ 
      driverId: null, 
      isActive: true 
    })
      .sort({ bodyNumber: 1 })
      .exec();

    res.json({ tricycles });
  } catch (error) {
    console.error('Get available tricycles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single tricycle
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const tricycle = await Tricycle.findById(req.params.id)
      .populate('driverId', 'name email')
      .exec();

    if (!tricycle) {
      return res.status(404).json({ error: 'Tricycle not found' });
    }

    res.json({ tricycle });
  } catch (error) {
    console.error('Get tricycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new tricycle
router.post('/', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { bodyNumber, plateNumber, model, year } = req.body;

    if (!bodyNumber || !plateNumber) {
      return res.status(400).json({ error: 'Body number and plate number required' });
    }

    const tricycle = await Tricycle.create({
      bodyNumber,
      plateNumber,
      model,
      year
    });

    res.status(201).json({ tricycle });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Body number or plate number already exists' });
    }
    console.error('Create tricycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tricycle
router.put('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { bodyNumber, plateNumber, model, year, isActive, driverId } = req.body;

    const tricycle = await Tricycle.findById(req.params.id);
    if (!tricycle) {
      return res.status(404).json({ error: 'Tricycle not found' });
    }

    if (bodyNumber !== undefined) tricycle.bodyNumber = bodyNumber;
    if (plateNumber !== undefined) tricycle.plateNumber = plateNumber;
    if (model !== undefined) tricycle.model = model;
    if (year !== undefined) tricycle.year = year;
    if (isActive !== undefined) tricycle.isActive = isActive;
    if (driverId !== undefined) tricycle.driverId = driverId || null;

    await tricycle.save();

    await tricycle.populate('driverId', 'name username');

    res.json({ tricycle });
  } catch (error) {
    console.error('Update tricycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete tricycle (soft delete)
router.delete('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const tricycle = await Tricycle.findById(req.params.id);
    if (!tricycle) {
      return res.status(404).json({ error: 'Tricycle not found' });
    }

    tricycle.isActive = false;
    await tricycle.save();

    res.json({ message: 'Tricycle deactivated successfully' });
  } catch (error) {
    console.error('Delete tricycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign tricycle to driver
router.post('/:id/assign', verifyToken, requireRole(['admin', 'dispatcher']), async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ error: 'driverId required' });
    }

    // Check if driver exists and is a driver
    const driver = await User.findOne({ 
      _id: driverId, 
      role: 'driver' 
    });

    if (!driver) {
      return res.status(400).json({ error: 'Invalid driver' });
    }

    // Unassign from previous driver
    await Tricycle.updateMany(
      { driverId },
      { $set: { driverId: null } }
    );

    // Assign to new driver
    const tricycle = await Tricycle.findById(req.params.id);
    if (!tricycle) {
      return res.status(404).json({ error: 'Tricycle not found' });
    }

    tricycle.driverId = driverId;
    await tricycle.save();

    res.json({ message: 'Tricycle assigned successfully' });
  } catch (error) {
    console.error('Assign tricycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
