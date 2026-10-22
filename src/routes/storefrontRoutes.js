const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const storeService = require('../services/storeService');

// Rate limiter for checkout to prevent automated order flooding
const orderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 order submissions per IP per 15 min
  message: { error: 'Too many order requests. Please try again after 15 minutes.' }
});

// Rate limiter for order tracking lookup
const trackRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Too many tracking attempts. Please wait a moment.' }
});

// ==========================================
// 1. PUBLIC CONFIGURATION & HOMEPAGE
// ==========================================
router.get('/config', async (req, res, next) => {
  try {
    const settings = await storeService.getSettings();
    const homepage = await storeService.getHomepage({ isDraft: false });

    res.json({
      storeName: settings.storeName,
      tagline: settings.tagline,
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      contact: settings.contact,
      deliveryZones: settings.deliveryZones,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      paymentMethods: settings.paymentMethods,
      policies: settings.policies,
      brandColors: settings.brandColors,
      announcementBar: homepage.announcementBar
    });
  } catch (err) {
    next(err);
  }
});

// Get published homepage
router.get('/homepage', async (req, res, next) => {
  try {
    const homepage = await storeService.getHomepage({ isDraft: false });
    const allPublishedProducts = await storeService.getProducts({ status: 'published' });

    // Filter and sort featured products
    let featuredList = [];
    if (homepage.featuredProducts && homepage.featuredProducts.length > 0) {
      featuredList = homepage.featuredProducts
        .map(slugOrId => allPublishedProducts.find(p => p.slug === slugOrId || p._id.toString() === slugOrId))
        .filter(Boolean);
    }

    if (featuredList.length === 0) {
      featuredList = allPublishedProducts.slice(0, 4);
    }

    res.json({
      homepage,
      featuredProducts: featuredList
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. PRODUCTS
// ==========================================
// List published products
router.get('/products', async (req, res, next) => {
  try {
    const products = await storeService.getProducts({ status: 'published' });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// Get product details by slug
router.get('/products/:slug', async (req, res, next) => {
  try {
    const product = await storeService.getProductBySlug(req.params.slug);
    if (!product || product.status === 'archived') {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Get related products (same family or other published perfumes)
    const allProducts = await storeService.getProducts({ status: 'published' });
    const related = allProducts
      .filter(p => p.slug !== product.slug)
      .slice(0, 3);

    res.json({
      product,
      related
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. CART VALIDATION & CALCULATION
// ==========================================
router.post('/validate-cart', async (req, res, next) => {
  try {
    const { items = [], referralCode, district } = req.body;
    const settings = await storeService.getSettings();

    const validatedItems = [];
    let subtotal = 0;
    let hasStockIssue = false;

    for (const item of items) {
      const product = await storeService.getProductById(item.productId);
      if (!product || product.status !== 'published') {
        validatedItems.push({
          ...item,
          available: false,
          issue: 'Product is no longer available'
        });
        hasStockIssue = true;
        continue;
      }

      const variant = (product.variants || []).find(v => v.size === item.size);
      if (!variant) {
        validatedItems.push({
          ...item,
          available: false,
          issue: 'Variant size unavailable'
        });
        hasStockIssue = true;
        continue;
      }

      const unitPrice = variant.salePrice || variant.price;
      const requestedQty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const isStockAdequate = variant.stock >= requestedQty;

      if (!isStockAdequate) {
        hasStockIssue = true;
      }

      const itemTotal = unitPrice * requestedQty;
      subtotal += itemTotal;

      validatedItems.push({
        productId: product._id.toString(),
        slug: product.slug,
        name: product.name,
        size: variant.size,
        unitPrice,
        originalPrice: variant.price,
        quantity: requestedQty,
        stockAvailable: variant.stock,
        subtotal: itemTotal,
        available: isStockAdequate,
        issue: !isStockAdequate ? `Only ${variant.stock} bottle(s) available in stock` : null
      });
    }

    // Referral discount
    let discount = 0;
    let referralValid = false;
    let referralMessage = '';

    if (referralCode) {
      const ref = await storeService.getReferralCode(referralCode);
      if (ref && ref.isActive) {
        referralValid = true;
        const discountPct = ref.refereeDiscountPercent || settings.referralRules?.refereeDiscountPercent || 10;
        discount = Math.round((subtotal * discountPct) / 100);
        referralMessage = `${discountPct}% Patron Courtesy Applied`;
      } else {
        referralMessage = 'Invalid or expired referral code';
      }
    }

    // Delivery calculation
    const isDhaka = /dhaka/i.test(district || '');
    let deliveryCharge = isDhaka 
      ? (settings.deliveryZones[0]?.charge || 80) 
      : (settings.deliveryZones[1]?.charge || 150);

    if (subtotal >= (settings.freeDeliveryThreshold || 5000)) {
      deliveryCharge = 0;
    }

    const total = Math.max(0, subtotal - discount + deliveryCharge);

    res.json({
      valid: !hasStockIssue,
      items: validatedItems,
      pricing: {
        subtotal,
        discount,
        deliveryCharge,
        total,
        freeDeliveryQualified: deliveryCharge === 0,
        amountNeededForFreeDelivery: Math.max(0, (settings.freeDeliveryThreshold || 5000) - subtotal)
      },
      referral: {
        code: referralCode,
        isValid: referralValid,
        message: referralMessage,
        discount
      }
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. ORDER PLACEMENT
// ==========================================
router.post('/orders', orderRateLimiter, async (req, res, next) => {
  try {
    const { customer, items, paymentMethod, bkashDetails, referralCode, orderNotes, idempotencyKey } = req.body;

    // Strict validation of Bangladesh customer details
    if (!customer || !customer.name || !customer.phone || !customer.district || !customer.fullAddress) {
      return res.status(400).json({ error: 'Please provide full recipient name, Bangladesh phone number, district, and delivery address.' });
    }

    // Bangladesh phone regex: 01XXXXXXXXX (11 digits starting with 013-019)
    const bdPhoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
    const cleanPhone = customer.phone.replace(/[\s-]/g, '');
    if (!bdPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX).' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your shopping bag is empty.' });
    }

    if (!['cod', 'bkash_manual'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method selected.' });
    }

    // bKash manual payment validation: require sender number and TrxID
    if (paymentMethod === 'bkash_manual') {
      if (!bkashDetails || !bkashDetails.senderNumber || !bkashDetails.trxId) {
        return res.status(400).json({ error: 'Please provide your sending bKash number and Transaction ID (TrxID).' });
      }
    }

    const { order, isDuplicate } = await storeService.createOrder({
      customer: {
        name: customer.name.trim(),
        phone: cleanPhone,
        email: (customer.email || '').trim().toLowerCase(),
        district: customer.district.trim(),
        area: (customer.area || customer.district).trim(),
        fullAddress: customer.fullAddress.trim()
      },
      items,
      paymentMethod,
      bkashDetails,
      referralCode,
      orderNotes,
      idempotencyKey
    });

    // Track purchase event for real analytics deduplicated by order reference
    await storeService.recordAnalyticsEvent({
      sessionId: req.headers['x-session-id'] || 'storefront_session',
      eventType: 'purchase',
      pagePath: '/checkout',
      orderReference: order.orderReference,
      amount: order.pricing.total,
      deviceCategory: req.headers['user-agent']?.toLowerCase().includes('mobile') ? 'mobile' : 'desktop',
      location: { country: 'Bangladesh', district: order.customer.district }
    });

    res.status(201).json({
      success: true,
      orderReference: order.orderReference,
      trackingToken: order.trackingToken,
      total: order.pricing.total,
      paymentMethod: order.payment.method,
      paymentStatus: order.payment.status,
      message: 'Your order has been registered with DÉLICE concierge.'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. SECURE ORDER TRACKING
// ==========================================
router.get('/track/:token', trackRateLimiter, async (req, res, next) => {
  try {
    const token = req.params.token;
    const order = await storeService.getOrderByTrackingToken(token);

    if (!order) {
      return res.status(404).json({ error: 'Order not found. Please verify your tracking link.' });
    }

    // Return sanitized public tracking information without exposing sensitive credit or internal details
    res.json({
      orderReference: order.orderReference,
      createdAt: order.createdAt,
      fulfillmentStatus: order.fulfillment.status,
      courierName: order.fulfillment.courierName,
      trackingNumber: order.fulfillment.trackingNumber,
      deliveredAt: order.fulfillment.deliveredAt,
      paymentMethod: order.payment.method,
      paymentStatus: order.payment.status,
      recipientName: order.customer.name,
      recipientDistrict: order.customer.district,
      items: order.items.map(i => ({
        name: i.name,
        size: i.size,
        quantity: i.quantity,
        subtotal: i.subtotal,
        imageUrl: i.imageUrl
      })),
      pricing: order.pricing
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. REFERRAL CODE VALIDATION
// ==========================================
router.post('/validate-referral', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Please enter a referral code.' });
    }

    const ref = await storeService.getReferralCode(code);
    if (!ref || !ref.isActive) {
      return res.json({ valid: false, message: 'Invalid or inactive referral code.' });
    }

    res.json({
      valid: true,
      code: ref.code,
      discountPercent: ref.refereeDiscountPercent || 10,
      message: `${ref.refereeDiscountPercent || 10}% Patron Courtesy Applied`
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. PRIVACY-RESPECTING FIRST-PARTY ANALYTICS
// ==========================================
router.post('/analytics/collect', async (req, res, next) => {
  try {
    const { eventType, pagePath, productSlug, productName, sessionId, deviceCategory, referrer, utmSource, utmMedium, utmCampaign, district } = req.body;

    if (!['page_view', 'product_view', 'add_to_bag', 'checkout_start'].includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    // Check user agent for search engine bots
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(ua);

    await storeService.recordAnalyticsEvent({
      sessionId: sessionId || req.cookies?.['delice_sid'] || 'anon',
      eventType,
      pagePath: pagePath || '/',
      productSlug,
      productName,
      deviceCategory: deviceCategory || (/mobile/i.test(ua) ? 'mobile' : 'desktop'),
      referrer: referrer || req.headers['referer'] || 'Direct',
      utmSource,
      utmMedium,
      utmCampaign,
      location: {
        country: 'Bangladesh',
        district: district || 'Unknown',
        isEstimated: true
      },
      isBot
    });

    res.json({ recorded: true });
  } catch (err) {
    // Non-blocking for client
    res.json({ recorded: false, error: err.message });
  }
});

module.exports = router;
