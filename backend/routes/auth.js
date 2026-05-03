import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Result, ok, err } from "neverthrow";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Helper to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id || user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

// Register new user (email/password)
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, name, phone, role = "driver" } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user exists by email OR username
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ error: "Username or email already exists" });
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
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ user: userObj, token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login with email/password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user including password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // If user has Google account but no password
    if (user.googleId && !user.password) {
      return res.status(400).json({
        error: "Use Google login for this account",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Fetch full user without password
    const fullUser = await User.findById(user._id);
    const token = generateToken(fullUser);
    const userObj = fullUser.toObject();
    delete userObj.password;

    res.json({ user: userObj, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Google OAuth - with proper account linking
router.post("/google", async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential required" });
    }

    // Verify the Google token
    const verifyResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!verifyResponse.ok) {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const decoded = await verifyResponse.json();
    const { email, name, sub: googleId, email_verified } = decoded;

    if (!email) {
      return res.status(400).json({ error: "Email not found in Google credential" });
    }

    // Security: Check Google verified the email
    if (email_verified !== "true") {
      return res.status(400).json({ error: "Google email not verified" });
    }

    // ===== ACCOUNT LINKING LOGIC =====
    // 1. First, check if user already exists with this email (could be password account)
    let user = await User.findOne({ email });

    if (user) {
      // Account exists - link Google ID if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
      
      const token = generateToken(user);
      const userObj = user.toObject();
      delete userObj.password;
      
      return res.json({ user: userObj, token, isNewUser: false });
    }

    // 2. Check if user exists with googleId (unlikely but safe)
    user = await User.findOne({ googleId });
    if (user) {
      // Update email in case it changed
      user.email = email;
      await user.save();
      
      const token = generateToken(user);
      const userObj = user.toObject();
      delete userObj.password;
      
      return res.json({ user: userObj, token, isNewUser: false });
    }

    // 3. No account exists - need role to create new user
    if (!role || !["driver", "dispatcher"].includes(role)) {
      return res.status(200).json({
        needsRoleSelection: true,
        email,
        name: name || email.split("@")[0],
        googleId,
        message: "Please select a role to complete registration",
      });
    }

    // Create new user via Google
    user = await User.create({
      email,
      name: name || email.split("@")[0],
      googleId,
      username: email.split("@")[0] + "_" + Date.now(),
      role,
    });

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.password;

    res.json({ user: userObj, token, isNewUser: true });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId)
      .select("-password")
      .populate("vehicleId", "bodyNumber");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;