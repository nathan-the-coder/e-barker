import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.js';
import queueRoutes from './routes/queue.js';
import transactionRoutes from './routes/transactions.js';
import settingsRoutes from './routes/settings.js';
import vehicleRoutes from './routes/vehicles.js';
import userRoutes from './routes/users.js';
import fareRoutes from './routes/fares.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration - restrict in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, /\.vercel\.app$/]
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://[::1]:5173',
        'http://[::1]:5174'
      ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fares', fareRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ 
    status: 'ok', 
    message: 'E-Barker API is running',
    dbState: states[state] || 'unknown'
  });
});

// Start server locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
