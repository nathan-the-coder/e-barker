import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const requestId = req.headers['x-request-id'] || generateRequestId();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error(`[${requestId}] No token provided`);
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.requestId = requestId;
    next();
  } catch (error) {
    console.error(`[${requestId}] Invalid token:`, error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      console.error(`[${req.requestId || 'unknown'}] User not authenticated`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        console.error(`[${req.requestId || 'unknown'}] User not found: ${req.user.userId}`);
        return res.status(403).json({ error: 'User not found' });
      }

      const userRole = user.role;
      if (!roles.includes(userRole)) {
        console.error(`[${req.requestId || 'unknown'}] Insufficient permissions. Required: ${roles}, Got: ${userRole}`);
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = userRole;
      req.user = user; // Add full user object to request
      next();
    } catch (error) {
      console.error(`[${req.requestId || 'unknown'}] Role verification error:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id || user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

function generateRequestId() {
  return Math.random().toString(36).substr(2, 9);
}
