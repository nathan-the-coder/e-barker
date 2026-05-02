import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Tricycle from '../models/Tricycle.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get drivers list (for dropdowns) - MUST be before /:id route
router.get('/drivers/list', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' })
      .select('name username')
      .populate('tricycleId', 'bodyNumber')
      .sort({ name: 1 })
      .exec();

    res.json({ drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('tricycleId', 'bodyNumber plateNumber')
      .sort({ role: 1, name: 1 })
      .exec();

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single user
router.get('/:id', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('tricycleId', 'bodyNumber plateNumber model year')
      .exec();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { username, email, password, name, phone, role } = req.body;

    if (!username || !email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['admin', 'dispatcher', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if exists
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      name,
      phone,
      role
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ user: userObj });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { username, email, name, phone, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (role && ['admin', 'dispatcher', 'driver'].includes(role)) {
      user.role = role;
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.json({ user: userObj });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark user as inactive (soft delete)
router.delete('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Unassign tricycle
    await Tricycle.updateMany(
      { driverId: user._id },
      { $set: { driverId: null } }
    );

    // Set inactive
    user.role = 'inactive';
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
