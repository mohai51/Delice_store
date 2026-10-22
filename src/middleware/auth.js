const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getIsConnected, localStore } = require('../config/db');
const Admin = require('../models/Admin');
const storeService = require('../services/storeService');

const SESSION_COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || 'delice_admin_sess';
const CSRF_COOKIE_NAME = 'delice_csrf_token';

// In-memory active sessions store for ultra-fast validation
// Session object: { token, adminId, username, role, expiresAt }
const activeSessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateCsrfToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Authenticate Admin Credentials
async function authenticateAdmin(username, password) {
  let admin = null;
  if (getIsConnected()) {
    admin = await Admin.findOne({ $or: [{ username }, { email: username.toLowerCase() }] });
  } else {
    const list = localStore.getCollection('admins');
    admin = list.find(a => a.username === username || (a.email && a.email.toLowerCase() === username.toLowerCase()));
  }

  if (!admin) {
    return { success: false, message: 'Invalid credentials' };
  }

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) {
    return { success: false, message: 'Invalid credentials' };
  }

  // Create session
  const token = generateToken();
  const csrfToken = generateCsrfToken();
  const session = {
    token,
    csrfToken,
    adminId: admin._id ? admin._id.toString() : admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role || 'superadmin',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };

  activeSessions.set(token, session);

  // Update last login
  if (getIsConnected()) {
    await Admin.findByIdAndUpdate(admin._id, { lastLoginAt: new Date() });
  } else {
    admin.lastLoginAt = new Date();
    localStore.save();
  }

  await storeService.logAdminAction({
    adminUsername: admin.username,
    action: 'ADMIN_LOGIN',
    targetType: 'admin',
    targetId: session.adminId,
    details: { timestamp: new Date() }
  });

  return { success: true, session, admin: { username: admin.username, email: admin.email, role: admin.role } };
}

// Admin Auth Middleware
function requireAdmin(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.redirect('/admin/login');
    }
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }

  const session = activeSessions.get(token);
  if (!session || new Date() > new Date(session.expiresAt)) {
    activeSessions.delete(token);
    res.clearCookie(SESSION_COOKIE_NAME);
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      return res.redirect('/admin/login');
    }
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // CSRF Protection for state mutations (POST, PUT, PATCH, DELETE)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.path.startsWith('/api/admin/')) {
    const reqCsrf = req.headers['x-csrf-token'] || req.body?._csrf;
    if (!reqCsrf || reqCsrf !== session.csrfToken) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
    }
  }

  req.adminSession = session;
  req.adminUsername = session.username;
  next();
}

// Invalidate Session
function logoutSession(token) {
  if (token) {
    activeSessions.delete(token);
  }
}

module.exports = {
  authenticateAdmin,
  requireAdmin,
  logoutSession,
  activeSessions,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME
};
