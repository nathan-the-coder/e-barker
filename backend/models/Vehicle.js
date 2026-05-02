import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  bodyNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  plateNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  model: String,
  year: Number,
  vehicleType: {
    type: String,
    enum: ['PUV Van', 'Mini Bus', 'Jeepney'],
    default: 'PUV Van'
  },
  capacity: {
    type: Number,
    default: 14
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Vehicle', vehicleSchema);
