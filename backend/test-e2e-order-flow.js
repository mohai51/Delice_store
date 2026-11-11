const assert = require('assert');

async function testE2EOrderFlow() {
  console.log('===============================================================');
  console.log('  TESTING COMPLETE END-TO-END STOREFRONT -> PROFIT ALLOCATION');
  console.log('===============================================================\n');

  // 1. Admin Login
  console.log('Step 1: Admin Login');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@Delice2026' })
  });
  const loginData = await loginRes.json();
  assert(loginData.token, 'Login failed');
  const token = loginData.token;
  console.log('✔ Admin authenticated successfully.\n');

  // 2. Fetch Initial Profit Dashboard
  console.log('Step 2: Fetch Initial Profit Baseline');
  const initialRes = await fetch('http://localhost:5000/api/admin/delice-profit/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const initialData = await initialRes.json();
  const baseRepaid = initialData.data.summary.totalPrincipalRepaid;
  const baseProfit = initialData.data.summary.totalDistributableProfit;
  const baseBottles = initialData.data.summary.totalBottlesSold;
  console.log(`  Initial Bottles: ${baseBottles}, Repaid: ৳${baseRepaid}, Profit: ৳${baseProfit}`);
  console.log('✔ Baseline captured.\n');

  // 3. Customer Places Order for 2 Bottles
  console.log('Step 3: Customer Places Order on Storefront for 2 Bottles');
  const orderPayload = {
    customer: {
      fullName: 'Tahmid Chowdhury',
      phone: '01712345678',
      district: 'Dhaka',
      address: 'House 42, Road 11, Banani, Dhaka'
    },
    deliveryArea: 'insideDhaka',
    items: [
      { id: 'delice-bloom', name: 'DÉLICE BLOOM', quantity: 2, price: 799 }
    ],
    paymentMethod: 'full_online',
    paymentProvider: 'bkash',
    senderNumber: '01712345678',
    transactionId: 'BK' + Date.now().toString().slice(-8)
  };

  const createRes = await fetch('http://localhost:5000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  const createData = await createRes.json();
  assert(createData.success, 'Order creation failed');
  const orderNumber = createData.order.orderNumber;
  console.log(`  Created Order #${orderNumber} for ৳${createData.order.totalPayable} (2 bottles + delivery)`);
  console.log('✔ Order placed successfully.\n');

  // 4. Find the order ID
  const ordersListRes = await fetch(`http://localhost:5000/api/orders?search=${orderNumber}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const ordersListData = await ordersListRes.json();
  const orderRecord = ordersListData.orders.find(o => o.orderNumber === orderNumber);
  assert(orderRecord, 'Created order not found in list');
  const orderId = orderRecord._id;

  // 5. Admin Verifies Payment (Marks as Paid)
  console.log('Step 4: Admin Confirms Payment & Marks Order as Paid');
  const updateRes = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      orderStatus: 'delivered',
      paymentStatus: 'paid'
    })
  });
  const updateData = await updateRes.json();
  assert(updateData.success, 'Status update failed');
  console.log('✔ Order marked as Paid & Delivered.\n');

  // 6. Verify Automatic Profit Calculation & Allocation
  console.log('Step 5: Verify Automatic Profit Engine Allocation');
  const postRes = await fetch('http://localhost:5000/api/admin/delice-profit/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const postData = await postRes.json();
  const newSummary = postData.data.summary;
  console.log(`  New Bottles Sold: ${newSummary.totalBottlesSold} (+${newSummary.totalBottlesSold - baseBottles})`);
  console.log(`  New Principal Repaid: ৳${newSummary.totalPrincipalRepaid} (+৳${(newSummary.totalPrincipalRepaid - baseRepaid).toFixed(2)})`);
  console.log(`  New Distributable Profit: ৳${newSummary.totalDistributableProfit} (+৳${(newSummary.totalDistributableProfit - baseProfit).toFixed(2)})`);
  console.log(`  New Repayment Progress: ${newSummary.repaymentProgress}%`);

  assert.strictEqual(newSummary.totalBottlesSold - baseBottles, 2, 'Should have added exactly 2 bottles');
  assert.strictEqual(Math.round((newSummary.totalPrincipalRepaid - baseRepaid) * 100) / 100, 1465.20, 'Principal repaid should be exactly ৳1,465.20');
  assert.strictEqual(Math.round((newSummary.totalDistributableProfit - baseProfit) * 100) / 100, 132.80, 'Distributable profit should be exactly ৳132.80');
  console.log('✔ Profit calculation matches exact formula: 2 × ৳732.60 = ৳1,465.20 repaid, 2 × ৳66.40 = ৳132.80 profit!\n');

  // 7. Verify Idempotency: Repeating update does NOT double allocate
  console.log('Step 6: Verify Idempotency on Repeated Status Update');
  await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ orderStatus: 'delivered', paymentStatus: 'paid' })
  });

  const retryRes = await fetch('http://localhost:5000/api/admin/delice-profit/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const retryData = await retryRes.json();
  assert.strictEqual(retryData.data.summary.totalBottlesSold, newSummary.totalBottlesSold, 'Bottles must not increase on retry');
  assert.strictEqual(retryData.data.summary.totalPrincipalRepaid, newSummary.totalPrincipalRepaid, 'Principal must not increase on retry');
  console.log('✔ Idempotency confirmed: repeated updates strictly preserve exact balances!\n');

  // 8. Verify Overview Connection
  console.log('Step 7: Verify Executive Overview API Sync');
  const ovRes = await fetch('http://localhost:5000/api/admin/overview', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const ovData = await ovRes.json();
  assert(ovData.deliceProfit, 'Overview must include deliceProfit data');
  console.log('  Overview Delice Profit Progress:', ovData.deliceProfit.summary.repaymentProgress + '%');
  console.log('✔ Executive Overview is 100% connected with Profit Engine.\n');

  console.log('===============================================================');
  console.log('  END-TO-END FLOW VERIFICATION COMPLETE & 100% SUCCESSFUL! ✔');
  console.log('===============================================================\n');
}

testE2EOrderFlow().catch(err => {
  console.error('E2E TEST FAILED:', err);
  process.exit(1);
});
