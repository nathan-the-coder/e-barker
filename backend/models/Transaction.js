import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  queueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Queue'
  },
  dispatcherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  feeAmount: {
    type: Number,
    default: 10.00
  },
  feeType: {
    type: String,
    enum: ['terminal_fee', 'penalty', 'other'],
    default: 'terminal_fee'
  },
  // Fare & Route data
  routeOrigin: {
    type: String,
    default: null
  },
  routeDestination: {
    type: String,
    default: null
  },
  distanceKm: {
    type: Number,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: null
  },
  baseFare: {
    type: Number,
    default: null
  },
  passengerFare: {
    type: Number,
    default: null
  },
  notes: String
}, {
  timestamps: true
});

// Index for date queries
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ driverId: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
