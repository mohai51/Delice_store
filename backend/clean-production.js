/**
 * DÉLICE Fragrances — Production Data Clean & Initialization Script
 * Purges all test orders, test profit allocations, test audit logs, and sample expenses.
 * Resets inventory stock to full initial launch capacity.
 */

const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/db');

const Order = require('./models/Order');
const DeliceProfitAllocation = require('./models/DeliceProfitAllocation');
const DeliceProfitAuditLog = require('./models/DeliceProfitAuditLog');
const Expense = require('./models/Expense');
const DeliceFundExpense = require('./models/DeliceFundExpense');
const Product = require('./models/Product');
const deliceProfitService = require('./services/deliceProfitService');

async function cleanProduction() {
  console.log('[Clean] Connecting to MongoDB Atlas...');
  await connectDB();

  console.log('[Clean] Connected successfully. Beginning database cleanup...');

  // 1. Delete all test orders
  const orderRes = await Order.deleteMany({});
  console.log(`[Clean] Deleted ${orderRes.deletedCount} test orders from 'orders' collection.`);

  // 2. Delete all test profit allocations
  const allocRes = await DeliceProfitAllocation.deleteMany({});
  console.log(`[Clean] Deleted ${allocRes.deletedCount} test profit allocations from 'deliceprofitallocations'.`);

  // 3. Delete all test profit audit logs
  const auditRes = await DeliceProfitAuditLog.deleteMany({});
  console.log(`[Clean] Deleted ${auditRes.deletedCount} test audit logs from 'deliceprofitauditlogs'.`);

  // 4. Delete all sample/test expenses
  const expRes = await Expense.deleteMany({});
  console.log(`[Clean] Deleted ${expRes.deletedCount} test expenses from 'expenses'.`);

  const fundExpRes = await DeliceFundExpense.deleteMany({});
  console.log(`[Clean] Deleted ${fundExpRes.deletedCount} test fund expenses from 'delicefundexpenses'.`);

  // 5. Restore Product Inventory to pristine launch stock
  await Product.updateOne({ id: 'delice-bloom' }, { $set: { stock: 120 } });
  await Product.updateOne({ id: 'delice-momentum' }, { $set: { stock: 100 } });
  await Product.updateOne({ id: 'delice-enigma' }, { $set: { stock: 90 } });
  console.log('[Clean] Restored official stock: DÉLICE BLOOM=120, DÉLICE MOMENTUM=100, DÉLICE ENIGMA=90.');

  // 6. Verify Financial Recovery Model status
  const data = await deliceProfitService.getDashboardData();
  const summary = data.summary;
  console.log('\n[Production Verification Summary]:');
  console.log(` - Total Orders: ${await Order.countDocuments()}`);
  console.log(` - Total Bottles Sold: ${summary.totalBottlesSold}`);
  console.log(` - Total Sales Revenue: ৳${summary.totalSalesRevenue}`);
  console.log(` - Total Principal Repaid: ৳${summary.totalPrincipalRepaid}`);
  console.log(` - Outstanding Principal: ৳${summary.outstandingPrincipal}`);
  console.log(` - Distributable Profit: ৳${summary.totalDistributableProfit}`);
  console.log(` - Total Expenses: ${await Expense.countDocuments()}`);

  console.log('\n[Clean] Database is now 100% clean and production ready!');
  process.exit(0);
}

cleanProduction().catch(err => {
  console.error('[Clean Error]', err);
  process.exit(1);
});
