const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }
  JWT_SECRET = 'delice_dev_fallback_jwt_secret_only';
}

const protectAdmin = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Please authenticate as an admin.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await AdminUser.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Admin user no longer exists or session expired.'
      });
    }

    req.admin = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.'
    });
  }
};

module.exports = {
  protectAdmin,
  JWT_SECRET
};
