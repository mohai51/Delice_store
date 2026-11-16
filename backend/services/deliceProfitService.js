/**
 * DÉLICE Profit Calculation & Capital Recovery Engine
 * Pure Server-Side Financial Distribution Architecture
 */

const DeliceProfitSetting = require('../models/DeliceProfitSetting');
const DeliceProfitAllocation = require('../models/DeliceProfitAllocation');
const DeliceFundExpense = require('../models/DeliceFundExpense');
const DeliceProfitAuditLog = require('../models/DeliceProfitAuditLog');
const { memoryStore, isConnected } = require('../config/db');

// Ensure memory store has allocations and settings cache
if (!memoryStore.deliceProfitAllocations) memoryStore.deliceProfitAllocations = [];
if (!memoryStore.deliceFundExpenses) memoryStore.deliceFundExpenses = [];
if (!memoryStore.deliceProfitSettings) memoryStore.deliceProfitSettings = null;

class DeliceProfitService {
  /**
   * Get or initialize financial settings
   */
  async getSettings() {
    if (isConnected()) {
      try {
        let settings = await DeliceProfitSetting.findOne({ key: 'delice_default_settings' });
        if (!settings) {
          settings = await DeliceProfitSetting.create({
            key: 'delice_default_settings',
            initialPrincipal: 73260,
            totalInitialStock: 100,
            defaultSellingPrice: 799,
            unitCost: 732.60,
            profitPerBottle: 66.40,
            fundPercentages: {
              financeMember: 10,
              developmentFund: 20,
              employeeSalaryFund: 60,
              charityFund: 3,
              marketingFund: 5,
              reserveFund: 2
            },
            cashoutFeePercentages: {
              bkash: 1.10,
              nagad: 0.85,
              cod: 1.00
            },
            employees: [
              { slot: 1, name: 'Employee 1', percentage: 15 },
              { slot: 2, name: 'Employee 2', percentage: 15 },
              { slot: 3, name: 'Employee 3', percentage: 15 },
              { slot: 4, name: 'Employee 4', percentage: 15 }
            ],
            postRepaymentPolicy: 'full_revenue_as_profit'
          });
        }
        const sObj = settings.toObject ? settings.toObject() : settings;
        if (!sObj.cashoutFeePercentages) {
          sObj.cashoutFeePercentages = { bkash: 1.10, nagad: 0.85, cod: 1.00 };
        }
        return sObj;
      } catch (err) {
        console.error('[DeliceProfitService] Error fetching settings from DB:', err.message);
      }
    }

    // In-memory fallback
    if (!memoryStore.deliceProfitSettings) {
      memoryStore.deliceProfitSettings = {
        key: 'delice_default_settings',
        initialPrincipal: 73260,
        totalInitialStock: 100,
        defaultSellingPrice: 799,
        unitCost: 732.60,
        profitPerBottle: 66.40,
        fundPercentages: {
          financeMember: 10,
          developmentFund: 20,
          employeeSalaryFund: 60,
          charityFund: 3,
          marketingFund: 5,
          reserveFund: 2
        },
        cashoutFeePercentages: {
          bkash: 1.10,
          nagad: 0.85,
          cod: 1.00
        },
        employees: [
          { slot: 1, name: 'Employee 1', percentage: 15 },
          { slot: 2, name: 'Employee 2', percentage: 15 },
          { slot: 3, name: 'Employee 3', percentage: 15 },
          { slot: 4, name: 'Employee 4', percentage: 15 }
        ],
        postRepaymentPolicy: 'full_revenue_as_profit'
      };
    }
    if (!memoryStore.deliceProfitSettings.cashoutFeePercentages) {
      memoryStore.deliceProfitSettings.cashoutFeePercentages = { bkash: 1.10, nagad: 0.85, cod: 1.00 };
    }
    return memoryStore.deliceProfitSettings;
  }

  /**
   * Update financial settings (does NOT affect past allocations)
   */
  async updateSettings(newSettings, updatedBy = 'Admin') {
    const current = await this.getSettings();
    const updatedPayload = {
      initialPrincipal: Number(newSettings.initialPrincipal !== undefined ? newSettings.initialPrincipal : current.initialPrincipal),
      totalInitialStock: Number(newSettings.totalInitialStock !== undefined ? newSettings.totalInitialStock : current.totalInitialStock),
      defaultSellingPrice: Number(newSettings.defaultSellingPrice !== undefined ? newSettings.defaultSellingPrice : current.defaultSellingPrice),
      unitCost: Number(newSettings.unitCost !== undefined ? newSettings.unitCost : current.unitCost),
      profitPerBottle: Number(newSettings.profitPerBottle !== undefined ? newSettings.profitPerBottle : current.profitPerBottle),
      postRepaymentPolicy: newSettings.postRepaymentPolicy || current.postRepaymentPolicy || 'full_revenue_as_profit',
      updatedBy
    };

    if (newSettings.fundPercentages) {
      updatedPayload.fundPercentages = {
        ...current.fundPercentages,
        ...newSettings.fundPercentages
      };
    }

    if (newSettings.cashoutFeePercentages) {
      updatedPayload.cashoutFeePercentages = {
        ...(current.cashoutFeePercentages || { bkash: 1.10, nagad: 0.85, cod: 1.00 }),
        ...newSettings.cashoutFeePercentages
      };
    }

    if (isConnected()) {
      try {
        const saved = await DeliceProfitSetting.findOneAndUpdate(
          { key: 'delice_default_settings' },
          { $set: updatedPayload },
          { new: true, upsert: true }
        );
        await DeliceProfitAuditLog.create({
          action: 'SETTINGS_UPDATE',
          performedBy: updatedBy,
          details: updatedPayload
        });
        return saved.toObject ? saved.toObject() : saved;
      } catch (err) {
        console.error('[DeliceProfitService] DB update error:', err.message);
      }
    }

    memoryStore.deliceProfitSettings = {
      ...current,
      ...updatedPayload
    };
    return memoryStore.deliceProfitSettings;
  }

  /**
   * Update Employee Names (Does not alter past historical records)
   */
  async updateEmployees(employeesList, updatedBy = 'Admin') {
    if (!Array.isArray(employeesList) || employeesList.length !== 4) {
      throw new Error('Must provide exactly 4 employee slots.');
    }

    const formattedEmployees = employeesList.map((emp, idx) => ({
      slot: idx + 1,
      name: (emp.name || `Employee ${idx + 1}`).trim(),
      percentage: 15
    }));

    if (isConnected()) {
      try {
        const saved = await DeliceProfitSetting.findOneAndUpdate(
          { key: 'delice_default_settings' },
          { $set: { employees: formattedEmployees, updatedBy } },
          { new: true, upsert: true }
        );
        await DeliceProfitAuditLog.create({
          action: 'EMPLOYEE_RENAME',
          performedBy: updatedBy,
          details: formattedEmployees
        });
        return saved.toObject ? saved.toObject() : saved;
      } catch (err) {
        console.error('[DeliceProfitService] DB employee update error:', err.message);
      }
    }

    const current = await this.getSettings();
    current.employees = formattedEmployees;
    memoryStore.deliceProfitSettings = current;
    return current;
  }

  /**
   * Get total principal repaid so far (accounting for reversals)
   */
  async getTotalPrincipalRepaid() {
    if (isConnected()) {
      try {
        const result = await DeliceProfitAllocation.aggregate([
          {
            $group: {
              _id: null,
              totalRepaid: {
                $sum: {
                  $cond: [{ $eq: ['$isReversal', true] }, { $multiply: ['$totalPrincipalRepaid', -1] }, '$totalPrincipalRepaid']
                }
              }
            }
          }
        ]);
        return result.length > 0 ? Math.max(0, Math.round(result[0].totalRepaid * 100) / 100) : 0;
      } catch (err) {
        console.error('[DeliceProfitService] Aggregate total principal error:', err.message);
      }
    }

    // In-memory calculation
    let total = 0;
    (memoryStore.deliceProfitAllocations || []).forEach(alloc => {
      if (alloc.isReversal) {
        total -= (alloc.totalPrincipalRepaid || 0);
      } else {
        total += (alloc.totalPrincipalRepaid || 0);
      }
    });
    return Math.max(0, Math.round(total * 100) / 100);
  }

  /**
   * Precise Fund Distribution with Pennies Reconciled
   */
  calculateFundDistribution(distributableProfit, settings) {
    const P = Math.round(distributableProfit * 100) / 100;
    if (P <= 0) {
      return {
        fundAllocations: {
          financeMember: 0,
          developmentFund: 0,
          employeeSalaryFund: 0,
          charityFund: 0,
          marketingFund: 0,
          reserveFund: 0
        },
        employeeBreakdown: (settings.employees || []).map(emp => ({
          slot: emp.slot,
          name: emp.name,
          percentage: emp.percentage,
          amount: 0
        }))
      };
    }

    // Fund allocation percentages:
    // NirmAN Finance Member Profit: 10%
    // DÉLICE Development Fund: 20%
    // Employee Salary Fund: 60% (4 employees @ 15% each)
    // Charity Fund: 3%
    // Marketing Fund: 5%
    // Reserve & Emergency Fund: 2%
    let financeMember = Math.round(P * 0.10 * 100) / 100;
    let developmentFund = Math.round(P * 0.20 * 100) / 100;
    let charityFund = Math.round(P * 0.03 * 100) / 100;
    let marketingFund = Math.round(P * 0.05 * 100) / 100;
    let reserveFund = Math.round(P * 0.02 * 100) / 100;

    // 4 Employees @ 15% each
    const employeeBreakdown = (settings.employees || []).map(emp => {
      const empAmount = Math.round(P * (emp.percentage / 100) * 100) / 100;
      return {
        slot: emp.slot,
        name: emp.name,
        percentage: emp.percentage,
        amount: empAmount
      };
    });

    const employeeSalaryFund = employeeBreakdown.reduce((sum, e) => sum + e.amount, 0);

    // Reconcile rounding differences so sum of all allocations always equals exact distributable profit
    const sumAllocated = Math.round(
      (financeMember + developmentFund + employeeSalaryFund + charityFund + marketingFund + reserveFund) * 100
    ) / 100;

    const diff = Math.round((P - sumAllocated) * 100) / 100;
    if (diff !== 0) {
      // Reconcile by adjusting developmentFund so sum exactly equals P
      developmentFund = Math.round((developmentFund + diff) * 100) / 100;
    }

    return {
      fundAllocations: {
        financeMember,
        developmentFund,
        employeeSalaryFund: Math.round(employeeSalaryFund * 100) / 100,
        charityFund,
        marketingFund,
        reserveFund
      },
      employeeBreakdown
    };
  }

  /**
   * Allocate sale for a confirmed/paid order
   * Strictly idempotent: checks orderId + item index
   */
  async allocateOrderSale(order) {
    if (!order) return { skipped: true, reason: 'No order provided' };

    // Eligibility check: order must be paid or delivered
    const isPaid = order.paymentStatus === 'paid' || order.orderStatus === 'delivered';
    if (!isPaid) {
      return { skipped: true, reason: 'Order not paid or confirmed' };
    }

    const items = order.items || [];
    if (items.length === 0) {
      return { skipped: true, reason: 'Order has no items' };
    }

    const settings = await this.getSettings();
    const results = [];

    // Check outstanding principal remaining before processing items
    let currentTotalRepaid = await this.getTotalPrincipalRepaid();
    let outstandingPrincipal = Math.max(0, Math.round((settings.initialPrincipal - currentTotalRepaid) * 100) / 100);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const qty = parseInt(item.quantity, 10) || 1;
      const orderRef = order._id ? String(order._id) : order.orderNumber;
      const idempotencyKey = `ALLOC_${orderRef}_ITEM_${i}_${item.productId || 'PROD'}`;

      // Check if already allocated
      let existing = null;
      if (isConnected()) {
        try {
          existing = await DeliceProfitAllocation.findOne({ idempotencyKey, isReversal: false });
        } catch (e) {
          existing = (memoryStore.deliceProfitAllocations || []).find(a => a.idempotencyKey === idempotencyKey && !a.isReversal);
        }
      } else {
        existing = (memoryStore.deliceProfitAllocations || []).find(a => a.idempotencyKey === idempotencyKey && !a.isReversal);
      }

      if (existing) {
        results.push({ idempotencyKey, status: 'already_allocated', record: existing });
        continue;
      }

      // Calculation for this item
      // Delivery charges are completely excluded from product revenue and profit!
      const unitSellingPrice = Number(item.price) || settings.defaultSellingPrice;
      const totalRevenue = Math.round(unitSellingPrice * qty * 100) / 100;

      // Determine principal repayment per bottle
      // Cannot exceed outstanding principal
      const targetUnitRepayment = Math.min(settings.unitCost, unitSellingPrice);
      const maxPossibleRepayment = Math.round(targetUnitRepayment * qty * 100) / 100;

      let actualTotalRepayment = 0;
      if (outstandingPrincipal > 0) {
        actualTotalRepayment = Math.min(maxPossibleRepayment, outstandingPrincipal);
      } else {
        actualTotalRepayment = 0; // Principal fully repaid!
      }

      const unitPrincipalRepaid = Math.round((actualTotalRepayment / qty) * 100) / 100;
      const totalDistributableProfit = Math.round((totalRevenue - actualTotalRepayment) * 100) / 100;
      const unitDistributableProfit = Math.round((totalDistributableProfit / qty) * 100) / 100;

      // Deduct from remaining outstanding principal for next item
      outstandingPrincipal = Math.max(0, Math.round((outstandingPrincipal - actualTotalRepayment) * 100) / 100);

      // Reconciled fund distribution
      const { fundAllocations, employeeBreakdown } = this.calculateFundDistribution(totalDistributableProfit, settings);

      const pMethod = String(order.paymentMethod || '').toLowerCase();
      const pProvider = String(order.paymentProvider || '').toLowerCase();
      let paymentSegment = 'bkash';
      if (pMethod === 'cod_advance' || pProvider === 'hand_cash' || pMethod === 'cash_on_delivery') {
        paymentSegment = 'cash_on_delivery';
      } else if (pProvider === 'nagad') {
        paymentSegment = 'nagad';
      } else {
        paymentSegment = 'bkash';
      }

      const allocationRecord = {
        idempotencyKey,
        orderId: String(order._id || order.orderNumber),
        orderNumber: order.orderNumber,
        transactionId: order.transactionId || '',
        customerName: order.customer?.fullName || 'Valued Customer',
        customerPhone: order.customer?.phone || '',
        paymentProvider: order.paymentProvider || 'bkash',
        paymentMethod: order.paymentMethod || 'full_online',
        paymentSegment,
        productId: item.productId || 'delice-perfume',
        productName: item.productName || 'DÉLICE Fragrance',
        bottlesSold: qty,
        unitSellingPrice,
        totalRevenue,
        unitPrincipalRepaid,
        totalPrincipalRepaid: actualTotalRepayment,
        unitDistributableProfit,
        totalDistributableProfit,
        fundAllocations,
        employeeBreakdown,
        settingsSnapshot: {
          initialPrincipal: settings.initialPrincipal,
          unitCost: settings.unitCost,
          profitPerBottle: settings.profitPerBottle,
          fundPercentages: settings.fundPercentages,
          employees: settings.employees,
          postRepaymentPolicy: settings.postRepaymentPolicy
        },
        isReversal: false,
        reversalOf: null,
        notes: `Confirmed sale for Order #${order.orderNumber}`
      };

      let saved = null;
      if (isConnected()) {
        try {
          saved = await DeliceProfitAllocation.create(allocationRecord);
        } catch (e) {
          saved = allocationRecord;
          memoryStore.deliceProfitAllocations.push(saved);
        }
      } else {
        saved = allocationRecord;
        memoryStore.deliceProfitAllocations.push(saved);
      }

      results.push({ idempotencyKey, status: 'allocated', record: saved });
    }

    return { success: true, count: results.length, allocations: results };
  }

  /**
   * Reverse allocation when an order is cancelled or refunded
   */
  async reverseOrderSale(order, reason = 'Order cancelled / refunded') {
    if (!order) return { skipped: true, reason: 'No order provided' };

    const orderRef = order._id ? String(order._id) : order.orderNumber;
    let existingAllocations = [];

    if (isConnected()) {
      try {
        existingAllocations = await DeliceProfitAllocation.find({
          orderId: orderRef,
          isReversal: false
        });
      } catch (e) {
        existingAllocations = (memoryStore.deliceProfitAllocations || []).filter(
          a => (a.orderId === orderRef || a.orderNumber === order.orderNumber) && !a.isReversal
        );
      }
    } else {
      existingAllocations = (memoryStore.deliceProfitAllocations || []).filter(
        a => (a.orderId === orderRef || a.orderNumber === order.orderNumber) && !a.isReversal
      );
    }

    if (existingAllocations.length === 0) {
      return { skipped: true, reason: 'No active allocations found to reverse' };
    }

    const reversals = [];
    for (const alloc of existingAllocations) {
      const reversalKey = `${alloc.idempotencyKey}_REVERSAL`;

      // Check if already reversed
      let alreadyReversed = null;
      if (isConnected()) {
        try {
          alreadyReversed = await DeliceProfitAllocation.findOne({ reversalOf: alloc.idempotencyKey });
        } catch (e) {}
      } else {
        alreadyReversed = (memoryStore.deliceProfitAllocations || []).find(a => a.reversalOf === alloc.idempotencyKey);
      }

      if (alreadyReversed) continue;

      const reversalRecord = {
        idempotencyKey: reversalKey,
        orderId: alloc.orderId,
        orderNumber: alloc.orderNumber,
        transactionId: alloc.transactionId,
        customerName: alloc.customerName,
        customerPhone: alloc.customerPhone,
        productId: alloc.productId,
        productName: alloc.productName,
        bottlesSold: alloc.bottlesSold,
        unitSellingPrice: alloc.unitSellingPrice,
        totalRevenue: alloc.totalRevenue,
        unitPrincipalRepaid: alloc.unitPrincipalRepaid,
        totalPrincipalRepaid: alloc.totalPrincipalRepaid,
        unitDistributableProfit: alloc.unitDistributableProfit,
        totalDistributableProfit: alloc.totalDistributableProfit,
        fundAllocations: alloc.fundAllocations,
        employeeBreakdown: alloc.employeeBreakdown,
        settingsSnapshot: alloc.settingsSnapshot,
        isReversal: true,
        reversalOf: alloc.idempotencyKey,
        notes: `Reversal: ${reason}`
      };

      let savedRev = null;
      if (isConnected()) {
        try {
          savedRev = await DeliceProfitAllocation.create(reversalRecord);
        } catch (e) {
          savedRev = reversalRecord;
          memoryStore.deliceProfitAllocations.push(savedRev);
        }
      } else {
        savedRev = reversalRecord;
        memoryStore.deliceProfitAllocations.push(savedRev);
      }

      reversals.push(savedRev);
    }

    return { success: true, count: reversals.length, reversals };
  }

  /**
   * Record expense against a specific fund (e.g. Development Fund)
   */
  async recordFundExpense({ fundKey, title, amount, expenseDate, category, note, recordedBy }) {
    const validFunds = {
      developmentFund: 'DÉLICE Development Fund',
      marketingFund: 'Marketing Fund',
      charityFund: 'Charity Fund',
      reserveFund: 'Reserve & Emergency Fund',
      financeMember: 'NirmAN Finance Member Profit',
      employeeSalaryFund: 'Employee Salary Fund'
    };

    if (!validFunds[fundKey]) {
      throw new Error(`Invalid fund key: ${fundKey}`);
    }

    const numAmount = Math.round(Number(amount) * 100) / 100;
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }

    const expenseData = {
      fundKey,
      fundName: validFunds[fundKey],
      title: title.trim(),
      amount: numAmount,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      category: category || 'General',
      note: note ? note.trim() : '',
      recordedBy: recordedBy || 'Admin'
    };

    let saved = null;
    if (isConnected()) {
      try {
        saved = await DeliceFundExpense.create(expenseData);
        await DeliceProfitAuditLog.create({
          action: 'EXPENSE_RECORDED',
          performedBy: recordedBy || 'Admin',
          details: expenseData
        });
        return saved.toObject ? saved.toObject() : saved;
      } catch (err) {
        console.error('[DeliceProfitService] Record fund expense error:', err.message);
      }
    }

    saved = { _id: 'EXP_' + Date.now(), ...expenseData };
    memoryStore.deliceFundExpenses.push(saved);
    return saved;
  }

  /**
   * Reconcile Profit Allocations with Orders Collection
   * Purges orphan allocations whose orders no longer exist in Orders collection,
   * Ensures every paid/delivered order has an active allocation,
   * Cleans allocations for unverified or cancelled orders.
   */
  async reconcileWithOrders() {
    const Order = require('../models/Order');
    let orders = [];

    if (isConnected()) {
      try {
        orders = await Order.find();
      } catch (err) {
        console.error('[DeliceProfitService] Order fetch during reconcile failed:', err.message);
        orders = memoryStore.orders || [];
      }
    } else {
      orders = memoryStore.orders || [];
    }

    const orderMap = new Map();
    orders.forEach(o => {
      if (o._id) orderMap.set(String(o._id), o);
      if (o.orderNumber) orderMap.set(String(o.orderNumber), o);
    });

    let allocations = [];
    if (isConnected()) {
      try {
        allocations = await DeliceProfitAllocation.find();
      } catch (err) {
        allocations = memoryStore.deliceProfitAllocations || [];
      }
    } else {
      allocations = memoryStore.deliceProfitAllocations || [];
    }

    // 1. Purge / Delete orphan allocations (where order does not exist in Orders collection)
    const orphanAllocIds = [];
    allocations.forEach(alloc => {
      const byId = alloc.orderId ? orderMap.get(String(alloc.orderId)) : null;
      const byNum = alloc.orderNumber ? orderMap.get(String(alloc.orderNumber)) : null;
      if (!byId && !byNum) {
        orphanAllocIds.push(alloc._id);
      }
    });

    if (orphanAllocIds.length > 0) {
      if (isConnected()) {
        try {
          await DeliceProfitAllocation.deleteMany({ _id: { $in: orphanAllocIds } });
          console.log(`[DeliceProfitService] Purged ${orphanAllocIds.length} orphan profit allocations.`);
        } catch (delErr) {
          console.error('[DeliceProfitService] Failed to purge orphan allocations:', delErr.message);
        }
      }
      if (memoryStore.deliceProfitAllocations) {
        memoryStore.deliceProfitAllocations = memoryStore.deliceProfitAllocations.filter(
          a => !orphanAllocIds.includes(a._id)
        );
      }
    }

    // 1b. Backfill and sync payment segment on allocations from orders
    for (const alloc of allocations) {
      if (orphanAllocIds.includes(alloc._id)) continue;
      const order = orderMap.get(String(alloc.orderId)) || orderMap.get(String(alloc.orderNumber));
      if (order) {
        const pMethod = String(order.paymentMethod || '').toLowerCase();
        const pProvider = String(order.paymentProvider || '').toLowerCase();
        let segment = 'bkash';
        if (pMethod === 'cod_advance' || pProvider === 'hand_cash' || pMethod === 'cash_on_delivery') {
          segment = 'cash_on_delivery';
        } else if (pProvider === 'nagad') {
          segment = 'nagad';
        } else {
          segment = 'bkash';
        }
        alloc.paymentMethod = order.paymentMethod || 'full_online';
        alloc.paymentProvider = order.paymentProvider || 'bkash';
        alloc.paymentSegment = segment;
        if (isConnected() && alloc._id) {
          try {
            await DeliceProfitAllocation.updateOne(
              { _id: alloc._id },
              { $set: { paymentMethod: alloc.paymentMethod, paymentProvider: alloc.paymentProvider, paymentSegment: segment } }
            );
          } catch (_) {}
        }
      }
    }

    // 2. Ensure all verified paid / delivered orders are allocated
    const eligibleOrders = orders.filter(
      o => o.paymentStatus === 'paid' || o.orderStatus === 'delivered'
    );

    for (const order of eligibleOrders) {
      await this.allocateOrderSale(order);
    }

    // 3. For any orders that are not paid and not delivered, remove allocations
    const ineligibleOrders = orders.filter(
      o => o.paymentStatus !== 'paid' && o.orderStatus !== 'delivered'
    );

    for (const order of ineligibleOrders) {
      const orderRef = String(order._id);
      const orderNum = order.orderNumber;
      if (isConnected()) {
        try {
          await DeliceProfitAllocation.deleteMany({
            $or: [{ orderId: orderRef }, { orderNumber: orderNum }]
          });
        } catch (_) {}
      }
      if (memoryStore.deliceProfitAllocations) {
        memoryStore.deliceProfitAllocations = memoryStore.deliceProfitAllocations.filter(
          a => a.orderId !== orderRef && a.orderNumber !== orderNum
        );
      }
    }

    return {
      success: true,
      totalOrders: orders.length,
      eligiblePaidOrders: eligibleOrders.length,
      orphansPurged: orphanAllocIds.length
    };
  }

  /**
   * Get complete Profit Calculation Dashboard Data
   */
  async getDashboardData() {
    // Automatically reconcile with Orders collection to guarantee 100% exact parity
    try {
      await this.reconcileWithOrders();
    } catch (rErr) {
      console.error('[DeliceProfitService] Auto-reconciliation notice:', rErr.message);
    }

    const settings = await this.getSettings();

    let allocations = [];
    let expenses = [];

    if (isConnected()) {
      try {
        allocations = await DeliceProfitAllocation.find().sort({ createdAt: -1 });
        expenses = await DeliceFundExpense.find().sort({ expenseDate: -1 });
      } catch (e) {
        allocations = memoryStore.deliceProfitAllocations || [];
        expenses = memoryStore.deliceFundExpenses || [];
      }
    } else {
      allocations = memoryStore.deliceProfitAllocations || [];
      expenses = memoryStore.deliceFundExpenses || [];
    }

    // Accumulators
    let totalBottlesSold = 0;
    let totalSalesRevenue = 0;
    let totalPrincipalRepaid = 0;

    // Payment Segments & Cash-out Analysis (bKash 1.10%, Nagad 0.85%, COD 1.00%)
    const feeRates = settings.cashoutFeePercentages || { bkash: 1.10, nagad: 0.85, cod: 1.00 };
    const segments = {
      bkash: {
        key: 'bkash',
        name: 'bKash (Send Money)',
        color: '#E2136E',
        rate: Number(feeRates.bkash !== undefined ? feeRates.bkash : 1.10),
        bottlesSold: 0,
        orderCount: 0,
        grossRevenue: 0,
        cashoutFee: 0,
        netRevenue: 0
      },
      nagad: {
        key: 'nagad',
        name: 'Nagad (Send Money)',
        color: '#F7941D',
        rate: Number(feeRates.nagad !== undefined ? feeRates.nagad : 0.85),
        bottlesSold: 0,
        orderCount: 0,
        grossRevenue: 0,
        cashoutFee: 0,
        netRevenue: 0
      },
      cash_on_delivery: {
        key: 'cash_on_delivery',
        name: 'Cash on Delivery (Courier COD)',
        color: '#059669',
        rate: Number(feeRates.cod !== undefined ? feeRates.cod : 1.00),
        bottlesSold: 0,
        orderCount: 0,
        grossRevenue: 0,
        cashoutFee: 0,
        netRevenue: 0
      }
    };

    const segmentOrders = { bkash: new Set(), nagad: new Set(), cash_on_delivery: new Set() };

    allocations.forEach(alloc => {
      const multiplier = alloc.isReversal ? -1 : 1;
      const bQty = (alloc.bottlesSold || 0) * multiplier;
      const rev = (alloc.totalRevenue || 0) * multiplier;

      totalBottlesSold += bQty;
      totalSalesRevenue += rev;
      totalPrincipalRepaid += (alloc.totalPrincipalRepaid || 0) * multiplier;

      let seg = alloc.paymentSegment;
      if (!seg || !segments[seg]) {
        seg = (alloc.paymentProvider === 'nagad') ? 'nagad' : ((alloc.paymentMethod === 'cod_advance' || alloc.paymentProvider === 'hand_cash') ? 'cash_on_delivery' : 'bkash');
      }

      if (segments[seg]) {
        segments[seg].bottlesSold += bQty;
        segments[seg].grossRevenue += rev;
        if (alloc.orderNumber) segmentOrders[seg].add(alloc.orderNumber);
      }
    });

    // Calculate Cashout Fees on TOTAL revenue per segment (NOT per order)
    let totalCashoutFees = 0;
    Object.keys(segments).forEach(k => {
      const s = segments[k];
      s.orderCount = segmentOrders[k].size;
      s.grossRevenue = Math.max(0, Math.round(s.grossRevenue * 100) / 100);
      s.cashoutFee = Math.round(s.grossRevenue * (s.rate / 100) * 100) / 100;
      s.netRevenue = Math.max(0, Math.round((s.grossRevenue - s.cashoutFee) * 100) / 100);
      totalCashoutFees += s.cashoutFee;
    });
    totalCashoutFees = Math.round(totalCashoutFees * 100) / 100;

    // Expenses by fund
    const fundExpenses = {
      financeMember: 0,
      developmentFund: 0,
      employeeSalaryFund: 0,
      charityFund: 0,
      marketingFund: 0,
      reserveFund: 0
    };

    expenses.forEach(exp => {
      if (fundExpenses[exp.fundKey] !== undefined) {
        fundExpenses[exp.fundKey] += (exp.amount || 0);
      }
    });

    // Principal calculations
    totalPrincipalRepaid = Math.max(0, Math.round(totalPrincipalRepaid * 100) / 100);
    const initialPrincipal = settings.initialPrincipal || 73260;
    const outstandingPrincipal = Math.max(0, Math.round((initialPrincipal - totalPrincipalRepaid) * 100) / 100);
    const repaymentProgress = Math.min(100, Math.round((totalPrincipalRepaid / initialPrincipal) * 10000) / 100);
    const isFullyRepaid = totalPrincipalRepaid >= initialPrincipal;

    // Distributable Profit Calculation:
    // Gross Distributable Profit = Total Sales Revenue - Total Principal Repaid
    const grossDistributableProfit = Math.max(0, Math.round((totalSalesRevenue - totalPrincipalRepaid) * 100) / 100);

    // Rule 2 & 3: Cash-out charges deducted from total money; whatever remains goes into Fund-Wise Financial Breakdown!
    const totalDistributableProfit = Math.max(0, Math.round((grossDistributableProfit - totalCashoutFees) * 100) / 100);

    // Calculate Fund Distribution strictly from remaining Net Distributable Profit
    const { fundAllocations, employeeBreakdown } = this.calculateFundDistribution(totalDistributableProfit, settings);

    // Cleaned 2-decimal rounded funds
    const fundsOverview = [
      {
        key: 'financeMember',
        name: 'NirmAN Finance Member Profit',
        percentage: 10,
        amountPerBottle: totalBottlesSold > 0 ? Math.round((fundAllocations.financeMember / totalBottlesSold) * 100) / 100 : 0,
        totalAccumulated: Math.max(0, fundAllocations.financeMember || 0),
        totalExpenses: Math.round(fundExpenses.financeMember * 100) / 100,
        availableBalance: Math.round(((fundAllocations.financeMember || 0) - fundExpenses.financeMember) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#4A102A'
      },
      {
        key: 'developmentFund',
        name: 'DÉLICE Development Fund',
        percentage: 20,
        amountPerBottle: totalBottlesSold > 0 ? Math.round((fundAllocations.developmentFund / totalBottlesSold) * 100) / 100 : 0,
        totalAccumulated: Math.max(0, fundAllocations.developmentFund || 0),
        totalExpenses: Math.round(fundExpenses.developmentFund * 100) / 100,
        availableBalance: Math.round(((fundAllocations.developmentFund || 0) - fundExpenses.developmentFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#C5A46D'
      },
      {
        key: 'employeeSalaryFund',
        name: 'Employee Salary Fund',
        percentage: 60,
        amountPerBottle: totalBottlesSold > 0 ? Math.round((fundAllocations.employeeSalaryFund / totalBottlesSold) * 100) / 100 : 0,
        totalAccumulated: Math.max(0, fundAllocations.employeeSalaryFund || 0),
        totalExpenses: Math.round(fundExpenses.employeeSalaryFund * 100) / 100,
        availableBalance: Math.round(((fundAllocations.employeeSalaryFund || 0) - fundExpenses.employeeSalaryFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#181619'
      },
      {
        key: 'charityFund',
        name: 'Charity Fund',
        percentage: 3,
        amountPerBottle: totalBottlesSold > 0 ? Math.round((fundAllocations.charityFund / totalBottlesSold) * 100) / 100 : 0,
        totalAccumulated: Math.max(0, fundAllocations.charityFund || 0),
        totalExpenses: Math.round(fundExpenses.charityFund * 100) / 100,
        availableBalance: Math.round(((fundAllocations.charityFund || 0) - fundExpenses.charityFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#FF665C'
      },
      {
        key: 'marketingFund',
        name: 'Marketing Fund',
        percentage: 5,
        amountPerBottle: totalBottlesSold > 0 ? Math.round((fundAllocations.marketingFund / totalBottlesSold) * 100) / 100 : 0,
        totalAccumulated: Math.max(0, fundAllocations.marketingFund || 0),
        totalExpenses: Math.round(fundExpenses.marketingFund * 100) / 100,
        availableBalance: Math.round(((fundAllocations.marketingFund || 0) - fundExpenses.marketingFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#8E2800'
      },
      {
        key: 'reserveFund',
        name: 'Reserve & Emergency Fund',
        percentage: 2,
        amountPerBottle: totalBottlesSold > 0 ? Math.round((fundAllocations.reserveFund / totalBottlesSold) * 100) / 100 : 0,
        totalAccumulated: Math.max(0, fundAllocations.reserveFund || 0),
        totalExpenses: Math.round(fundExpenses.reserveFund * 100) / 100,
        availableBalance: Math.round(((fundAllocations.reserveFund || 0) - fundExpenses.reserveFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#34495E'
      }
    ];

    const employeesSummary = employeeBreakdown.map(emp => ({
      slot: emp.slot,
      name: emp.name,
      percentage: emp.percentage,
      earningsPerBottle: totalBottlesSold > 0 ? Math.round((emp.amount / totalBottlesSold) * 100) / 100 : 0,
      totalAccumulated: emp.amount,
      bottlesSold: totalBottlesSold
    }));

    return {
      settings,
      summary: {
        totalBottlesSold: Math.max(0, totalBottlesSold),
        totalSalesRevenue: Math.max(0, Math.round(totalSalesRevenue * 100) / 100),
        totalPrincipalRepaid,
        initialPrincipal,
        outstandingPrincipal,
        repaymentProgress,
        isFullyRepaid,
        grossDistributableProfit,
        totalCashoutFees,
        totalDistributableProfit: Math.max(0, Math.round(totalDistributableProfit * 100) / 100),
        totalEmployeeSalary: Math.max(0, Math.round(fundAllocations.employeeSalaryFund * 100) / 100),
        totalDevelopmentFund: Math.max(0, Math.round(fundAllocations.developmentFund * 100) / 100),
        totalReserveFund: Math.max(0, Math.round(fundAllocations.reserveFund * 100) / 100)
      },
      segments: [
        segments.bkash,
        segments.nagad,
        segments.cash_on_delivery
      ],
      segmentsMap: segments,
      cashoutSummary: {
        totalCashoutFees,
        grossDistributableProfit,
        netDistributableProfit: totalDistributableProfit
      },
      fundsOverview,
      employeesSummary,
      recentAllocations: allocations.slice(0, 25),
      recentExpenses: expenses.slice(0, 25)
    };
  }

  /**
   * Get filtered allocations list
   */
  async getAllocations({ startDate, endDate, productId, search, limit = 100 }) {
    try { await this.reconcileWithOrders(); } catch (_) {}
    let query = {};
    if (productId && productId !== 'all') query.productId = productId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    if (search) {
      query.$or = [
        { orderNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { customerPhone: new RegExp(search, 'i') },
        { transactionId: new RegExp(search, 'i') }
      ];
    }

    if (isConnected()) {
      try {
        const list = await DeliceProfitAllocation.find(query).sort({ createdAt: -1 }).limit(Number(limit));
        return list;
      } catch (e) {}
    }

    let list = memoryStore.deliceProfitAllocations || [];
    if (productId && productId !== 'all') list = list.filter(a => a.productId === productId);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        a.orderNumber.toLowerCase().includes(s) ||
        (a.customerName && a.customerName.toLowerCase().includes(s)) ||
        (a.customerPhone && a.customerPhone.includes(s))
      );
    }
    return list.slice(0, Number(limit));
  }

  /**
   * Get fund transactions ledger (Allocations credited + Expenses debited)
   */
  async getFundLedger(fundKey) {
    try { await this.reconcileWithOrders(); } catch (_) {}
    const validFunds = {
      developmentFund: 'DÉLICE Development Fund',
      marketingFund: 'Marketing Fund',
      charityFund: 'Charity Fund',
      reserveFund: 'Reserve & Emergency Fund',
      financeMember: 'NirmAN Finance Member Profit',
      employeeSalaryFund: 'Employee Salary Fund'
    };

    if (!validFunds[fundKey]) {
      throw new Error(`Invalid fund key: ${fundKey}`);
    }

    let allocations = [];
    let expenses = [];

    if (isConnected()) {
      try {
        allocations = await DeliceProfitAllocation.find().sort({ createdAt: 1 });
        expenses = await DeliceFundExpense.find({ fundKey }).sort({ expenseDate: 1 });
      } catch (e) {
        allocations = memoryStore.deliceProfitAllocations || [];
        expenses = (memoryStore.deliceFundExpenses || []).filter(exp => exp.fundKey === fundKey);
      }
    } else {
      allocations = memoryStore.deliceProfitAllocations || [];
      expenses = (memoryStore.deliceFundExpenses || []).filter(exp => exp.fundKey === fundKey);
    }

    const ledger = [];
    let runningBalance = 0;

    // Merge transactions chronologically
    const allEvents = [];

    allocations.forEach(alloc => {
      const amount = alloc.fundAllocations?.[fundKey] || 0;
      if (amount > 0) {
        allEvents.push({
          type: alloc.isReversal ? 'DEBIT' : 'CREDIT',
          date: alloc.createdAt || new Date(),
          description: alloc.isReversal
            ? `Sale Reversal: Order #${alloc.orderNumber}`
            : `Sale Credit: Order #${alloc.orderNumber} (${alloc.bottlesSold} bottle${alloc.bottlesSold > 1 ? 's' : ''})`,
          amount: Math.round(amount * 100) / 100,
          reference: alloc.orderNumber
        });
      }
    });

    expenses.forEach(exp => {
      allEvents.push({
        type: 'DEBIT',
        date: exp.expenseDate || exp.createdAt || new Date(),
        description: `Expense: ${exp.title} (${exp.category || 'General'})`,
        amount: Math.round(exp.amount * 100) / 100,
        reference: exp.note || 'Manual Entry'
      });
    });

    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    allEvents.forEach(evt => {
      if (evt.type === 'CREDIT') {
        runningBalance += evt.amount;
      } else {
        runningBalance -= evt.amount;
      }
      ledger.push({
        ...evt,
        runningBalance: Math.round(runningBalance * 100) / 100
      });
    });

    return {
      fundKey,
      fundName: validFunds[fundKey],
      currentBalance: Math.round(runningBalance * 100) / 100,
      totalCredits: Math.round(allEvents.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0) * 100) / 100,
      totalDebits: Math.round(allEvents.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0) * 100) / 100,
      transactions: ledger.reverse() // Most recent first for display
    };
  }

  /**
   * Generate Financial Report by range
   */
  async generateReport(rangeType = 'overall', customStart = null, customEnd = null) {
    try { await this.reconcileWithOrders(); } catch (_) {}
    let startDate = null;
    let endDate = new Date();

    const now = new Date();
    if (rangeType === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (rangeType === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (rangeType === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (rangeType === 'custom' && customStart) {
      startDate = new Date(customStart);
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    let filter = {};
    if (startDate) {
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    let allocations = [];
    if (isConnected()) {
      try {
        allocations = await DeliceProfitAllocation.find(filter).sort({ createdAt: -1 });
      } catch (e) {
        allocations = memoryStore.deliceProfitAllocations || [];
      }
    } else {
      allocations = memoryStore.deliceProfitAllocations || [];
      if (startDate) {
        allocations = allocations.filter(a => {
          const d = new Date(a.createdAt);
          return d >= startDate && d <= endDate;
        });
      }
    }

    let bottlesSold = 0;
    let salesRevenue = 0;
    let principalRepaid = 0;

    const settings = await this.getSettings();
    const feeRates = settings.cashoutFeePercentages || { bkash: 1.10, nagad: 0.85, cod: 1.00 };
    const segments = {
      bkash: { key: 'bkash', name: 'bKash (Send Money)', rate: Number(feeRates.bkash !== undefined ? feeRates.bkash : 1.10), grossRevenue: 0, cashoutFee: 0, netRevenue: 0, bottlesSold: 0 },
      nagad: { key: 'nagad', name: 'Nagad (Send Money)', rate: Number(feeRates.nagad !== undefined ? feeRates.nagad : 0.85), grossRevenue: 0, cashoutFee: 0, netRevenue: 0, bottlesSold: 0 },
      cash_on_delivery: { key: 'cash_on_delivery', name: 'Cash on Delivery (Courier COD)', rate: Number(feeRates.cod !== undefined ? feeRates.cod : 1.00), grossRevenue: 0, cashoutFee: 0, netRevenue: 0, bottlesSold: 0 }
    };

    allocations.forEach(a => {
      const m = a.isReversal ? -1 : 1;
      const bQty = (a.bottlesSold || 0) * m;
      const rev = (a.totalRevenue || 0) * m;

      bottlesSold += bQty;
      salesRevenue += rev;
      principalRepaid += (a.totalPrincipalRepaid || 0) * m;

      let seg = a.paymentSegment;
      if (!seg || !segments[seg]) {
        seg = (a.paymentProvider === 'nagad') ? 'nagad' : ((a.paymentMethod === 'cod_advance' || a.paymentProvider === 'hand_cash') ? 'cash_on_delivery' : 'bkash');
      }
      if (segments[seg]) {
        segments[seg].bottlesSold += bQty;
        segments[seg].grossRevenue += rev;
      }
    });

    let totalCashoutFees = 0;
    Object.keys(segments).forEach(k => {
      const s = segments[k];
      s.grossRevenue = Math.max(0, Math.round(s.grossRevenue * 100) / 100);
      s.cashoutFee = Math.round(s.grossRevenue * (s.rate / 100) * 100) / 100;
      s.netRevenue = Math.max(0, Math.round((s.grossRevenue - s.cashoutFee) * 100) / 100);
      totalCashoutFees += s.cashoutFee;
    });
    totalCashoutFees = Math.round(totalCashoutFees * 100) / 100;

    const grossDistributableProfit = Math.max(0, Math.round((salesRevenue - principalRepaid) * 100) / 100);
    const totalDistributableProfit = Math.max(0, Math.round((grossDistributableProfit - totalCashoutFees) * 100) / 100);
    const { fundAllocations } = this.calculateFundDistribution(totalDistributableProfit, settings);

    return {
      rangeType,
      startDate,
      endDate,
      count: allocations.length,
      bottlesSold: Math.max(0, bottlesSold),
      salesRevenue: Math.max(0, Math.round(salesRevenue * 100) / 100),
      principalRepaid: Math.max(0, Math.round(principalRepaid * 100) / 100),
      grossDistributableProfit,
      totalCashoutFees,
      distributableProfit: Math.max(0, Math.round(totalDistributableProfit * 100) / 100),
      segments: [segments.bkash, segments.nagad, segments.cash_on_delivery],
      funds: {
        financeMember: fundAllocations.financeMember || 0,
        developmentFund: fundAllocations.developmentFund || 0,
        employeeSalaryFund: fundAllocations.employeeSalaryFund || 0,
        charityFund: fundAllocations.charityFund || 0,
        marketingFund: fundAllocations.marketingFund || 0,
        reserveFund: fundAllocations.reserveFund || 0
      },
      allocations
    };
  }
}

module.exports = new DeliceProfitService();
