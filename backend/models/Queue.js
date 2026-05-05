import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  currentLocation: String,
  destination: String,
  routeOrigin: String,
  routeDestination: String,
  routePolyline: String,
  checkInTime: {
    type: Date,
    default: Date.now
  },
  dispatchTime: Date,
  confirmedTime: Date,
  estimatedArrivalTime: Number,
  completedTime: Date,
  status: {
    type: String,
    enum: ['Waiting', 'On-trip', 'Confirmed', 'Completed', 'Offline'],
    default: 'Waiting'
  },
  dispatcherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  currentLat: Number,
  currentLng: Number,
  distanceKm: Number,
  lastLocationUpdate: Date,
  locationHistory: [{
    lat: Number,
    lng: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  calculatedFare: Number
}, {
  timestamps: true
});

// Index for FIFO queries
queueSchema.index({ status: 1, checkInTime: 1 });
queueSchema.index({ driverId: 1, status: 1 });

export default mongoose.model('Queue', queueSchema);
