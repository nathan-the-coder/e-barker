import express from 'express';
import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const errorResponse = (res, error) => res.status(400).json({ error });
const notFound = (res, error) => res.status(404).json({ error });

// Get all vehicles
router.get('/', verifyToken, async (req, res) => {
  const vehicles = await Vehicle.find()
    .populate('driverId', 'name username')
    .sort({ bodyNumber: 1 })
    .exec();

  res.json({ vehicles });
});

// Get available vehicles (not assigned)
router.get('/available', verifyToken, async (req, res) => {
  const vehicles = await Vehicle.find({
    driverId: null,
    isActive: true
  })
    .sort({ bodyNumber: 1 })
    .exec();

  res.json({ vehicles });
});

// Get single vehicle
router.get('/:id', verifyToken, async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id)
    .populate('driverId', 'name email')
    .exec();

  if (!vehicle) {
    return notFound(res, 'Vehicle not found');
  }

  res.json({ vehicle });
});

// Create new vehicle
router.post('/', verifyToken, requireRole(['admin']), async (req, res) => {
  const { bodyNumber, plateNumber, model, year, vehicleType, capacity } = req.body;

  if (!bodyNumber || !plateNumber) {
    return errorResponse(res, 'Body number and plate number required');
  }

  const vehicle = await Vehicle.create({
    bodyNumber,
    plateNumber,
    model,
    year,
    vehicleType: vehicleType || 'PUV Van',
    capacity: capacity || 14
  });

  res.status(201).json({ vehicle });
});

// Update vehicle
router.put('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  const { bodyNumber, plateNumber, model, year, isActive, driverId, vehicleType, capacity } = req.body;

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return notFound(res, 'Vehicle not found');
  }

  if (bodyNumber !== undefined) vehicle.bodyNumber = bodyNumber;
  if (plateNumber !== undefined) vehicle.plateNumber = plateNumber;
  if (model !== undefined) vehicle.model = model;
  if (year !== undefined) vehicle.year = year;
  if (isActive !== undefined) vehicle.isActive = isActive;
  if (driverId !== undefined) vehicle.driverId = driverId || null;
  if (vehicleType !== undefined) vehicle.vehicleType = vehicleType;
  if (capacity !== undefined) vehicle.capacity = capacity;

  await vehicle.save();
  await vehicle.populate('driverId', 'name username');

  res.json({ vehicle });
});

// Delete vehicle (soft delete)
router.delete('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return notFound(res, 'Vehicle not found');
  }

  vehicle.isActive = false;
  await vehicle.save();

  res.json({ message: 'Vehicle deactivated successfully' });
});

// Assign vehicle to driver
router.post('/:id/assign', verifyToken, requireRole(['admin', 'dispatcher']), async (req, res) => {
  const { driverId } = req.body;

  if (!driverId) {
    return errorResponse(res, 'driverId required');
  }

  const driver = await User.findOne({
    _id: driverId,
    role: 'driver'
  });

  if (!driver) {
    return errorResponse(res, 'Invalid driver');
  }

  // Unassign from previous driver
  await Vehicle.updateMany(
    { driverId },
    { $set: { driverId: null } }
  );

  // Assign to new driver
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    return notFound(res, 'Vehicle not found');
  }

  vehicle.driverId = driverId;
  await vehicle.save();

  res.json({ message: 'Vehicle assigned successfully' });
});

export default router;