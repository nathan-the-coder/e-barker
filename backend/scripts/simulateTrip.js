import mongoose from 'mongoose';
import { connectDB } from '../config/database.js';
import Queue from '../models/Queue.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';

async function simulateDriver() {
  await connectDB();
  
  // Find a driver with vehicle
  const driver = await User.findOne({ role: 'driver' });
  if (!driver) {
    console.log('No driver found');
    process.exit(1);
  }
  
  const vehicle = await Vehicle.findOne({ driverId: driver._id });
  
  // Create confirmed trip with route
  const trip = await Queue.create({
    driverId: driver._id,
    vehicleId: vehicle?._id,
    status: 'Confirmed',
    dispatchTime: new Date(),
    confirmedTime: new Date(),
    routeOrigin: 'San Jose, Baggao, Cagayan',
    routeDestination: 'Tuguegarao City, Cagayan',
    estimatedArrivalTime: 45,
    currentLat: 17.9483,
    currentLng: 121.7886,
    distanceKm: 42,
  });
  
  console.log(`Created trip: ${trip._id}`);
  console.log(`Driver: ${driver.name}`);
  console.log(`Vehicle: ${vehicle?.bodyNumber}`);
  
  // Simulate movement along a route (Baggao → Tuguegarao)
  const route = [
    { lat: 17.9483, lng: 121.7886 },
    { lat: 17.9350, lng: 121.8200 },
    { lat: 17.9200, lng: 121.8500 },
    { lat: 17.8800, lng: 121.8800 },
    { lat: 17.8200, lng: 121.9200 },
    { lat: 17.7500, lng: 121.9500 },
    { lat: 17.6950, lng: 121.9700 },
    { lat: 17.6100, lng: 121.9800 },
  ];
  
  let index = 0;
  const interval = setInterval(async () => {
    if (index >= route.length) {
      console.log('Trip completed simulation');
      clearInterval(interval);
      process.exit(0);
    }
    
    const loc = route[index];
    await Queue.findByIdAndUpdate(trip._id, {
      currentLat: loc.lat,
      currentLng: loc.lng,
      lastLocationUpdate: new Date(),
    });
    
    console.log(`Location ${index + 1}/${route.length}: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
    index++;
  }, 10000); // Update every 10 seconds
}

simulateDriver().catch(console.error);