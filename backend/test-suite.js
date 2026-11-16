/**
 * DÉLICE End-to-End Automated Test Suite
 * Verifies API endpoints, order lifecycle, server-side pricing calculation,
 * bKash / Nagad Send Money order processing, and receipt verification.
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('./server');

const PORT = 5555;
let server;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        let parsed = rawData;
        try {
          parsed = JSON.parse(rawData);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting DÉLICE End-to-End Verification ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  server = app.listen(PORT, async () => {
    try {
      // TEST 1: Public Products Endpoint
      const prodRes = await request('GET', '/api/products');
      assert(prodRes.statusCode === 200, 'GET /api/products returns HTTP 200');
      assert(Array.isArray(prodRes.data) && prodRes.data.length >= 3, 'Returns at least 3 products');
      
      const bloom = prodRes.data.find(p => p.id === 'delice-bloom');
      assert(bloom && bloom.price === 799 && bloom.originalPrice === 850, 'DÉLICE BLOOM opening offer is ৳799, regular ৳850');
      assert(bloom.volume === '30ml', 'DÉLICE BLOOM volume is 30ml');

      // TEST 2: Public Settings
      const setRes = await request('GET', '/api/settings/public');
      assert(setRes.statusCode === 200, 'GET /api/settings/public returns HTTP 200');
      assert(setRes.data.deliveryChargeInsideDhaka === 60, 'Delivery inside Dhaka is ৳60');
      assert(setRes.data.deliveryChargeOutsideDhaka === 120, 'Delivery outside Dhaka is ৳120');
      assert(setRes.data.bkashNagadNumber === '01731101780', 'bKash/Nagad number is 01731101780');

      // TEST 3: Validation on Order Placement (Invalid Phone Number)
      const invalidCheckout = await request('POST', '/api/orders', {
        customer: {
          fullName: 'Test User',
          phone: '12345', // Invalid phone
          district: 'Dhaka',
          address: 'Road 5, Dhanmondi'
        },
        deliveryArea: 'insideDhaka',
        paymentMethod: 'full_online',
        paymentProvider: 'bkash',
        senderNumber: '01711223344',
        transactionId: 'TESTTRX001',
        items: [{ id: 'delice-bloom', quantity: 1 }]
      });
      assert(invalidCheckout.statusCode === 400, 'Rejects invalid phone number with HTTP 400');

      // TEST 4: Successful Order Placement via bKash Send Money (No TrxID required, auto-generated)
      // Customer tries to tamper with price in request (client sends ৳100 instead of ৳799)
      const validCheckout = await request('POST', '/api/orders', {
        customer: {
          fullName: 'Samiul Karim',
          phone: '01712345678',
          email: 'samiul@test.com',
          district: 'Dhaka',
          address: 'Apartment 4B, House 12, Banani, Dhaka'
        },
        deliveryArea: 'insideDhaka',
        paymentMethod: 'full_online',
        paymentProvider: 'bkash',
        senderNumber: '01712345678',
        // No transactionId sent - storefront removes TrxID
        items: [{ id: 'delice-bloom', quantity: 2, price: 100 }] // Price tampering test
      });

      assert(validCheckout.statusCode === 201, 'Valid order placement returns HTTP 201');
      assert(validCheckout.data.success === true, 'Order placement returns success: true');
      // Subtotal should be 799 * 2 = 1598, Delivery = 60, Total = 1658 (ignoring the tampered 100!)
      assert(validCheckout.data.order.totalPayable === 1658, `Server-side price verification enforced: ৳1658 (received ${validCheckout.data.order.totalPayable})`);
      assert(Boolean(validCheckout.data.order.transactionId), `Auto-generated Transaction Reference saved: ${validCheckout.data.order.transactionId}`);

      const savedOrderNumber = validCheckout.data.order.orderNumber;
      const savedTranId = validCheckout.data.order.transactionId;

      // TEST 5: Public Receipt Retrieval by Order Number or Transaction Reference
      const receiptRes = await request('GET', `/api/orders/by-transaction/${savedOrderNumber}`);
      assert(receiptRes.statusCode === 200, 'Receipt accessible by Order Number');
      assert(receiptRes.data.orderNumber === savedOrderNumber, 'Receipt matches order number');
      assert(receiptRes.data.paymentStatus === 'awaiting_verification', 'Order status set to awaiting_verification');

      // TEST 6: Smooth Outside-Dhaka Courier Delivery (Zero Rejections for Non-Dhaka Districts)
      const outsideDhakaOrder = await request('POST', '/api/orders', {
        customer: {
          fullName: 'Chittagong Customer',
          phone: '01812345678',
          district: 'Chattogram',
          address: 'Near BRAC bank branch, GEC Circle'
        },
        deliveryArea: 'outsideDhaka',
        deliveryHub: '',
        paymentMethod: 'full_online',
        paymentProvider: 'nagad',
        senderNumber: '01812345678',
        items: [{ id: 'delice-bloom', quantity: 1 }]
      });
      assert(outsideDhakaOrder.statusCode === 201, 'Outside Dhaka customer order succeeds with HTTP 201 (no 400 rejection)');
      assert(outsideDhakaOrder.data.order.deliveryCharge === 120, 'Outside Dhaka delivery charge is correctly ৳120');
      assert(outsideDhakaOrder.data.order.deliveryHub === '', 'Campus Hub cleared for non-Dhaka district');

      console.log(`\n--- Verification Summary: ${passCount} Passed, ${failCount} Failed ---`);
      server.close();
      process.exit(failCount === 0 ? 0 : 1);
    } catch (err) {
      console.error('Test execution error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
