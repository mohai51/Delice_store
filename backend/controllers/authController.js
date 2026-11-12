const AdminUser = require('../models/AdminUser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const connectDB = require('../config/db');

/**
 * Admin Login
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both username and password.'
      });
    }

    // Ensure database connection is complete before any model queries
    await connectDB();

    const cleanInput = username.toLowerCase().trim();

    // Find user by username or email
    let user = await AdminUser.findOne({
      $or: [
        { username: cleanInput },
        { email: cleanInput }
      ]
    });

    // Auto-bootstrap superadmin if database is clean (e.g. fresh Vercel deployment)
    if (!user) {
      const userCount = await AdminUser.countDocuments();
      if (userCount === 0) {
        const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
        const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@Delice2026';
        const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@delicefragrance.com';

        const passwordHash = await bcrypt.hash(defaultPass, 10);
        user = await AdminUser.create({
          username: defaultUser,
          email: defaultEmail,
          passwordHash,
          role: 'superadmin'
        });
        console.log(`[Auth Bootstrap] Default superadmin account auto-created.`);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT Token
    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current admin user profile
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.admin
  });
};
