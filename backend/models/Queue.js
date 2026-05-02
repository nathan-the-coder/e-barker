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
  checkInTime: {
    type: Date,
    default: Date.now
  },
  dispatchTime: Date,
  estimatedArrivalTime: Number,  // in minutes
  completedTime: Date,
  status: {
    type: String,
    enum: ['Waiting', 'On-trip', 'Completed', 'Offline'],
    default: 'Waiting'
  },
  dispatcherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for FIFO queries
queueSchema.index({ status: 1, checkInTime: 1 });

export default mongoose.model('Queue', queueSchema);
