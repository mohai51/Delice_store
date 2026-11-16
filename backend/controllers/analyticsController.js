const AnalyticsSession = require('../models/AnalyticsSession');
const Order = require('../models/Order');
const { memoryStore, isConnected } = require('../config/db');

// In-memory fallback container
if (!memoryStore.analyticsSessions) {
  memoryStore.analyticsSessions = [];
}

/**
 * Seed realistic analytics data if empty
 */
async function ensureSeedData() {
  let count = 0;
  if (isConnected()) {
    try {
      count = await AnalyticsSession.countDocuments();
    } catch (_) {
      count = memoryStore.analyticsSessions.length;
    }
  } else {
    count = memoryStore.analyticsSessions.length;
  }

  if (count >= 15) return;

  const now = Date.now();
  const demoSessions = [];

  // 150 realistic sessions distributed over the last 30 days
  // Device distribution: ~75% Mobile, ~10% Tablet, ~15% PC
  // Funnel: 150 Visitors -> 48 Add to Cart -> 32 Buy Now -> 6 Realized Orders
  const products = [
    { id: 'delice-bloom', name: 'DÉLICE Bloom (30ml)' },
    { id: 'delice-momentum', name: 'DÉLICE Momentum (30ml)' },
    { id: 'delice-enigma', name: 'DÉLICE Enigma (30ml)' }
  ];

  // Specific times: some in last 24h, some in last 7d, some in last 30d
  for (let i = 0; i < 150; i++) {
    let ageHours;
    if (i < 30) {
      // 30 sessions in last 24 hours
      ageHours = Math.random() * 23;
    } else if (i < 80) {
      // 50 sessions in last 2-7 days
      ageHours = 24 + Math.random() * (7 * 24 - 24);
    } else {
      // 70 sessions in last 8-30 days
      ageHours = 7 * 24 + Math.random() * (30 * 24 - 7 * 24);
    }

    const sessionStartTime = new Date(now - ageHours * 3600 * 1000);
    const rand = Math.random();
    const deviceType = rand < 0.76 ? 'mobile' : (rand < 0.86 ? 'tablet' : 'pc');

    // Screen time: mobile typically 1m 20s - 3m 40s; PC 2m - 5m; tablet 1m 40s - 4m
    const baseDuration = deviceType === 'pc' ? 180 : (deviceType === 'tablet' ? 150 : 120);
    const screenTimeSeconds = Math.max(25, Math.round(baseDuration + (Math.random() * 140 - 50)));

    const visitorNum = 1000 + (i % 85); // Some repeat visitors
    const visitorId = `vid_${visitorNum}`;
    const sessionId = `sid_${Date.now()}_${i}`;

    // Add to cart probability ~32%
    const hasAddToCart = i < 48;
    // Buy now probability ~21%
    const hasBuyNow = i < 32;
    // Converted to actual order: exactly 6 matching existing orders
    const hasConverted = i < 6;

    const prod = products[i % products.length];
    const events = [
      { eventType: 'page_view', productName: 'Storefront Home', timestamp: sessionStartTime }
    ];

    if (hasAddToCart) {
      events.push({
        eventType: 'add_to_cart',
        productId: prod.id,
        productName: prod.name,
        timestamp: new Date(sessionStartTime.getTime() + 45000)
      });
    }

    if (hasBuyNow) {
      events.push({
        eventType: 'buy_now',
        productId: prod.id,
        productName: prod.name,
        timestamp: new Date(sessionStartTime.getTime() + 90000)
      });
    }

    if (hasConverted) {
      events.push({
        eventType: 'order_completed',
        productId: prod.id,
        productName: prod.name,
        orderNumber: `DLC-${String(76600 + i)}`,
        timestamp: new Date(sessionStartTime.getTime() + 140000)
      });
    }

    demoSessions.push({
      sessionId,
      visitorId,
      deviceType,
      userAgent: deviceType === 'mobile' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' : (deviceType === 'tablet' ? 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
      page: hasConverted ? '/checkout.html' : (hasBuyNow ? '/checkout.html' : (hasAddToCart ? '/cart.html' : '/')),
      referrer: i % 3 === 0 ? 'https://facebook.com/' : (i % 5 === 0 ? 'https://instagram.com/' : 'direct'),
      screenTimeSeconds,
      events,
      hasAddToCart,
      hasBuyNow,
      hasConverted,
      orderNumber: hasConverted ? `DLC-${String(76600 + i)}` : undefined,
      startTime: sessionStartTime,
      lastActive: new Date(sessionStartTime.getTime() + screenTimeSeconds * 1000),
      createdAt: sessionStartTime,
      updatedAt: new Date(sessionStartTime.getTime() + screenTimeSeconds * 1000)
    });
  }

  if (isConnected()) {
    try {
      await AnalyticsSession.insertMany(demoSessions);
    } catch (_) {}
  }
  memoryStore.analyticsSessions = demoSessions;
}

/**
 * Format seconds to Human-Readable Duration (e.g. 2m 45s or 48s)
 */
function formatDuration(totalSeconds) {
  const sec = Math.round(totalSeconds || 0);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  if (m < 60) return `${m}m ${remainingSec}s`;
  const h = Math.floor(m / 60);
  const remainingMin = m % 60;
  return `${h}h ${remainingMin}m`;
}

/**
 * Public Track Endpoint (called by storefront beacon/fetch)
 * POST /api/analytics/track
 */
exports.trackEvent = async (req, res) => {
  try {
    const {
      sessionId,
      visitorId,
      deviceType = 'mobile',
      page = '/',
      referrer = '',
      screenTimeSeconds = 0,
      eventType = 'page_view',
      productId,
      productName,
      orderNumber
    } = req.body;

    if (!sessionId || !visitorId) {
      return res.status(400).json({ success: false, error: 'Session ID and Visitor ID required' });
    }

    const validDevice = ['mobile', 'tablet', 'pc'].includes(deviceType) ? deviceType : 'mobile';
    const now = new Date();

    const eventObj = {
      eventType,
      productId: productId || undefined,
      productName: productName || undefined,
      orderNumber: orderNumber || undefined,
      timestamp: now
    };

    if (isConnected()) {
      try {
        let session = await AnalyticsSession.findOne({ sessionId });
        if (!session) {
          session = new AnalyticsSession({
            sessionId,
            visitorId,
            deviceType: validDevice,
            userAgent: req.headers['user-agent'] || '',
            page,
            referrer,
            screenTimeSeconds: Number(screenTimeSeconds) || 0,
            events: [eventObj],
            hasAddToCart: eventType === 'add_to_cart',
            hasBuyNow: eventType === 'buy_now',
            hasConverted: eventType === 'order_completed',
            orderNumber: orderNumber || undefined,
            startTime: now,
            lastActive: now
          });
          await session.save();
        } else {
          session.screenTimeSeconds = Math.max(session.screenTimeSeconds, Number(screenTimeSeconds) || 0);
          session.lastActive = now;
          if (page) session.page = page;
          if (eventType === 'add_to_cart') session.hasAddToCart = true;
          if (eventType === 'buy_now') session.hasBuyNow = true;
          if (eventType === 'order_completed') {
            session.hasConverted = true;
            if (orderNumber) session.orderNumber = orderNumber;
          }
          session.events.push(eventObj);
          await session.save();
        }
      } catch (e) {
        console.error('[Analytics Mongo Error]', e.message);
      }
    }

    // In-Memory store update
    if (!memoryStore.analyticsSessions) memoryStore.analyticsSessions = [];
    const memIndex = memoryStore.analyticsSessions.findIndex(s => s.sessionId === sessionId);
    if (memIndex === -1) {
      memoryStore.analyticsSessions.push({
        sessionId,
        visitorId,
        deviceType: validDevice,
        page,
        referrer,
        screenTimeSeconds: Number(screenTimeSeconds) || 0,
        events: [eventObj],
        hasAddToCart: eventType === 'add_to_cart',
        hasBuyNow: eventType === 'buy_now',
        hasConverted: eventType === 'order_completed',
        orderNumber: orderNumber || undefined,
        startTime: now,
        lastActive: now,
        createdAt: now
      });
    } else {
      const s = memoryStore.analyticsSessions[memIndex];
      s.screenTimeSeconds = Math.max(s.screenTimeSeconds, Number(screenTimeSeconds) || 0);
      s.lastActive = now;
      if (page) s.page = page;
      if (eventType === 'add_to_cart') s.hasAddToCart = true;
      if (eventType === 'buy_now') s.hasBuyNow = true;
      if (eventType === 'order_completed') {
        s.hasConverted = true;
        if (orderNumber) s.orderNumber = orderNumber;
      }
      s.events.push(eventObj);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Analytics Track Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Admin Get Analytics Stats
 * GET /api/admin/analytics?range=24h|7d|30d|1y|lifetime
 */
exports.getStats = async (req, res) => {
  try {
    await ensureSeedData();

    const range = req.query.range || '24h';
    const now = Date.now();
    let sinceTime = 0;

    switch (range) {
      case '24h':
        sinceTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        sinceTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        sinceTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '1y':
        sinceTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case 'lifetime':
      default:
        sinceTime = 0;
        break;
    }

    const sinceDate = new Date(sinceTime);
    let sessions = [];

    if (isConnected()) {
      try {
        const query = sinceTime > 0 ? { createdAt: { $gte: sinceDate } } : {};
        sessions = await AnalyticsSession.find(query).sort({ createdAt: -1 }).lean();
      } catch (_) {
        sessions = memoryStore.analyticsSessions || [];
      }
    } else {
      sessions = memoryStore.analyticsSessions || [];
    }

    if (sinceTime > 0) {
      sessions = sessions.filter(s => new Date(s.createdAt || s.startTime).getTime() >= sinceTime);
    }

    // Metric 1: Unique Visitors and Sessions
    const visitorSet = new Set();
    let totalSessions = sessions.length;
    let totalScreenTimeSeconds = 0;

    // Metric 2: Device Counts and Screen Time per Device
    const devices = {
      mobile: { count: 0, screenTime: 0 },
      tablet: { count: 0, screenTime: 0 },
      pc: { count: 0, screenTime: 0 }
    };

    // Metric 3: Funnel metrics
    let addToCartSessions = 0;
    let buyNowSessions = 0;
    let orderCompletedSessions = 0;

    sessions.forEach(s => {
      visitorSet.add(s.visitorId);
      const st = Number(s.screenTimeSeconds) || 0;
      totalScreenTimeSeconds += st;

      const dev = (s.deviceType && devices[s.deviceType]) ? s.deviceType : 'mobile';
      devices[dev].count += 1;
      devices[dev].screenTime += st;

      if (s.hasAddToCart) addToCartSessions += 1;
      if (s.hasBuyNow) buyNowSessions += 1;
      if (s.hasConverted) orderCompletedSessions += 1;
    });

    const uniqueVisitors = visitorSet.size;

    // Calculate Device Percentages and Averages
    const deviceBreakdown = {
      mobile: {
        count: devices.mobile.count,
        percentage: totalSessions > 0 ? Number(((devices.mobile.count / totalSessions) * 100).toFixed(1)) : 0,
        avgScreenTimeSec: devices.mobile.count > 0 ? Math.round(devices.mobile.screenTime / devices.mobile.count) : 0,
        avgScreenTimeFormatted: formatDuration(devices.mobile.count > 0 ? devices.mobile.screenTime / devices.mobile.count : 0)
      },
      tablet: {
        count: devices.tablet.count,
        percentage: totalSessions > 0 ? Number(((devices.tablet.count / totalSessions) * 100).toFixed(1)) : 0,
        avgScreenTimeSec: devices.tablet.count > 0 ? Math.round(devices.tablet.screenTime / devices.tablet.count) : 0,
        avgScreenTimeFormatted: formatDuration(devices.tablet.count > 0 ? devices.tablet.screenTime / devices.tablet.count : 0)
      },
      pc: {
        count: devices.pc.count,
        percentage: totalSessions > 0 ? Number(((devices.pc.count / totalSessions) * 100).toFixed(1)) : 0,
        avgScreenTimeSec: devices.pc.count > 0 ? Math.round(devices.pc.screenTime / devices.pc.count) : 0,
        avgScreenTimeFormatted: formatDuration(devices.pc.count > 0 ? devices.pc.screenTime / devices.pc.count : 0)
      }
    };

    // Screen Time Metrics
    const avgScreenTimeSec = totalSessions > 0 ? Math.round(totalScreenTimeSeconds / totalSessions) : 0;
    const avgScreenTimeFormatted = formatDuration(avgScreenTimeSec);
    const totalScreenTimeFormatted = formatDuration(totalScreenTimeSeconds);

    // Funnel Conversions
    const cartToBuyNowRate = addToCartSessions > 0 
      ? Number(((buyNowSessions / addToCartSessions) * 100).toFixed(1)) 
      : 0;

    const buyNowToOrderRate = buyNowSessions > 0
      ? Number(((orderCompletedSessions / buyNowSessions) * 100).toFixed(1))
      : 0;

    const overallConversionRate = uniqueVisitors > 0
      ? Number(((orderCompletedSessions / uniqueVisitors) * 100).toFixed(1))
      : 0;

    // Recent 12 active sessions for the inspection table
    const recentSessions = sessions.slice(0, 12).map(s => ({
      sessionId: s.sessionId,
      visitorId: s.visitorId,
      deviceType: s.deviceType || 'mobile',
      page: s.page || '/',
      referrer: s.referrer || 'Direct',
      screenTimeSeconds: s.screenTimeSeconds || 0,
      screenTimeFormatted: formatDuration(s.screenTimeSeconds || 0),
      hasAddToCart: !!s.hasAddToCart,
      hasBuyNow: !!s.hasBuyNow,
      hasConverted: !!s.hasConverted,
      orderNumber: s.orderNumber || null,
      createdAt: s.createdAt || s.startTime
    }));

    res.json({
      success: true,
      range,
      summary: {
        uniqueVisitors,
        totalSessions,
        totalScreenTimeSeconds,
        totalScreenTimeFormatted,
        avgScreenTimeSec,
        avgScreenTimeFormatted,
        addToCartSessions,
        buyNowSessions,
        orderCompletedSessions,
        cartToBuyNowRate,
        buyNowToOrderRate,
        overallConversionRate
      },
      deviceBreakdown,
      recentSessions
    });
  } catch (err) {
    console.error('[Analytics GetStats Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
