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

// Smart burst rate limiter for orders (allows normal shoppers, blocks bot floods)
const smartOrderLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 5, // Max 5 orders per 3 minutes per IP
  message: {
    success: false,
    error: 'Too many order attempts from this network. Please wait 3 minutes before placing another order.'
  },
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  checkoutLimiter,
  loginLimiter,
  smartOrderLimiter
};
