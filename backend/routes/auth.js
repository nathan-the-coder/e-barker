import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, name, phone, role = "driver" } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user exists
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
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

    // Find user (include password for comparison)
    const user = await User.findOne({ email }).select({ password: 1, email: 1, role: 1, name: 1, username: 1 });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    const token = generateToken(user);
    const userObj = user.toObject({ virtuals: true });
    delete userObj.password;

    res.json({ user: userObj, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Google OAuth
router.post("/google", async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential required" });
    }

    // Verify the credential with Google
    const verifyResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!verifyResponse.ok) {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const decoded = await verifyResponse.json();

    const { email, name, sub: googleId } = decoded;

    if (!email) {
      return res.status(400).json({ error: "Email not found in Google credential" });
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (user) {
      // Update googleId if not set
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        await user.save();
      }
      const token = generateToken(user);
      const userObj = user.toObject({ virtuals: true });
      delete userObj.password;
      return res.json({ user: userObj, token, isNewUser: false });
    }

    // New user - role must be provided
    if (!role || !["driver", "dispatcher"].includes(role)) {
      return res.status(200).json({
        needsRoleSelection: true,
        email,
        name: name || email.split("@")[0],
        googleId,
        message: "Please select a role to complete registration"
      });
    }

    // Create new user with selected role
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
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Generate request ID
const generateRequestId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get current user
router.get("/me", async (req, res) => {
  const requestId = req.headers["x-request-id"] || generateRequestId();

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error(`[${requestId}] No token provided`);
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password").populate('vehicleId', 'bodyNumber');
    if (!user) {
      console.error(`[${requestId}] User not found: ${decoded.userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`[${requestId}] User retrieved successfully: ${user.email}`);
    res.json({ user });
  } catch (error) {
    console.error(`[${requestId}] Get current user error:`, error);
    return res.status(401).json({ error: "Invalid token" });
  }
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ userId: user._id || user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "24h",
  });
};

export default router;
