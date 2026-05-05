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
  feeType: {
    type: String,
    enum: ['terminal_fee', 'trip_fare', 'pending_trip'],
    default: 'terminal_fee'
  },
  // Route data
  routeOrigin: {
    type: String,
    default: null
  },
  routeDestination: {
    type: String,
    default: null
  },
  routeTaken: {
    type: String,
    enum: ['highway', 'penablanca', null],
    default: null
  },
  // Fixed fare passenger counts
  regularCount: {
    type: Number,
    default: 0
  },
  seniorStudentCount: {
    type: Number,
    default: 0
  },
  // Fare calculation
  baseFare: {
    type: Number,
    default: 150
  },
  discountedFare: {
    type: Number,
    default: 130
  },
  totalFare: {
    type: Number,
    default: 0
  },
  isRecorded: {
    type: Boolean,
    default: false
  },
  recordedAt: {
    type: Date,
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
