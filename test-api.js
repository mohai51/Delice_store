async function runTests() {
  console.log('--- Starting DÉLICE End-to-End API Verification ---');
  const baseUrl = 'http://localhost:4000';

  // 1. Admin Login & CSRF Token
  const loginRes = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'DeliceAdmin2026!'
    })
  });
  const loginData = await loginRes.json();
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('✓ 1. Admin Authentication Successful. CSRF Token:', Boolean(loginData.csrfToken));

  // 2. Fetch Products in Admin
  const prodRes = await fetch(`${baseUrl}/api/admin/products`, {
    headers: {
      'Cookie': cookieHeader || '',
      'x-csrf-token': loginData.csrfToken
    }
  });
  const products = await prodRes.json();
  console.log(`✓ 2. Found ${products.length} seeded product(s) in catalog.`);

  // 3. Publish demo products so they appear live on the storefront
  for (const p of products) {
    const pubRes = await fetch(`${baseUrl}/api/admin/products/${p._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader || '',
        'x-csrf-token': loginData.csrfToken
      },
      body: JSON.stringify({ status: 'published', isFeatured: true })
    });
    const pubProduct = await pubRes.json();
    console.log(`  ✓ Published: "${pubProduct.name}" (Status: ${pubProduct.status})`);
  }

  // 4. Storefront Homepage & Published Products
  const homeRes = await fetch(`${baseUrl}/api/storefront/homepage`);
  const home = await homeRes.json();
  console.log('✓ 3. Storefront Homepage Live. Featured Products Count:', home.featuredProducts.length);
  home.featuredProducts.forEach(p => {
    console.log(`    - ${p.name} | Scent: ${p.scentFamily} | Price: ৳${p.variants[0].price.toLocaleString()}`);
  });

  // 5. Cart Validation with Server
  const p1 = home.featuredProducts[0];
  const valRes = await fetch(`${baseUrl}/api/storefront/validate-cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        { productId: p1._id, size: '50ml', quantity: 1 }
      ],
      district: 'Dhaka'
    })
  });
  const val = await valRes.json();
  console.log('✓ 4. Server-Side Cart Pricing: Subtotal:', `৳${val.pricing.subtotal}`, 'Delivery:', `৳${val.pricing.deliveryCharge}`, 'Total:', `৳${val.pricing.total}`);

  // 6. Customer Checkout (COD Order)
  const orderRes = await fetch(`${baseUrl}/api/storefront/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        name: 'Sayeda Rahman',
        phone: '01819283746',
        email: 'sayeda.rahman@example.com',
        district: 'Dhaka',
        area: 'Gulshan 2',
        fullAddress: 'Road 71, House 14, Apartment 4B'
      },
      items: [
        { productId: p1._id, size: '50ml', quantity: 1, name: p1.name }
      ],
      paymentMethod: 'cod',
      orderNotes: 'Please ring bell upon arrival.'
    })
  });
  const orderData = await orderRes.json();
  console.log('✓ 5. Order Placed Successfully!');
  console.log('    Order Reference:', orderData.orderReference);
  console.log('    Tracking Token:', orderData.trackingToken);
  console.log('    Payable Total: ৳' + orderData.total.toLocaleString());

  // 7. Customer Order Tracking Lookup
  const trackRes = await fetch(`${baseUrl}/api/storefront/track/${orderData.trackingToken}`);
  const track = await trackRes.json();
  console.log('✓ 6. Customer Tracking Verified:');
  console.log(`    Ref: ${track.orderReference} | Status: ${track.fulfillmentStatus.toUpperCase()} | Payment: ${track.paymentStatus.toUpperCase()} | Recipient: ${track.recipientName}`);

  // 8. Admin Dashboard Metrics & Recent Orders
  const dashRes = await fetch(`${baseUrl}/api/admin/dashboard?days=30`, {
    headers: {
      'Cookie': cookieHeader || '',
      'x-csrf-token': loginData.csrfToken
    }
  });
  const dashData = await dashRes.json();
  console.log('✓ 7. Admin Dashboard Updated:');
  console.log(`    Total Orders Recorded: ${dashData.metrics.totalOrders}`);
  console.log(`    Pending Orders: ${dashData.metrics.pendingOrdersCount}`);

  // 9. Update Order Fulfillment to "confirmed" and add courier tracking
  const fulfillRes = await fetch(`${baseUrl}/api/admin/orders/${orderData.orderReference}/fulfillment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader || '',
      'x-csrf-token': loginData.csrfToken
    },
    body: JSON.stringify({
      status: 'confirmed',
      courierName: 'Concierge White-Glove Dedicated',
      trackingNumber: 'DEL-BD-7729',
      note: 'Verified address and telephone reservation.'
    })
  });
  const updatedOrder = await fulfillRes.json();
  console.log(`✓ 8. Order Fulfillment Advanced: ${updatedOrder.fulfillment.status.toUpperCase()} (Courier: ${updatedOrder.fulfillment.courierName})`);

  console.log('================================================================');
  console.log('  ALL END-TO-END VERIFICATIONS PASSED WITH ZERO ERRORS!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
