const rateLimit = require('express-rate-limit');

// Rate limiter for checkout and payment initiation
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 checkout requests per windowMs
  message: {
    success: false,
    error: 'Too many requests created from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for admin login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Limit to 10 attempts
  message: {
    success: false,
    error: 'Too many login attempts. Please wait 15 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  checkoutLimiter,
  loginLimiter
};
