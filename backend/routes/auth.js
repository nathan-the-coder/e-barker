import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Result, ok, err, okAsync } from "neverthrow";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Helper to create error responses
const errorRes = (res, error) => res.status(400).json({ error });

// Register new user
router.post("/register", async (req, res) => {
  const { username, email, password, name, phone, role = "driver" } = req.body;

  // Validation
  if (!username || !email || !password || !name) {
    return errorRes(res, "Missing required fields");
  }

  // Check if user exists
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return errorRes(res, "Username or email already exists");
  }

  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    name,
    phone,
    role,
  });

  const token = generateToken(user);
  const userObj = user.toObject({ virtuals: true });
  delete userObj.password;

  res.status(201).json({ user: userObj, token });
});

// Login with email/password
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorRes(res, "Email and password required");
  }

  // Find user  
  const user = await User.findOne({ email }).select({ password: 1, email: 1, role: 1, name: 1, username: 1 });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken(user);
  const userObj = user.toObject({ virtuals: true });
  delete userObj.password;

  res.json({ user: userObj, token });
});

// Google OAuth
router.post("/google", async (req, res) => {
  const { credential, role } = req.body;

  if (!credential) {
    return errorRes(res, "Google credential required");
  }

  const verifyResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
  );

  if (!verifyResponse.ok) {
    return res.status(401).json({ error: "Invalid Google credential" });
  }

  const decoded = await verifyResponse.json();
  const { email, name, sub: googleId } = decoded;

  if (!email) {
    return errorRes(res, "Email not found in Google credential");
  }

  let user = await User.findOne({ $or: [{ email }, { googleId }] });

  if (user) {
    if (!user.googleId && googleId) {
      user.googleId = googleId;
      await user.save();
    }
    const token = generateToken(user);
    const userObj = user.toObject({ virtuals: true });
    delete userObj.password;
    return res.json({ user: userObj, token, isNewUser: false });
  }

  if (!role || !["driver", "dispatcher"].includes(role)) {
    return res.status(200).json({
      needsRoleSelection: true,
      email,
      name: name || email.split("@")[0],
      googleId,
      message: "Please select a role to complete registration"
    });
  }

  user = await User.create({
    email,
    name: name || email.split("@")[0],
    googleId,
    username: email.split("@")[0] + "_" + Date.now(),
    role,
  });

  const token = generateToken(user);
  const userObj = user.toObject({ virtuals: true });
  delete userObj.password;

  res.json({ user: userObj, token, isNewUser: true });
});

// Get current user
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split("Bearer ")[1];
  
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await User.findById(decoded.userId).select("-password").populate('vehicleId', 'bodyNumber');
  
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ user });
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ userId: user._id || user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "24h",
  });
};

export default router;