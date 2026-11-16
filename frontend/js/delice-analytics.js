/**
 * DÉLICE — Customer & Visitor Analytics Client Tracker
 * Lightweight, zero-dependency, privacy-respecting analytics tracker.
 * Tracks visits, device type (mobile/tablet/pc), screen time, add to cart, and buy now conversions.
 */
(function () {
  'use strict';

  // 1. Identify Device Type
  function getDeviceType() {
    const width = window.innerWidth;
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(ua) || (width >= 768 && width <= 1024)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua) || width < 768) {
      return 'mobile';
    }
    return 'pc';
  }

  // 2. Identify or Generate Visitor ID (Persists in localStorage)
  function getVisitorId() {
    let vid = localStorage.getItem('delice_vid');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      try {
        localStorage.setItem('delice_vid', vid);
      } catch (_) {}
    }
    return vid;
  }

  // 3. Identify or Generate Session ID (Persists per browser tab session)
  function getSessionId() {
    let sid = sessionStorage.getItem('delice_sid');
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      try {
        sessionStorage.setItem('delice_sid', sid);
      } catch (_) {}
    }
    return sid;
  }

  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const deviceType = getDeviceType();

  // 4. Screen Time / Active Time Tracking
  let screenTimeSeconds = 0;
  let isActive = true;
  let lastActiveTimestamp = Date.now();

  function tick() {
    if (document.visibilityState === 'visible' && isActive) {
      screenTimeSeconds += 1;
    }
  }

  const timerInterval = setInterval(tick, 1000);

  // User activity listeners to pause timer on idle
  let idleTimer;
  function resetIdle() {
    isActive = true;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      isActive = false;
    }, 45000); // 45 seconds inactivity pauses screen time
  }
  ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(evt => {
    window.addEventListener(evt, resetIdle, { passive: true });
  });

  // 5. Send Analytics Payload to Server
  function sendPayload(eventType = 'page_view', metadata = {}) {
    const payload = {
      sessionId,
      visitorId,
      deviceType,
      page: window.location.pathname + window.location.search,
      referrer: document.referrer || '',
      screenTimeSeconds,
      eventType,
      productId: metadata.productId || undefined,
      productName: metadata.productName || undefined,
      orderNumber: metadata.orderNumber || undefined
    };

    const endpoint = '/api/analytics/track';

    // Prefer navigator.sendBeacon for fast, unblocked background dispatch
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const success = navigator.sendBeacon(endpoint, blob);
      if (success) return;
    }

    // Fallback to fetch
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }

  // Send initial pageview
  sendPayload('page_view');

  // Periodic heartbeat every 20 seconds to update active screen time
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      sendPayload('heartbeat');
    }
  }, 20000);

  // Send latest screen time on page unload / visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendPayload('screen_time_ping');
    }
  });
  window.addEventListener('pagehide', () => {
    sendPayload('screen_time_ping');
  });

  // 6. Global Event Listeners for Add to Cart and Buy Now
  document.addEventListener('click', (e) => {
    // Check for Add to Cart button
    const cartBtn = e.target.closest('.btn-add-cart, .btn-add-cart-detail, .mood-match-btn-cart, [data-add-to-cart]');
    if (cartBtn) {
      const pId = cartBtn.getAttribute('data-add-to-cart') || cartBtn.dataset.productId || 'delice-fragrance';
      sendPayload('add_to_cart', { productId: pId });
    }

    // Check for Buy Now button
    const buyBtn = e.target.closest('.btn-buy-now, .mood-match-btn-buy, a[href*="checkout.html?buyNow="]');
    if (buyBtn) {
      const pId = (buyBtn.getAttribute('href') || '').split('buyNow=')[1] || 'delice-fragrance';
      sendPayload('buy_now', { productId: pId });
    }
  });

  // Automatic Check for Checkout Page (User initiating buy now flow)
  if (window.location.pathname.includes('checkout')) {
    sendPayload('buy_now', { note: 'Checkout page visited' });
  }

  // Automatic Check for Order Confirmation (payment-success.html)
  if (window.location.pathname.includes('payment-success')) {
    const params = new URLSearchParams(window.location.search);
    const orderNum = params.get('order') || params.get('orderId') || 'CONFIRMED';
    sendPayload('order_completed', { orderNumber: orderNum });
  }

  // Expose global tracker
  window.deliceAnalytics = {
    track: sendPayload,
    getSession: () => ({ sessionId, visitorId, deviceType, screenTimeSeconds })
  };
})();
