/**
 * Fare Calculation API for PUV Vans in Cagayan Valley
 * Uses LTFRB prescribed rates: P2/km + P15 base fare
 */
import express from "express";
import Setting from "../models/Setting.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Default fare rates (LTFRB prescribed)
const DEFAULT_FARES = {
  base_fare: 100,
  per_km_rate: 2.0,
  terminal_fee: 100,
};

// GET /api/fares - returns all fare settings
router.get("/", verifyToken, async (req, res) => {
  const allSettings = await Setting.find({ category: "fare" });
  const fares = {};
  allSettings.forEach((s) => {
    try {
      fares[s.key] = JSON.parse(s.value);
    } catch {
      fares[s.key] = s.value;
    }
  });
  res.json({ fares });
});

// GET /api/fares/matrix – returns the current fare settings
router.get("/matrix", verifyToken, async (req, res) => {
  const settings = await Setting.find({
    key: { $in: ["base_fare", "per_km_rate", "terminal_fee", "fare_matrix"] },
  });

  const matrix = { ...DEFAULT_FARES };
  const fareMatrixStr = settings.find((s) => s.key === "fare_matrix")?.value;

  settings.forEach((s) => {
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
router.get("/calculate", verifyToken, async (req, res) => {
  const { destination, passengers = 1, is_student = false } = req.query;
  const pax = Math.max(1, parseInt(passengers, 10) || 1);
  const student = is_student === "true" || is_student === true;

  // Get fare matrix from settings
  const fareMatrixSetting = await Setting.findOne({ key: "fare_matrix" });
  const baseFareSetting = await Setting.findOne({ key: "base_fare" });
  const perKmSetting = await Setting.findOne({ key: "per_km_rate" });

  const baseFare = parseFloat(baseFareSetting?.value) || DEFAULT_FARES.base_fare;
  const perKm = parseFloat(perKmSetting?.value) || DEFAULT_FARES.per_km_rate;

  let fare = null;
  let routeFound = false;

  // Check if destination is in pre-defined fare matrix
  if (fareMatrixSetting?.value) {
    try {
      const routes = JSON.parse(fareMatrixSetting.value);
      const destKey = Object.keys(routes).find(
        (k) =>
          k.toLowerCase().includes(destination?.toLowerCase()) ||
          destination?.toLowerCase().includes(k.toLowerCase()),
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
          type: routeData.aircon ? "aircon" : "non-aircon",
          source: "fare_matrix",
        };
      }
    } catch (e) {
      console.error("Error parsing fare matrix:", e);
    }
  }

  // If not found in matrix, calculate based on distance
  if (!routeFound) {
    if (!destination) {
      return res.status(400).json({ error: "destination is required" });
    }

    // For now, use base fare calculation
    fare = {
      destination: destination,
      baseFare: baseFare,
      perKmRate: perKm,
      farePerPassenger: baseFare,
      totalFare: baseFare * pax,
      type: "calculated",
      source: "formula",
    };
  }

  res.json({ fare });
});

// GET /api/fares/route – proxy to Google Maps Directions API and compute fare
router.get("/route", verifyToken, async (req, res) => {
  const { origin, destination, passengers = 1 } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination are required" });
  }

  // Get API key
  const keySetting = await Setting.findOne({ key: "tomtom_api_key" });
  const apiKey = keySetting?.value || process.env.TOMTOM_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TomTom API key not configured" });
  }

  try {
    // Localized Geocoding (Forces results to Cagayan/Philippines)
    const geocode = async (query) => {
      const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query + ", Philippines")}.json?key=${apiKey}&limit=1`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.results?.length) throw new Error(`Location not found: ${query}`);
      return json.results[0].position; // returns {lat, lon}
    };

    // Convert addresses
    const [startData, endData] = await Promise.all([geocode(origin), geocode(destination)]);

    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startData.lat},${startData.lon}:${endData.lat},${endData.lon}/json?key=${apiKey}&traffic=true`;
    const routeRes = await fetch(routeUrl);
    const routeData = await routeRes.json();

    if (!routeData.routes?.length) {
      return res.status(400).json({ error: "Could not get route", details: data.status });
    }

    const route = routeData.routes[0];
    const summary = route.summary;

    const totalSeconds = summary.travelTimeInSeconds;
    const delaySeconds = summary.trafficDelayInSeconds;
    const baseSeconds = totalSeconds - delaySeconds; // This is the non-traffic time.

    const distanceKm = summary.lengthInMeters / 1000;
    const durationMinutes = Math.round(totalSeconds / 60);

    // Get fare settings
    const baseFareSetting = await Setting.findOne({ key: "base_fare" });
    const perKmSetting = await Setting.findOne({ key: "per_km_rate" });
    // const fareMatrixSetting = await Setting.findOne({ key: "fare_matrix" });

    const baseFare = parseFloat(baseFareSetting?.value) || DEFAULT_FARES.base_fare;
    const perKm = parseFloat(perKmSetting?.value) || DEFAULT_FARES.per_km_rate;
    const pax = Math.max(1, parseInt(passengers, 10) || 1);

    // Calculate fare
    const distanceFare = distanceKm * perKm;
    const farePerPassenger = baseFare + distanceFare;
    const totalFare = farePerPassenger * pax;

    // Congestion Logic
    const congestion = delaySeconds < 60 ? "light" : delaySeconds < 300 ? "moderate" : "heavy";

    // Polyline data
    // Transform Tomtom's points into a simple array for Google Maps.
    const path = route.legs[0].points.map((p) => ({ lat: p.latitude, lng: p.longitude }));

    res.json({
      route: {
        origin: startData.address,
        destination: endData.address,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: `${Math.round(baseSeconds / 60)} mins`,
        durationInTrafficText: `${durationMinutes} mins`,
        durationMinutes,
        congestion,
        path, // Send the raw coordinate array to the frontend
      },
      fare: {
        passengers: pax,
        baseFare,
        distanceFare: parseFloat(distanceFare.toFixed(2)),
        farePerPassenger: parseFloat(farePerPassenger.toFixed(2)),
        totalFare: parseFloat(totalFare.toFixed(2)),
        breakdown: `₱${baseFare} base + ₱${perKm}/km × ${distanceKm.toFixed(2)}km = ₱${farePerPassenger.toFixed(2)} per pax`,
      },
    });
  } catch (error) {
    console.error("Route API Error: ", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
