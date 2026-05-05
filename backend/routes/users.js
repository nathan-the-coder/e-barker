import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Result, ok, err } from 'neverthrow';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Error helpers
const errorResponse = (res, error) => res.status(400).json({ error });
const notFound = (res, error) => res.status(404).json({ error });
const serverError = (res, error) => res.status(500).json({ error });

// Get drivers list (for dropdowns)
router.get('/drivers/list', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const drivers = await User.find({ role: 'driver' })
    .select('name username')
    .populate('vehicleId', 'bodyNumber')
    .sort({ name: 1 })
    .exec();

  res.json({ drivers });
});

// Get all users
router.get('/', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const users = await User.find()
    .select('-password')
    .populate('vehicleId', 'bodyNumber plateNumber')
    .sort({ role: 1, name: 1 })
    .exec();

  res.json({ users });
});

// Get single user
router.get('/:id', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('vehicleId', 'bodyNumber plateNumber model year')
    .exec();

  if (!user) {
    return notFound(res, 'User not found');
  }

  res.json({ user });
});

// Create new user (admin only)
router.post('/', verifyToken, requireRole(['admin']), async (req, res) => {
  const { username, email, password, name, phone, role } = req.body;

  if (!username || !email || !password || !name || !role) {
    return errorResponse(res, 'Missing required fields');
  }

  if (!['admin', 'dispatcher', 'driver'].includes(role)) {
    return errorResponse(res, 'Invalid role');
  }

  // Check if exists
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return errorResponse(res, 'Username or email already exists');
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
});

// Update user (admin only)
router.put('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  const { username, email, name, phone, role, vehicleId } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return notFound(res, 'User not found');
  }

  if (username) user.username = username;
  if (email) user.email = email;
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role && ['admin', 'dispatcher', 'driver'].includes(role)) {
    user.role = role;
  }

  // Handle vehicle assignment
  if (vehicleId !== undefined) {
    // If setting a vehicle, first clear any existing assignment
    if (vehicleId && user.vehicleId && user.vehicleId.toString() !== vehicleId) {
      await Vehicle.findByIdAndUpdate(user.vehicleId, { driverId: null });
    }
    
    user.vehicleId = vehicleId || null;
    
    // If assigning a vehicle, also update the vehicle's driverId
    if (vehicleId) {
      await Vehicle.findByIdAndUpdate(vehicleId, { driverId: user._id });
    }
  }

  await user.save();
  await user.populate('vehicleId', 'bodyNumber plateNumber');

  const userObj = user.toObject();
  delete userObj.password;

  res.json({ user: userObj });
});

// Mark user as inactive (soft delete)
router.delete('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return notFound(res, 'User not found');
  }

  // Unassign vehicle
  await Vehicle.updateMany(
    { driverId: user._id },
    { $set: { driverId: null } }
  );

  // Set inactive
  user.role = 'inactive';
  await user.save();

  res.json({ message: 'User deactivated successfully' });
});

export default router;