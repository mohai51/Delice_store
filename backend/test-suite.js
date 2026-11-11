/**
 * DÉLICE End-to-End Automated Test Suite
 * Verifies API endpoints, order lifecycle, server-side pricing calculation,
 * SSLCOMMERZ idempotent verification, and financial accounting logic.
 */

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

      // TEST 3: Validation on Checkout (Invalid Phone Number)
      const invalidCheckout = await request('POST', '/api/payment/initiate', {
        customer: {
          fullName: 'Test User',
          phone: '12345', // Invalid phone
          district: 'Dhaka',
          address: 'Road 5, Dhanmondi'
        },
        deliveryArea: 'insideDhaka',
        items: [{ id: 'delice-bloom', quantity: 1 }]
      });
      assert(invalidCheckout.statusCode === 400, 'Rejects invalid phone number with HTTP 400');

      // TEST 4: Successful Order & Payment Session Initiation
      // Customer tries to tamper with price in request (client sends ৳100 instead of ৳799)
      const validCheckout = await request('POST', '/api/payment/initiate', {
        customer: {
          fullName: 'Samiul Karim',
          phone: '01712345678',
          email: 'samiul@test.com',
          district: 'Dhaka',
          address: 'Apartment 4B, House 12, Banani, Dhaka'
        },
        deliveryArea: 'insideDhaka',
        items: [{ id: 'delice-bloom', quantity: 2, price: 100 }] // Price tampering test
      });

      assert(validCheckout.statusCode === 200, 'Valid checkout returns HTTP 200');
      assert(validCheckout.data.success === true, 'Checkout initiation returns success: true');
      // Subtotal should be 799 * 2 = 1598, Delivery = 60, Total = 1658 (ignoring the tampered 100!)
      assert(validCheckout.data.totalPayable === 1658, `Server-side price verification enforced: ৳1658 (received ${validCheckout.data.totalPayable})`);
      assert(validCheckout.data.gatewayUrl && validCheckout.data.gatewayUrl.includes('sandbox-gateway'), 'Redirects to sandbox gateway testbench');

      const testTranId = validCheckout.data.tran_id;
      assert(testTranId && testTranId.startsWith('TRAN_'), `Generated unique transaction ID: ${testTranId}`);

      // TEST 5: Server-Side Payment Success Verification Callback
      const successCallback = await request('POST', '/api/payment/success', {
        val_id: `SANDBOX_VAL_${Date.now()}`,
        tran_id: testTranId,
        amount: 1658,
        card_type: 'bKash-Payment',
        status: 'VALID'
      });
      assert(successCallback.statusCode === 302, 'Successful payment verification redirects (HTTP 302)');
      assert(successCallback.headers.location.includes('/payment-success.html'), 'Redirects customer to payment-success.html');

      // TEST 6: Public Receipt Verification by Transaction ID
      const receiptRes = await request('GET', `/api/orders/by-transaction/${testTranId}`);
      assert(receiptRes.statusCode === 200, 'Receipt accessible by transaction ID');
      assert(receiptRes.data.paymentStatus === 'paid', 'Order payment status verified as PAID');
      assert(receiptRes.data.orderStatus === 'processing', 'Order status moved to processing');
      assert(receiptRes.data.netProfit > 0, `Net profit calculated: ৳${receiptRes.data.netProfit}`);

      // TEST 7: Idempotency Prevention
      // Duplicate payment attempt should not cause error or double counting
      const dupCallback = await request('POST', '/api/payment/success', {
        val_id: `SANDBOX_VAL_${Date.now()}`,
        tran_id: testTranId,
        amount: 1658,
        card_type: 'bKash-Payment',
        status: 'VALID'
      });
      assert(dupCallback.statusCode === 302, 'Idempotent handling redirects cleanly without failure');

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
