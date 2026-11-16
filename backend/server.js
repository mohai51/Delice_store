const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingRoutes = require('./routes/settingRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const slideRoutes = require('./routes/slideRoutes');
const deliceProfitRoutes = require('./routes/deliceProfitRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Security Headers with Helmet (configured for Google Fonts & SVG images)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Middleware
app.use(cors());

// Body Parsers (Support both JSON and x-www-form-urlencoded for gateway webhooks)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Frontend Static Files with Intelligent Asset Caching
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use((req, res, next) => {
  const urlPath = req.path || '';
  if (urlPath.match(/\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|eot)$/i)) {
    // 30 days cache for static images and web fonts
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  } else if (urlPath.match(/\.(css|js)$/i)) {
    // 1 day cache for styles and scripts
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    // HTML pages remain fresh so updates reflect immediately
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
  next();
});
app.use(express.static(frontendPath, { etag: true, maxAge: '30d' }));

// Database Readiness Middleware (Ensures connection is established before API processing, critical for Vercel Serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[DB Middleware] Error awaiting connection:', err.message);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/slides', slideRoutes);
app.use('/api/admin/delice-profit', deliceProfitRoutes);

// Admin Portal Direct Route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin', 'index.html'));
});

// Fallback HTML Routes for clean URLs
app.get('/cart', (req, res) => {
  res.sendFile(path.join(frontendPath, 'cart.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(frontendPath, 'checkout.html'));
});

app.get('/story', (req, res) => {
  res.sendFile(path.join(frontendPath, 'story.html'));
});

app.get('/product', (req, res) => {
  res.sendFile(path.join(frontendPath, 'product.html'));
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server (Avoid binding port when running inside Vercel serverless environment or automated tests)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`
  ==============================================================
    DÉLICE Fragrances Server Running
    Environment: ${process.env.NODE_ENV || 'development'}
    Port:        ${PORT}
    Storefront:  http://localhost:${PORT}/
    Admin Panel: http://localhost:${PORT}/admin
  ==============================================================
    `);
  });
}

module.exports = app;
