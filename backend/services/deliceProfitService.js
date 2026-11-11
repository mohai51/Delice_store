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
            employees: [
              { slot: 1, name: 'Employee 1', percentage: 15 },
              { slot: 2, name: 'Employee 2', percentage: 15 },
              { slot: 3, name: 'Employee 3', percentage: 15 },
              { slot: 4, name: 'Employee 4', percentage: 15 }
            ],
            postRepaymentPolicy: 'full_revenue_as_profit'
          });
        }
        return settings.toObject ? settings.toObject() : settings;
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
        employees: [
          { slot: 1, name: 'Employee 1', percentage: 15 },
          { slot: 2, name: 'Employee 2', percentage: 15 },
          { slot: 3, name: 'Employee 3', percentage: 15 },
          { slot: 4, name: 'Employee 4', percentage: 15 }
        ],
        postRepaymentPolicy: 'full_revenue_as_profit'
      };
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

      const allocationRecord = {
        idempotencyKey,
        orderId: String(order._id || order.orderNumber),
        orderNumber: order.orderNumber,
        transactionId: order.transactionId || '',
        customerName: order.customer?.fullName || 'Valued Customer',
        customerPhone: order.customer?.phone || '',
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
   * Get complete Profit Calculation Dashboard Data
   */
  async getDashboardData() {
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
    let totalDistributableProfit = 0;

    const fundsAccumulated = {
      financeMember: 0,
      developmentFund: 0,
      employeeSalaryFund: 0,
      charityFund: 0,
      marketingFund: 0,
      reserveFund: 0
    };

    const employeeEarnings = {
      1: { slot: 1, name: settings.employees?.[0]?.name || 'Employee 1', total: 0, bottles: 0 },
      2: { slot: 2, name: settings.employees?.[1]?.name || 'Employee 2', total: 0, bottles: 0 },
      3: { slot: 3, name: settings.employees?.[2]?.name || 'Employee 3', total: 0, bottles: 0 },
      4: { slot: 4, name: settings.employees?.[3]?.name || 'Employee 4', total: 0, bottles: 0 }
    };

    allocations.forEach(alloc => {
      const multiplier = alloc.isReversal ? -1 : 1;
      const bQty = (alloc.bottlesSold || 0) * multiplier;

      totalBottlesSold += bQty;
      totalSalesRevenue += (alloc.totalRevenue || 0) * multiplier;
      totalPrincipalRepaid += (alloc.totalPrincipalRepaid || 0) * multiplier;
      totalDistributableProfit += (alloc.totalDistributableProfit || 0) * multiplier;

      if (alloc.fundAllocations) {
        fundsAccumulated.financeMember += (alloc.fundAllocations.financeMember || 0) * multiplier;
        fundsAccumulated.developmentFund += (alloc.fundAllocations.developmentFund || 0) * multiplier;
        fundsAccumulated.employeeSalaryFund += (alloc.fundAllocations.employeeSalaryFund || 0) * multiplier;
        fundsAccumulated.charityFund += (alloc.fundAllocations.charityFund || 0) * multiplier;
        fundsAccumulated.marketingFund += (alloc.fundAllocations.marketingFund || 0) * multiplier;
        fundsAccumulated.reserveFund += (alloc.fundAllocations.reserveFund || 0) * multiplier;
      }

      if (Array.isArray(alloc.employeeBreakdown)) {
        alloc.employeeBreakdown.forEach(emp => {
          if (employeeEarnings[emp.slot]) {
            employeeEarnings[emp.slot].total += (emp.amount || 0) * multiplier;
            employeeEarnings[emp.slot].bottles += bQty;
          }
        });
      }
    });

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

    // Cleaned 2-decimal rounded funds
    const fundsOverview = [
      {
        key: 'financeMember',
        name: 'NirmAN Finance Member Profit',
        percentage: 10,
        amountPerBottle: 6.64,
        totalAccumulated: Math.max(0, Math.round(fundsAccumulated.financeMember * 100) / 100),
        totalExpenses: Math.round(fundExpenses.financeMember * 100) / 100,
        availableBalance: Math.round((fundsAccumulated.financeMember - fundExpenses.financeMember) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#4A102A'
      },
      {
        key: 'developmentFund',
        name: 'DÉLICE Development Fund',
        percentage: 20,
        amountPerBottle: 13.28,
        totalAccumulated: Math.max(0, Math.round(fundsAccumulated.developmentFund * 100) / 100),
        totalExpenses: Math.round(fundExpenses.developmentFund * 100) / 100,
        availableBalance: Math.round((fundsAccumulated.developmentFund - fundExpenses.developmentFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#C5A46D'
      },
      {
        key: 'employeeSalaryFund',
        name: 'Employee Salary Fund',
        percentage: 60,
        amountPerBottle: 39.84,
        totalAccumulated: Math.max(0, Math.round(fundsAccumulated.employeeSalaryFund * 100) / 100),
        totalExpenses: Math.round(fundExpenses.employeeSalaryFund * 100) / 100,
        availableBalance: Math.round((fundsAccumulated.employeeSalaryFund - fundExpenses.employeeSalaryFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#181619'
      },
      {
        key: 'charityFund',
        name: 'Charity Fund',
        percentage: 3,
        amountPerBottle: 1.99,
        totalAccumulated: Math.max(0, Math.round(fundsAccumulated.charityFund * 100) / 100),
        totalExpenses: Math.round(fundExpenses.charityFund * 100) / 100,
        availableBalance: Math.round((fundsAccumulated.charityFund - fundExpenses.charityFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#FF665C'
      },
      {
        key: 'marketingFund',
        name: 'Marketing Fund',
        percentage: 5,
        amountPerBottle: 3.32,
        totalAccumulated: Math.max(0, Math.round(fundsAccumulated.marketingFund * 100) / 100),
        totalExpenses: Math.round(fundExpenses.marketingFund * 100) / 100,
        availableBalance: Math.round((fundsAccumulated.marketingFund - fundExpenses.marketingFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#8E2800'
      },
      {
        key: 'reserveFund',
        name: 'Reserve & Emergency Fund',
        percentage: 2,
        amountPerBottle: 1.33,
        totalAccumulated: Math.max(0, Math.round(fundsAccumulated.reserveFund * 100) / 100),
        totalExpenses: Math.round(fundExpenses.reserveFund * 100) / 100,
        availableBalance: Math.round((fundsAccumulated.reserveFund - fundExpenses.reserveFund) * 100) / 100,
        bottlesContributing: Math.max(0, totalBottlesSold),
        color: '#34495E'
      }
    ];

    const employeesSummary = Object.values(employeeEarnings).map(emp => ({
      slot: emp.slot,
      name: emp.name,
      percentage: 15,
      earningsPerBottle: 9.96,
      totalAccumulated: Math.max(0, Math.round(emp.total * 100) / 100),
      bottlesSold: Math.max(0, emp.bottles)
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
        totalDistributableProfit: Math.max(0, Math.round(totalDistributableProfit * 100) / 100),
        totalEmployeeSalary: Math.max(0, Math.round(fundsAccumulated.employeeSalaryFund * 100) / 100),
        totalDevelopmentFund: Math.max(0, Math.round(fundsAccumulated.developmentFund * 100) / 100),
        totalReserveFund: Math.max(0, Math.round(fundsAccumulated.reserveFund * 100) / 100)
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
    let distributableProfit = 0;
    const funds = {
      financeMember: 0,
      developmentFund: 0,
      employeeSalaryFund: 0,
      charityFund: 0,
      marketingFund: 0,
      reserveFund: 0
    };

    allocations.forEach(a => {
      const m = a.isReversal ? -1 : 1;
      bottlesSold += (a.bottlesSold || 0) * m;
      salesRevenue += (a.totalRevenue || 0) * m;
      principalRepaid += (a.totalPrincipalRepaid || 0) * m;
      distributableProfit += (a.totalDistributableProfit || 0) * m;

      if (a.fundAllocations) {
        funds.financeMember += (a.fundAllocations.financeMember || 0) * m;
        funds.developmentFund += (a.fundAllocations.developmentFund || 0) * m;
        funds.employeeSalaryFund += (a.fundAllocations.employeeSalaryFund || 0) * m;
        funds.charityFund += (a.fundAllocations.charityFund || 0) * m;
        funds.marketingFund += (a.fundAllocations.marketingFund || 0) * m;
        funds.reserveFund += (a.fundAllocations.reserveFund || 0) * m;
      }
    });

    return {
      rangeType,
      startDate,
      endDate,
      count: allocations.length,
      bottlesSold: Math.max(0, bottlesSold),
      salesRevenue: Math.max(0, Math.round(salesRevenue * 100) / 100),
      principalRepaid: Math.max(0, Math.round(principalRepaid * 100) / 100),
      distributableProfit: Math.max(0, Math.round(distributableProfit * 100) / 100),
      funds: {
        financeMember: Math.max(0, Math.round(funds.financeMember * 100) / 100),
        developmentFund: Math.max(0, Math.round(funds.developmentFund * 100) / 100),
        employeeSalaryFund: Math.max(0, Math.round(funds.employeeSalaryFund * 100) / 100),
        charityFund: Math.max(0, Math.round(funds.charityFund * 100) / 100),
        marketingFund: Math.max(0, Math.round(funds.marketingFund * 100) / 100),
        reserveFund: Math.max(0, Math.round(funds.reserveFund * 100) / 100)
      },
      allocations
    };
  }
}

module.exports = new DeliceProfitService();
