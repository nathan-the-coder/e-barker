/**
 * Fare Calculation API
 */
import express from 'express';
import Setting from '../models/Setting.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/fares/matrix – returns the current fare settings
router.get('/matrix', verifyToken, async (req, res) => {
  const settings = await Setting.find({
    key: { $in: ['base_fare', 'per_km_rate', 'terminal_fee'] }
  });

  const matrix = {
    base_fare: 15,
    per_km_rate: 5,
    terminal_fee: 10
  };

  settings.forEach(s => {
    matrix[s.key] = parseFloat(s.value);
  });

  res.json({ matrix });
});

// GET /api/fares/calculate?distance_km=<n>&passengers=<n>
router.get('/calculate', verifyToken, async (req, res) => {
  const { distance_km, passengers = 1 } = req.query;

  if (!distance_km || isNaN(parseFloat(distance_km))) {
    return res.status(400).json({ error: 'distance_km is required and must be a number' });
  }

  const distKm = parseFloat(distance_km);
  const pax = Math.max(1, parseInt(passengers, 10) || 1);

  const settings = await Setting.find({
    key: { $in: ['base_fare', 'per_km_rate', 'terminal_fee'] }
  });

  const matrix = {
    base_fare: 15,
    per_km_rate: 5,
    terminal_fee: 10
  };

  settings.forEach(s => {
    matrix[s.key] = parseFloat(s.value);
  });

  const baseFare = matrix.base_fare;
  const distanceFare = distKm * matrix.per_km_rate;
  const passengerFare = baseFare + distanceFare;
  const totalFare = passengerFare * pax;

  res.json({
    fare: {
      distanceKm: distKm,
      passengers: pax,
      baseFare,
      distanceFare: parseFloat(distanceFare.toFixed(2)),
      farePerPassenger: parseFloat(passengerFare.toFixed(2)),
      totalFare: parseFloat(totalFare.toFixed(2)),
      terminalFee: matrix.terminal_fee,
      breakdown: `₱${baseFare} base + ₱${matrix.per_km_rate}/km × ${distKm.toFixed(2)}km = ₱${passengerFare.toFixed(2)} per passenger`
    }
  });
});

// GET /api/fares/route – proxy to Google Maps Directions API and compute fare
router.get('/route', verifyToken, async (req, res) => {
  const { origin, destination, passengers = 1 } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination are required' });
  }

  const keySetting = await Setting.findOne({ key: 'google_maps_api_key' });
  const apiKey = keySetting ? keySetting.value : process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${encodeURIComponent(origin)}&` +
    `destination=${encodeURIComponent(destination)}&` +
    `departure_time=now&` +
    `traffic_model=bestGuess&` +
    `key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' || !data.routes.length) {
    return res.status(400).json({ error: 'Could not get route', details: data.status });
  }

  const leg = data.routes[0].legs[0];
  const distanceM = leg.distance.value;
  const distanceKm = distanceM / 1000;
  const durationSec = leg.duration.value;
  const durationInTrafficSec = leg.duration_in_traffic?.value || durationSec;
  const durationMinutes = Math.ceil(durationInTrafficSec / 60);

  const settings = await Setting.find({
    key: { $in: ['base_fare', 'per_km_rate', 'terminal_fee'] }
  });
  const matrix = { base_fare: 15, per_km_rate: 5, terminal_fee: 10 };
  settings.forEach(s => { matrix[s.key] = parseFloat(s.value); });

  const pax = Math.max(1, parseInt(passengers, 10) || 1);
  const baseFare = matrix.base_fare;
  const distanceFare = distanceKm * matrix.per_km_rate;
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
      terminalFee: matrix.terminal_fee,
      breakdown: `₱${baseFare} base + ₱${matrix.per_km_rate}/km × ${distanceKm.toFixed(2)}km = ₱${farePerPassenger.toFixed(2)} per passenger`
    }
  });
});

export default router;