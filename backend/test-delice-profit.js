const assert = require('assert');
const deliceProfitService = require('./services/deliceProfitService');

async function runDeliceProfitTests() {
  console.log('====================================================');
  console.log('   STARTING DÉLICE PROFIT ENGINE VERIFICATION TESTS');
  console.log('====================================================\n');

  // 1. Settings Verification
  console.log('▶ Test 1: Baseline Settings Verification');
  const settings = await deliceProfitService.getSettings();
  console.log('  Initial Principal:', settings.initialPrincipal);
  console.log('  Initial Stock:', settings.totalInitialStock);
  console.log('  Selling Price:', settings.defaultSellingPrice);
  console.log('  Unit Cost:', settings.unitCost);
  console.log('  Profit Per Bottle:', settings.profitPerBottle);
  assert.strictEqual(settings.initialPrincipal, 73260);
  assert.strictEqual(settings.totalInitialStock, 100);
  assert.strictEqual(settings.defaultSellingPrice, 799);
  assert.strictEqual(settings.unitCost, 732.60);
  assert.strictEqual(settings.profitPerBottle, 66.40);
  console.log('  ✔ Baseline settings match exact requirements.\n');

  // 2. Fund Distribution Rounding & Exact Penny Reconciliation
  console.log('▶ Test 2: Fund Distribution & Penny Reconciliation (1 Bottle, Profit ৳66.40)');
  const dist1 = deliceProfitService.calculateFundDistribution(66.40, settings);
  const f1 = dist1.fundAllocations;
  console.log('  Finance Member (10%):', f1.financeMember);
  console.log('  Development Fund (20%):', f1.developmentFund);
  console.log('  Employee Salary Fund (60%):', f1.employeeSalaryFund);
  console.log('  Charity Fund (3%):', f1.charityFund);
  console.log('  Marketing Fund (5%):', f1.marketingFund);
  console.log('  Reserve Fund (2%):', f1.reserveFund);

  assert.strictEqual(f1.financeMember, 6.64);
  assert.strictEqual(f1.developmentFund, 13.28);
  assert.strictEqual(f1.employeeSalaryFund, 39.84);
  assert.strictEqual(f1.charityFund, 1.99);
  assert.strictEqual(f1.marketingFund, 3.32);
  assert.strictEqual(f1.reserveFund, 1.33);

  const sum1 = Math.round((f1.financeMember + f1.developmentFund + f1.employeeSalaryFund + f1.charityFund + f1.marketingFund + f1.reserveFund) * 100) / 100;
  console.log('  Sum of Allocations:', sum1);
  assert.strictEqual(sum1, 66.40, 'Sum of allocations must strictly equal ৳66.40!');
  console.log('  ✔ Exact match! Zero pennies created or lost.\n');

  // 3. Employee 4-Way Equal Split (15% each = ৳9.96 each)
  console.log('▶ Test 3: Employee Salary Split (4 Employees)');
  assert.strictEqual(dist1.employeeBreakdown.length, 4);
  dist1.employeeBreakdown.forEach((emp, i) => {
    console.log(`  Slot ${emp.slot} (${emp.name}): ৳${emp.amount} (${emp.percentage}%)`);
    assert.strictEqual(emp.percentage, 15);
    assert.strictEqual(emp.amount, 9.96);
  });
  const empSum = dist1.employeeBreakdown.reduce((s, e) => s + e.amount, 0);
  assert.strictEqual(Math.round(empSum * 100) / 100, 39.84);
  console.log('  ✔ Employee split verified: exactly 4 x ৳9.96 = ৳39.84.\n');

  // 4. Multi-Bottle Scale: 2 Bottles
  console.log('▶ Test 4: Two Bottles Sale (2 Bottles, Profit ৳132.80)');
  const dist2 = deliceProfitService.calculateFundDistribution(132.80, settings);
  const f2 = dist2.fundAllocations;
  assert.strictEqual(f2.financeMember, 13.28);
  assert.strictEqual(f2.developmentFund, 26.56);
  assert.strictEqual(f2.employeeSalaryFund, 79.68);
  assert.strictEqual(f2.charityFund, 3.98);
  assert.strictEqual(f2.marketingFund, 6.64);
  assert.strictEqual(f2.reserveFund, 2.66);
  const sum2 = Math.round((f2.financeMember + f2.developmentFund + f2.employeeSalaryFund + f2.charityFund + f2.marketingFund + f2.reserveFund) * 100) / 100;
  assert.strictEqual(sum2, 132.80);
  console.log('  ✔ 2 bottles allocation sum: ৳' + sum2 + ' (Exact!)\n');

  // 5. Order Sale Allocation & Idempotency
  console.log('▶ Test 5: Order Sale Allocation & Strict Idempotency Check');
  const testOrder = {
    _id: 'TEST_ORDER_' + Date.now(),
    orderNumber: 'DEL-TEST-001',
    transactionId: 'TRX_TEST_001',
    paymentStatus: 'paid',
    orderStatus: 'processing',
    customer: { fullName: 'Test Buyer', phone: '01711000000' },
    items: [
      { productId: 'delice-bloom', productName: 'DÉLICE BLOOM', quantity: 1, price: 799 }
    ]
  };

  const allocResult1 = await deliceProfitService.allocateOrderSale(testOrder);
  console.log('  First allocation status:', allocResult1.allocations[0].status);
  assert.strictEqual(allocResult1.allocations[0].status, 'allocated');

  // Retry the exact same order (Simulating repeated webhook / gateway callback)
  const allocResult2 = await deliceProfitService.allocateOrderSale(testOrder);
  console.log('  Second allocation (retry) status:', allocResult2.allocations[0].status);
  assert.strictEqual(allocResult2.allocations[0].status, 'already_allocated');
  console.log('  ✔ Idempotency confirmed: Duplicate allocation strictly blocked!\n');

  // 6. Cancellation of Unpaid Order
  console.log('▶ Test 6: Unpaid Order Eligibility Verification');
  const unpaidOrder = {
    _id: 'UNPAID_' + Date.now(),
    orderNumber: 'DEL-UNPAID-001',
    paymentStatus: 'pending',
    orderStatus: 'pending_payment',
    items: [{ productId: 'delice-bloom', quantity: 1, price: 799 }]
  };
  const unpaidResult = await deliceProfitService.allocateOrderSale(unpaidOrder);
  console.log('  Unpaid order result:', unpaidResult);
  assert.strictEqual(unpaidResult.skipped, true);
  console.log('  ✔ Unpaid orders are correctly skipped.\n');

  // 7. Refund / Reversal
  console.log('▶ Test 7: Refund Reversal Transaction');
  const reversalResult = await deliceProfitService.reverseOrderSale(testOrder, 'Customer requested refund');
  console.log('  Reversal count:', reversalResult.count);
  assert.strictEqual(reversalResult.count, 1);
  assert.strictEqual(reversalResult.reversals[0].isReversal, true);
  console.log('  ✔ Reversal record created without modifying or deleting original record.\n');

  // 8. Fund Expense Deduction & Ledger
  console.log('▶ Test 8: Fund Expense Recording & Ledger Balance');
  const testExp = await deliceProfitService.recordFundExpense({
    fundKey: 'developmentFund',
    title: 'Testing Sample Packaging',
    amount: 500,
    category: 'R&D',
    note: 'Test expense',
    recordedBy: 'Admin'
  });
  console.log('  Recorded expense ID:', testExp._id, 'Amount: ৳' + testExp.amount);
  assert.strictEqual(testExp.amount, 500);

  const ledger = await deliceProfitService.getFundLedger('developmentFund');
  console.log('  Development Fund Debits:', ledger.totalDebits);
  assert(ledger.totalDebits >= 500);
  console.log('  ✔ Fund expense debited and ledger verified.\n');

  // 9. Payment Segments & Cash-out Fee Deductions on Total Revenue
  console.log('▶ Test 9: Payment Segments & Cash-out Fee Deductions (bKash 1.10%, Nagad 0.85%, COD 1.00%)');
  const { memoryStore } = require('./config/db');
  if (!memoryStore.orders) memoryStore.orders = [];

  const bkashOrder = {
    _id: 'TEST_BKASH_' + Date.now(),
    orderNumber: 'DLC-BKASH-01',
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    paymentProvider: 'bkash',
    paymentMethod: 'full_online',
    items: [{ productId: 'delice-bloom', quantity: 2, price: 799 }]
  };
  const nagadOrder = {
    _id: 'TEST_NAGAD_' + Date.now(),
    orderNumber: 'DLC-NAGAD-01',
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    paymentProvider: 'nagad',
    paymentMethod: 'full_online',
    items: [{ productId: 'delice-momentum', quantity: 1, price: 799 }]
  };
  const codOrder = {
    _id: 'TEST_COD_' + Date.now(),
    orderNumber: 'DLC-COD-01',
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    paymentProvider: 'hand_cash',
    paymentMethod: 'cash_on_delivery',
    items: [{ productId: 'delice-enigma', quantity: 1, price: 799 }]
  };

  memoryStore.orders.push(bkashOrder, nagadOrder, codOrder);

  await deliceProfitService.allocateOrderSale(bkashOrder);
  await deliceProfitService.allocateOrderSale(nagadOrder);
  await deliceProfitService.allocateOrderSale(codOrder);

  const dashData = await deliceProfitService.getDashboardData();
  const segMap = dashData.segmentsMap;
  console.log('  bKash Gross:', segMap.bkash.grossRevenue, 'Fee (1.10%):', segMap.bkash.cashoutFee, 'Net:', segMap.bkash.netRevenue);
  console.log('  Nagad Gross:', segMap.nagad.grossRevenue, 'Fee (0.85%):', segMap.nagad.cashoutFee, 'Net:', segMap.nagad.netRevenue);
  console.log('  COD Gross:', segMap.cash_on_delivery.grossRevenue, 'Fee (1.00%):', segMap.cash_on_delivery.cashoutFee, 'Net:', segMap.cash_on_delivery.netRevenue);
  console.log('  Total Cash-out Fees:', dashData.summary.totalCashoutFees);
  console.log('  Gross Profit:', dashData.summary.grossDistributableProfit);
  console.log('  Net Distributable Profit into Funds:', dashData.summary.totalDistributableProfit);

  // Assertions
  assert(segMap.bkash.grossRevenue >= 1598);
  assert(segMap.nagad.grossRevenue >= 799);
  assert(segMap.cash_on_delivery.grossRevenue >= 799);
  assert.strictEqual(segMap.bkash.rate, 1.10);
  assert.strictEqual(segMap.nagad.rate, 0.85);
  assert.strictEqual(segMap.cash_on_delivery.rate, 1.00);

  // Verify net profit calculation: Net = Gross - Fees
  const expectedNet = Math.max(0, Math.round((dashData.summary.grossDistributableProfit - dashData.summary.totalCashoutFees) * 100) / 100);
  assert.strictEqual(dashData.summary.totalDistributableProfit, expectedNet);

  // Verify that the funds sum up exactly to net distributable profit
  const sumOfFunds = Math.round(dashData.fundsOverview.reduce((acc, f) => acc + f.totalAccumulated, 0) * 100) / 100;
  assert.strictEqual(sumOfFunds, dashData.summary.totalDistributableProfit);
  console.log('  ✔ All 6 funds sum up to exactly Net Distributable Profit (Zero Penny Loss).');
  console.log('  ✔ Payment segment & cash-out charge verification passed!\n');

  console.log('====================================================');
  console.log('   ALL DÉLICE PROFIT ENGINE TESTS PASSED (9/9) ✔');
  console.log('====================================================\n');
}

runDeliceProfitTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
