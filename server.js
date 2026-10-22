require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { connectDB, getIsConnected } = require('./src/config/db');
const storefrontRoutes = require('./src/routes/storefrontRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const storeService = require('./src/services/storeService');
const seedInitialContent = require('./src/scripts/seed');

const app = express();
const PORT = process.env.PORT || 4000;

// Auto-connect database for serverless environments (e.g. Vercel)
app.use(async (req, res, next) => {
  if (!getIsConnected()) {
    try {
      await connectDB();
    } catch (err) {
      console.error('[DB] Serverless connection error:', err.message);
    }
  }
  next();
});

// Security & Body Parsers
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Dynamic robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /admin/
Disallow: /checkout
Disallow: /order-confirmation
Disallow: /track-order
Disallow: /api/

Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml
`);
});

// Dynamic sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await storeService.getProducts({ status: 'published' });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const today = new Date().toISOString().split('T')[0];

    let urls = `
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/cart</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;

    products.forEach(p => {
      urls += `
  <url>
    <loc>${baseUrl}/product/${p.slug}</loc>
    <lastmod>${new Date(p.updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// Mount API routes
app.use('/api/storefront', storefrontRoutes);
app.use('/api/admin', adminRoutes);

// Admin Web Routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});

app.get(/^\/admin/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Storefront Web Routes (Single-page app with URL support)
app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/cart.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/checkout.html'));
});

app.get('/order-confirmation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/order-confirmation.html'));
});

app.get('/track-order', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/track-order.html'));
});

app.get('/product/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/product.html'));
});

// Main storefront index fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public/index.html'));
  }
  next();
});

// Safe Error Handler (no leaking stack traces in production)
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'An unexpected error occurred. Please contact DÉLICE concierge.'
    : err.message || 'Internal Server Error';
  
  res.status(status).json({ error: message });
});

// Startup Server
async function startServer() {
  await connectDB();
  await seedInitialContent();

  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log('========================================================');
      console.log(`  DÉLICE Haute Parfumerie E-Commerce System`);
      console.log(`  Market: Bangladesh | Currency: BDT (৳)`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('========================================================');
      console.log(`  Storefront: http://localhost:${PORT}`);
      console.log(`  Admin Panel: http://localhost:${PORT}/admin`);
      console.log('========================================================');
    });
  }
}

startServer();

module.exports = app;
