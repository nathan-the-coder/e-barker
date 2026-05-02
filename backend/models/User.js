import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false  // Don't return password by default
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: String,
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  role: {
    type: String,
    enum: ['admin', 'dispatcher', 'driver', 'inactive'],
    default: 'driver'
  }
}, {
  timestamps: true  // Adds createdAt and updatedAt
});

export default mongoose.model('User', userSchema);
