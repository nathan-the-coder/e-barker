import mongoose from 'mongoose';

const tricycleSchema = new mongoose.Schema({
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Tricycle', tricycleSchema);
