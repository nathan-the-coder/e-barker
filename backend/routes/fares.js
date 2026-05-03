/**
 * Fare Calculation API for PUV Vans in Cagayan Valley
 * Uses LTFRB prescribed rates: P2/km + P15 base fare
 */
import express from 'express';
import Setting from '../models/Setting.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Default fare rates (LTFRB prescribed)
const DEFAULT_FARES = {
  base_fare: 15,
  per_km_rate: 2.00,
  terminal_fee: 10
};

// GET /api/fares - returns all fare settings
router.get('/', verifyToken, async (req, res) => {
  const allSettings = await Setting.find({ category: 'fare' });
  const fares = {};
  allSettings.forEach(s => {
    try {
      fares[s.key] = JSON.parse(s.value);
    } catch {
      fares[s.key] = s.value;
    }
  });
  res.json({ fares });
});

// GET /api/fares/matrix – returns the current fare settings
router.get('/matrix', verifyToken, async (req, res) => {
  const settings = await Setting.find({
    key: { $in: ['base_fare', 'per_km_rate', 'terminal_fee', 'fare_matrix'] }
  });

  const matrix = { ...DEFAULT_FARES };
  const fareMatrixStr = settings.find(s => s.key === 'fare_matrix')?.value;

  settings.forEach(s => {
    const val = parseFloat(s.value);
    if (!isNaN(val)) matrix[s.key] = val;
  });

  // Add route-based fare matrix
  if (fareMatrixStr) {
    try {
      matrix.routes = JSON.parse(fareMatrixStr);
    } catch {
      matrix.routes = {};
    }
  }

  res.json({ matrix });
});

// GET /api/fares/calculate?destination=<name>&passengers=<n>&is_student=<bool>
router.get('/calculate', verifyToken, async (req, res) => {
  const { destination, passengers = 1, is_student = false } = req.query;
  const pax = Math.max(1, parseInt(passengers, 10) || 1);
  const student = is_student === 'true' || is_student === true;

  // Get fare matrix from settings
  const fareMatrixSetting = await Setting.findOne({ key: 'fare_matrix' });
  const baseFareSetting = await Setting.findOne({ key: 'base_fare' });
  const perKmSetting = await Setting.findOne({ key: 'per_km_rate' });

  const baseFare = parseFloat(baseFareSetting?.value) || DEFAULT_FARES.base_fare;
  const perKm = parseFloat(perKmSetting?.value) || DEFAULT_FARES.per_km_rate;

  let fare = null;
  let routeFound = false;

  // Check if destination is in pre-defined fare matrix
  if (fareMatrixSetting?.value) {
    try {
      const routes = JSON.parse(fareMatrixSetting.value);
      const destKey = Object.keys(routes).find(k => 
        k.toLowerCase().includes(destination?.toLowerCase()) ||
        destination?.toLowerCase().includes(k.toLowerCase())
      );

      if (destKey) {
        routeFound = true;
        const routeData = routes[destKey];
        const regularFare = routeData.aircon || routeData.non_aircon || baseFare;
        const studentFare = routeData.student || routeData.student_non || regularFare * 0.8;
        
        fare = {
          destination: destKey,
          regularFare: regularFare,
          studentFare: studentFare,
          farePerPassenger: student ? studentFare : regularFare,
          totalFare: (student ? studentFare : regularFare) * pax,
          type: routeData.aircon ? 'aircon' : 'non-aircon',
          source: 'fare_matrix'
        };
      }
    } catch (e) {
      console.error('Error parsing fare matrix:', e);
    }
  }

  // If not found in matrix, calculate based on distance
  if (!routeFound) {
    if (!destination) {
      return res.status(400).json({ error: 'destination is required' });
    }

    // For now, use base fare calculation
    fare = {
      destination: destination,
      baseFare: baseFare,
      perKmRate: perKm,
      farePerPassenger: baseFare,
      totalFare: baseFare * pax,
      type: 'calculated',
      source: 'formula'
    };
  }

  res.json({ fare });
});

// GET /api/fares/route – proxy to Google Maps Directions API and compute fare
router.get('/route', verifyToken, async (req, res) => {
  const { origin, destination, passengers = 1 } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination are required' });
  }

  // Get API key
  const keySetting = await Setting.findOne({ key: 'google_maps_api_key' });
  const apiKey = keySetting?.value || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  // Call Google Directions API
  const url = `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${encodeURIComponent(origin)}&` +
    `destination=${encodeURIComponent(destination)}&` +
    `departure_time=now&` +
    `traffic_model=bestGuess&` +
    `key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' || !data.routes?.length) {
    return res.status(400).json({ error: 'Could not get route', details: data.status });
  }

  const leg = data.routes[0].legs[0];
  const distanceM = leg.distance.value;
  const distanceKm = distanceM / 1000;
  const durationSec = leg.duration.value;
  const durationInTrafficSec = leg.duration_in_traffic?.value || durationSec;
  const durationMinutes = Math.ceil(durationInTrafficSec / 60);

  // Get fare settings
  const baseFareSetting = await Setting.findOne({ key: 'base_fare' });
  const perKmSetting = await Setting.findOne({ key: 'per_km_rate' });
  const fareMatrixSetting = await Setting.findOne({ key: 'fare_matrix' });

  const baseFare = parseFloat(baseFareSetting?.value) || DEFAULT_FARES.base_fare;
  const perKm = parseFloat(perKmSetting?.value) || DEFAULT_FARES.per_km_rate;
  const pax = Math.max(1, parseInt(passengers, 10) || 1);

  // Calculate fare
  const distanceFare = distanceKm * perKm;
  const farePerPassenger = baseFare + distanceFare;
  const totalFare = farePerPassenger * pax;

  const polyline = data.routes[0].overview_polyline?.points || '';
  const ratio = durationInTrafficSec / durationSec;
  const congestion = ratio <= 1.1 ? 'light' : ratio <= 1.3 ? 'moderate' : 'heavy';

  res.json({
    route: {
      origin: leg.start_address,
      destination: leg.end_address,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      distanceText: leg.distance.text,
      durationText: leg.duration.text,
      durationInTrafficText: leg.duration_in_traffic?.text || leg.duration.text,
      durationMinutes,
      congestion,
      polyline
    },
    fare: {
      passengers: pax,
      baseFare,
      distanceFare: parseFloat(distanceFare.toFixed(2)),
      farePerPassenger: parseFloat(farePerPassenger.toFixed(2)),
      totalFare: parseFloat(totalFare.toFixed(2)),
      breakdown: `₱${baseFare} base + ₱${perKm}/km × ${distanceKm.toFixed(2)}km = ₱${farePerPassenger.toFixed(2)} per passenger`
    }
  });
});

export default router;