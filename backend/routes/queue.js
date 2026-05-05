import express from 'express';
import mongoose from 'mongoose';
import { Result, ok, err, okAsync, Err } from 'neverthrow';
import User from '../models/User.js';
import Queue from '../models/Queue.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js';
import Vehicle from '../models/Vehicle.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to create error responses
const errorResponse = (res, error) => res.status(400).json({ error });
const notFound = (res, error) => res.status(404).json({ error });
const serverError = (res, error) => res.status(500).json({ error });

// Get active queue (FIFO - waiting status, ordered by checkInTime)
router.get('/active', verifyToken, async (req, res) => {
  const queue = await Queue.find({ status: 'Waiting' })
    .populate('driverId', 'name email')
    .populate('vehicleId', 'bodyNumber vehicleType')
    .sort({ checkInTime: 1 })
    .exec();

  res.json({ queue });
});

// Get recently dispatched (on-trip, last 5)
router.get('/recent', verifyToken, async (req, res) => {
  const queue = await Queue.find({ status: 'On-trip' })
    .populate('driverId', 'name email')
    .populate('vehicleId', 'bodyNumber vehicleType')
    .sort({ dispatchTime: -1 })
    .limit(5)
    .exec();

  res.json({ queue });
});

// Get driver's current queue status
router.get('/my-status', verifyToken, async (req, res) => {
  const { driver_id } = req.query;

  if (!driver_id || driver_id === 'undefined' || !mongoose.Types.ObjectId.isValid(driver_id)) {
    return errorResponse(res, 'Valid driver_id is required');
  }

  const status = await Queue.findOne({
    driverId: driver_id,
    status: { $in: ['Waiting', 'On-trip'] }
  })
    .populate('vehicleId', 'bodyNumber vehicleType')
    .sort({ checkInTime: -1 })
    .exec();

  res.json({ status });
});

// Join queue (driver check-in)
router.post('/join', verifyToken, requireRole(['driver']), async (req, res) => {
  const { driver_id, vehicle_id, current_location, destination } = req.body;

  if (!driver_id || driver_id === 'undefined' || !mongoose.Types.ObjectId.isValid(driver_id)) {
    return errorResponse(res, 'Valid driver_id is required');
  }

  // Check for duplicate
  const existing = await Queue.findOne({
    driverId: driver_id,
    status: { $in: ['Waiting', 'On-trip'] }
  });

  if (existing) {
    return errorResponse(res, 'Driver already in queue');
  }

  // Get driver's assigned vehicle if not provided
  let finalVehicleId = vehicle_id;
  if (!finalVehicleId) {
    const driver = await User.findById(driver_id).select('vehicleId');
    finalVehicleId = driver?.vehicleId;

    if (!finalVehicleId) {
      const vehicle = await Vehicle.findOne({ driverId: driver_id }).select('_id');
      finalVehicleId = vehicle?._id || null;
    }
  }

  const entry = await Queue.create({
    driverId: driver_id,
    vehicleId: finalVehicleId,
    currentLocation: current_location,
    destination,
    status: 'Waiting'
  });

  await entry.populate('driverId', 'name');
  await entry.populate('vehicleId', 'bodyNumber vehicleType');

  // Calculate queue position
  const position = await Queue.countDocuments({
    status: 'Waiting',
    checkInTime: { $lte: entry.checkInTime }
  });

  res.status(201).json({
    entry,
    position,
    message: `Successfully joined queue at position ${position}`
  });
});

// Dispatch driver (change status to on-trip)
router.post('/dispatch/:id', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { estimated_time_minutes, dispatcher_id, route_origin, route_destination, route_polyline, distance_km } = req.body;

  const entry = await Queue.findById(id);
  if (!entry) {
    return notFound(res, 'Queue entry not found');
  }
  if (entry.status !== 'Waiting') {
    return errorResponse(res, 'Queue entry is not in Waiting status');
  }

  const finalDispatcherId = dispatcher_id || req.user?.userId;

  // Update queue status with route data
  const updateData = {
    status: 'On-trip',
    dispatchTime: new Date(),
    estimatedArrivalTime: estimated_time_minutes || null,
    dispatcherId: finalDispatcherId
  };

  if (route_origin) updateData.routeOrigin = route_origin;
  if (route_destination) updateData.routeDestination = route_destination;
  if (route_polyline) updateData.routePolyline = route_polyline;
  if (distance_km) updateData.distanceKm = distance_km;

  const updated = await Queue.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  ).populate('driverId', 'name').populate('vehicleId', 'bodyNumber vehicleType');

  // Log transaction (fee)
  const feeSetting = await Setting.findOne({ key: 'terminal_fee' });
  const feeAmount = feeSetting ? parseFloat(feeSetting.value) : 10.00;

  await Transaction.create({
    driverId: updated.driverId,
    queueId: updated._id,
    dispatcherId: dispatcher_id,
    feeAmount: feeAmount,
    feeType: 'terminal_fee'
  });

  res.json({ entry: updated });
});

// Complete trip
router.post('/complete/:id', verifyToken, requireRole(['driver']), async (req, res) => {
  const { id } = req.params;

  const entry = await Queue.findById(id);

  if (!entry) {
    return notFound(res, 'Queue entry not found');
  }

  if (entry.status !== 'On-trip' && entry.status !== 'Confirmed') {
    return errorResponse(res, 'Queue entry is not On-trip');
  }

  // Calculate fare based on distance
  let calculatedFare = 0;
  const baseFareSetting = await Setting.findOne({ key: 'base_fare' });
  const perKmSetting = await Setting.findOne({ key: 'per_km_rate' });
  
  const baseFare = parseFloat(baseFareSetting?.value) || 100;
  const perKm = parseFloat(perKmSetting?.value) || 2.0;
  
  if (entry.distanceKm && entry.distanceKm > 0) {
    calculatedFare = baseFare + (entry.distanceKm * perKm);
    entry.calculatedFare = parseFloat(calculatedFare.toFixed(2));
  }

  // Mark as completed
  entry.status = 'Completed';
  entry.completedTime = new Date();
  await entry.save();

  // Create transaction with fare amount
  await Transaction.create({
    driverId: entry.driverId,
    queueId: entry._id,
    dispatcherId: entry.dispatcherId,
    feeAmount: calculatedFare,
    feeType: 'trip_fare',
    routeOrigin: entry.routeOrigin,
    routeDestination: entry.routeDestination,
    distanceKm: entry.distanceKm,
    baseFare: baseFare,
    passengerFare: calculatedFare
  });

  // Automatically add new waiting entry (re-enter queue)
  await Queue.create({
    driverId: entry.driverId,
    vehicleId: entry.vehicleId,
    status: 'Waiting'
  });

  res.json({ 
    message: 'Trip completed successfully',
    calculatedFare: calculatedFare,
    distanceKm: entry.distanceKm
  });
});

// Confirm trip (driver confirms after dispatch)
router.post('/confirm/:id', verifyToken, requireRole(['driver']), async (req, res) => {
  const { id } = req.params;

  const entry = await Queue.findById(id);

  if (!entry) {
    return notFound(res, 'Queue entry not found');
  }

  if (entry.status !== 'On-trip') {
    return errorResponse(res, 'Queue entry must be On-trip to confirm');
  }

  // Mark as Confirmed - driver acknowledged the dispatch
  entry.status = 'Confirmed';
  entry.confirmedTime = new Date();
  await entry.save();

  await entry.populate('driverId', 'name');
  await entry.populate('vehicleId', 'bodyNumber vehicleType');

  res.json({ entry, message: 'Trip confirmed successfully' });
});

// Update driver location during trip
router.post('/location/:id', verifyToken, requireRole(['driver']), async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return errorResponse(res, 'lat and lng coordinates required');
  }

  const entry = await Queue.findById(id);

  if (!entry) {
    return notFound(res, 'Queue entry not found');
  }

  if (entry.status !== 'On-trip' && entry.status !== 'Confirmed') {
    return errorResponse(res, 'Queue entry must be On-trip or Confirmed');
  }

  // Update current location
  entry.currentLat = parseFloat(lat);
  entry.currentLng = parseFloat(lng);
  entry.lastLocationUpdate = new Date();

  // Push to location history
  if (!entry.locationHistory) {
    entry.locationHistory = [];
  }
  entry.locationHistory.push({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    timestamp: new Date()
  });

  // Keep only last 500 location points to prevent document bloat
  if (entry.locationHistory.length > 500) {
    entry.locationHistory = entry.locationHistory.slice(-500);
  }

  await entry.save();

  res.json({
    message: 'Location updated',
    location: {
      lat: entry.currentLat,
      lng: entry.currentLng,
      updatedAt: entry.lastLocationUpdate
    }
  });
});

// Get on-trip vehicles with location (for tracking)
router.get('/tracking', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const vehicles = await Queue.find({
    status: { $in: ['On-trip', 'Confirmed'] }
  })
    .populate('driverId', 'name')
    .populate('vehicleId', 'bodyNumber vehicleType')
    .sort({ dispatchTime: -1 })
    .exec();

  res.json({ vehicles });
});

// Register new trip (skip queue - dispatcher only)
router.post('/register-trip', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const { driver_id, vehicle_id, estimated_time_minutes } = req.body;

  if (!driver_id || !mongoose.Types.ObjectId.isValid(driver_id)) {
    return errorResponse(res, 'Valid driver_id is required');
  }

  // Check if driver already has active trip
  const existing = await Queue.findOne({
    driverId: driver_id,
    status: { $in: ['Waiting', 'On-trip'] }
  });

  if (existing) {
    return errorResponse(res, 'Driver already has active queue entry');
  }

  // Get driver's assigned vehicle if not provided
  let finalVehicleId = vehicle_id;
  if (!finalVehicleId) {
    const driver = await User.findById(driver_id).select('vehicleId');
    finalVehicleId = driver?.vehicleId;

    if (!finalVehicleId) {
      const vehicle = await Vehicle.findOne({ driverId: driver_id }).select('_id');
      finalVehicleId = vehicle?._id || null;
    }
  }

  // Create entry and immediately dispatch (skip queue)
  const entry = await Queue.create({
    driverId: driver_id,
    vehicleId: finalVehicleId,
    status: 'On-trip',
    dispatchTime: new Date(),
    estimatedArrivalTime: estimated_time_minutes || null,
    dispatcherId: req.user.userId
  });

  await entry.populate('driverId', 'name');
  await entry.populate('vehicleId', 'bodyNumber vehicleType');

  // Log transaction (fee)
  const feeSetting = await Setting.findOne({ key: 'terminal_fee' });
  const feeAmount = feeSetting ? parseFloat(feeSetting.value) : 10.00;

  await Transaction.create({
    driverId: entry.driverId,
    queueId: entry._id,
    dispatcherId: req.user.userId,
    feeAmount: feeAmount,
    feeType: 'terminal_fee'
  });

  res.status(201).json({
    entry,
    message: 'Trip registered successfully (skipped queue)'
  });
});

// Get queue history with filters
router.get('/history', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const { date, driver_id, status } = req.query;
  const query = {};

  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    query.createdAt = { $gte: startDate, $lt: endDate };
  }

  if (driver_id && driver_id !== 'undefined' && mongoose.Types.ObjectId.isValid(driver_id)) {
    query.driverId = driver_id;
  }
  if (status) query.status = status;

  const history = await Queue.find(query)
    .populate('driverId', 'name')
    .populate('vehicleId', 'bodyNumber vehicleType')
    .sort({ checkInTime: -1 })
    .limit(100)
    .exec();

  res.json({ history });
});

// Get queue statistics
router.get('/stats', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const { start_date, end_date } = req.query;
  const query = {};

  if (start_date && end_date) {
    query.createdAt = {
      $gte: new Date(start_date),
      $lte: new Date(end_date)
    };
  } else if (start_date) {
    query.createdAt = { $gte: new Date(start_date) };
  }

  const stats = await Queue.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total_trips: { $sum: 1 },
        completed_trips: {
          $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
        },
        waiting_count: {
          $sum: { $cond: [{ $eq: ['$status', 'Waiting'] }, 1, 0] }
        },
        on_trip_count: {
          $sum: { $cond: [{ $eq: ['$status', 'On-trip'] }, 1, 0] }
        },
        avg_trip_duration: { $avg: { $subtract: ['$completedTime', '$checkInTime'] } }
      }
    }
  ]);

  res.json({ stats: stats[0] || {
    total_trips: 0,
    completed_trips: 0,
    waiting_count: 0,
    on_trip_count: 0,
    avg_trip_duration: 0
  }});
});

// Get traffic data (Google Maps integration)
router.get('/traffic', verifyToken, requireRole(['dispatcher', 'admin']), async (req, res) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return errorResponse(res, 'origin and destination required');
  }

  // Get API key from settings
  const setting = await Setting.findOne({ key: 'google_maps_api_key' });
  const apiKey = setting ? setting.value : process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return serverError(res, 'Google Maps API key not configured');
  }

  // Call Google Maps Distance Matrix API
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    `origins=${encodeURIComponent(origin)}&` +
    `destinations=${encodeURIComponent(destination)}&` +
    `departure_time=now&` +
    `traffic_model=bestGuess&` +
    `key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.rows.length > 0) {
    const element = data.rows[0].elements[0];

    if (element.status === 'OK') {
      const trafficData = {
        origin,
        destination,
        distance: element.distance.text,
        duration: element.duration.text,
        duration_in_traffic: element.duration_in_traffic?.text || element.duration.text,
        congestion_level: getCongestionLevel(element.duration.value, element.duration_in_traffic?.value)
      };

      return res.json({ traffic: trafficData });
    }
    return errorResponse(res, 'Could not calculate route');
  }
  return errorResponse(res, 'Traffic API error');
});

// Helper function to determine congestion level
function getCongestionLevel(normalDuration, trafficDuration) {
  if (!trafficDuration) return 'unknown';
  const ratio = trafficDuration / normalDuration;
  if (ratio <= 1.1) return 'light';
  if (ratio <= 1.3) return 'moderate';
  return 'heavy';
}

// Get driver's completed trips with earnings
router.get('/my-trips', verifyToken, requireRole(['driver']), async (req, res) => {
  const { driver_id } = req.query;
  const { start, end } = req.query;

  if (!driver_id || !mongoose.Types.ObjectId.isValid(driver_id)) {
    return errorResponse(res, 'Valid driver_id is required');
  }

  const query = {
    driverId: driver_id,
    status: 'Completed'
  };

  // Date filter
  if (start || end) {
    query.completedTime = {};
    if (start) query.completedTime.$gte = new Date(start);
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      query.completedTime.$lte = endDate;
    }
  }

  const trips = await Queue.find(query)
    .populate('vehicleId', 'bodyNumber vehicleType')
    .sort({ completedTime: -1 })
    .limit(50)
    .exec();

  // Get earnings from transactions
  const transactions = await Transaction.find({
    driverId: driver_id,
    feeType: 'trip_fare'
  }).sort({ createdAt: -1 }).limit(50);

  // Map transactions to trips
  const tripEarnings = {};
  transactions.forEach(t => {
    if (t.queueId) {
      tripEarnings[t.queueId.toString()] = t.feeAmount;
    }
  });

  // Calculate totals
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  let todayEarnings = 0;
  let weekEarnings = 0;

  const tripsWithEarnings = trips.map(trip => {
    const earnings = tripEarnings[trip._id.toString()] || trip.calculatedFare || 0;
    
    if (trip.completedTime && new Date(trip.completedTime) >= today) {
      todayEarnings += earnings;
    }
    if (trip.completedTime && new Date(trip.completedTime) >= weekAgo) {
      weekEarnings += earnings;
    }

    return {
      _id: trip._id,
      completedTime: trip.completedTime,
      routeOrigin: trip.routeOrigin,
      routeDestination: trip.routeDestination,
      distanceKm: trip.distanceKm,
      calculatedFare: earnings,
      vehicleId: trip.vehicleId
    };
  });

  res.json({
    trips: tripsWithEarnings,
    summary: {
      todayEarnings: parseFloat(todayEarnings.toFixed(2)),
      weekEarnings: parseFloat(weekEarnings.toFixed(2)),
      totalTrips: trips.length
    }
  });
});

// Get driver's current/recent trip route for map display
router.get('/my-route', verifyToken, requireRole(['driver']), async (req, res) => {
  const { driver_id } = req.query;

  if (!driver_id || !mongoose.Types.ObjectId.isValid(driver_id)) {
    return errorResponse(res, 'Valid driver_id is required');
  }

  // Get active trip first, then most recent completed
  const activeTrip = await Queue.findOne({
    driverId: driver_id,
    status: { $in: ['On-trip', 'Confirmed'] }
  }).populate('vehicleId', 'bodyNumber vehicleType');

  if (activeTrip) {
    return res.json({
      active: true,
      trip: {
        _id: activeTrip._id,
        status: activeTrip.status,
        routeOrigin: activeTrip.routeOrigin,
        routeDestination: activeTrip.routeDestination,
        routePolyline: activeTrip.routePolyline,
        distanceKm: activeTrip.distanceKm,
        currentLat: activeTrip.currentLat,
        currentLng: activeTrip.currentLng,
        locationHistory: activeTrip.locationHistory || [],
        lastLocationUpdate: activeTrip.lastLocationUpdate,
        vehicleId: activeTrip.vehicleId
      }
    });
  }

  // No active trip - get most recent completed trip for route replay
  const recentTrip = await Queue.findOne({
    driverId: driver_id,
    status: 'Completed',
    locationHistory: { $exists: true, $ne: [] }
  })
    .sort({ completedTime: -1 })
    .populate('vehicleId', 'bodyNumber vehicleType');

  if (recentTrip) {
    return res.json({
      active: false,
      trip: {
        _id: recentTrip._id,
        status: recentTrip.status,
        routeOrigin: recentTrip.routeOrigin,
        routeDestination: recentTrip.routeDestination,
        routePolyline: recentTrip.routePolyline,
        distanceKm: recentTrip.distanceKm,
        completedTime: recentTrip.completedTime,
        calculatedFare: recentTrip.calculatedFare,
        locationHistory: recentTrip.locationHistory || [],
        vehicleId: recentTrip.vehicleId
      }
    });
  }

  res.json({ active: false, trip: null });
});

export default router;