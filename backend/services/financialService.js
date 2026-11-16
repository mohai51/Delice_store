/**
 * DÉLICE Financial Accounting Service
 * Strict accounting rules with dual MongoDB and In-Memory fallback support.
 */

const Order = require('../models/Order');
const Expense = require('../models/Expense');
const FundAllocation = require('../models/FundAllocation');
const { memoryStore, isConnected } = require('../config/db');

class FinancialService {
  async getFinancialOverview() {
    let paidOrders = [];
    let generalExpenses = [];
    let allocationsConfig = [];

    if (isConnected()) {
      try {
        paidOrders = await Order.find({ paymentStatus: 'paid' });
        generalExpenses = await Expense.find();
        allocationsConfig = await FundAllocation.find();
      } catch (e) {
        paidOrders = memoryStore.orders.filter(o => o.paymentStatus === 'paid');
        generalExpenses = memoryStore.expenses;
        allocationsConfig = memoryStore.allocations;
      }
    } else {
      paidOrders = memoryStore.orders.filter(o => o.paymentStatus === 'paid');
      generalExpenses = memoryStore.expenses;
      allocationsConfig = memoryStore.allocations;
    }

    let totalProductRevenue = 0;
    let totalDeliveryCollected = 0;
    let totalProductCOGS = 0;
    let totalCourierCost = 0;
    let totalGatewayFees = 0;
    let totalUnitsSold = 0;

    let bkashRevenue = 0;
    let nagadRevenue = 0;
    let codRevenue = 0;
    let bkashOrdersCount = 0;
    let nagadOrdersCount = 0;
    let codOrdersCount = 0;
    let bkashBottles = 0;
    let nagadBottles = 0;
    let codBottles = 0;

    paidOrders.forEach(order => {
      totalProductRevenue += (order.productSubtotal || 0);
      totalDeliveryCollected += (order.deliveryCharge || 0);
      totalProductCOGS += (order.totalProductCost || 0);
      totalCourierCost += (order.actualCourierCost || 0);

      const pMethod = String(order.paymentMethod || '').toLowerCase();
      const pProvider = String(order.paymentProvider || '').toLowerCase();
      const rev = (order.productSubtotal || 0);
      let orderBottles = 0;

      (order.items || []).forEach(item => {
        const qty = (item.quantity || 0);
        totalUnitsSold += qty;
        orderBottles += qty;
      });

      if (pMethod === 'cod_advance' || pProvider === 'hand_cash' || pMethod === 'cash_on_delivery') {
        codRevenue += rev;
        codOrdersCount++;
        codBottles += orderBottles;
      } else if (pProvider === 'nagad') {
        nagadRevenue += rev;
        nagadOrdersCount++;
        nagadBottles += orderBottles;
      } else {
        bkashRevenue += rev;
        bkashOrdersCount++;
        bkashBottles += orderBottles;
      }
    });

    // Channel Cash-out Fees on total revenue (bKash 1.10%, Nagad 0.85%, COD 1.00%)
    const bkashCashoutFee = Math.round(bkashRevenue * 0.011 * 100) / 100;
    const nagadCashoutFee = Math.round(nagadRevenue * 0.0085 * 100) / 100;
    const codCashoutFee = Math.round(codRevenue * 0.01 * 100) / 100;
    const totalCashoutFees = Math.round((bkashCashoutFee + nagadCashoutFee + codCashoutFee) * 100) / 100;
    totalGatewayFees = totalCashoutFees;

    const segmentStats = {
      bkash: { key: 'bkash', name: 'bKash (Send Money)', orderCount: bkashOrdersCount, bottlesSold: bkashBottles, grossRevenue: bkashRevenue, rate: 1.10, cashoutFee: bkashCashoutFee, netRevenue: Math.max(0, Math.round((bkashRevenue - bkashCashoutFee) * 100) / 100) },
      nagad: { key: 'nagad', name: 'Nagad (Send Money)', orderCount: nagadOrdersCount, bottlesSold: nagadBottles, grossRevenue: nagadRevenue, rate: 0.85, cashoutFee: nagadCashoutFee, netRevenue: Math.max(0, Math.round((nagadRevenue - nagadCashoutFee) * 100) / 100) },
      cod: { key: 'cash_on_delivery', name: 'Cash on Delivery (Courier COD)', orderCount: codOrdersCount, bottlesSold: codBottles, grossRevenue: codRevenue, rate: 1.00, cashoutFee: codCashoutFee, netRevenue: Math.max(0, Math.round((codRevenue - codCashoutFee) * 100) / 100) },
      totalCashoutFees
    };

    const totalGrossRevenue = totalProductRevenue + totalDeliveryCollected;

    let totalGeneralExpenses = 0;
    const expensesByCategory = {};

    generalExpenses.forEach(exp => {
      totalGeneralExpenses += exp.amount;
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
    });

    const totalAllExpenses = totalProductCOGS + totalCourierCost + totalGatewayFees + totalGeneralExpenses;
    const netProfit = totalGrossRevenue - totalAllExpenses;

    // Default Fund Allocations if empty
    if (!allocationsConfig || allocationsConfig.length === 0) {
      allocationsConfig = [
        { name: 'Business Reinvestment', percentage: 40, isPercentage: true, color: '#4A102A' },
        { name: 'Personal Withdrawal', percentage: 25, isPercentage: true, color: '#181619' },
        { name: 'Marketing Budget', percentage: 15, isPercentage: true, color: '#FF665C' },
        { name: 'Emergency Fund', percentage: 10, isPercentage: true, color: '#C5A46D' },
        { name: 'Future Stock Purchase', percentage: 10, isPercentage: true, color: '#5E1837' }
      ];
    }

    const fundDistribution = allocationsConfig.map(alloc => {
      let allocatedAmount = 0;
      if (alloc.isPercentage) {
        allocatedAmount = netProfit > 0 ? Math.round((netProfit * (alloc.percentage / 100)) * 100) / 100 : 0;
      } else {
        allocatedAmount = alloc.fixedAmount || 0;
      }
      return {
        id: alloc._id || alloc.name,
        name: alloc.name,
        percentage: alloc.percentage,
        isPercentage: alloc.isPercentage,
        allocatedAmount,
        color: alloc.color || '#4A102A'
      };
    });

    const totalOrdersCount = isConnected() ? await Order.countDocuments().catch(() => memoryStore.orders.length) : memoryStore.orders.length;
    const paidOrdersCount = paidOrders.length;
    let pendingOrdersCount = 0;
    let deliveredOrdersCount = 0;
    if (isConnected()) {
      try {
        pendingOrdersCount = await Order.countDocuments({ paymentStatus: { $in: ['pending', 'awaiting_verification'] } });
        deliveredOrdersCount = await Order.countDocuments({ orderStatus: 'delivered' });
      } catch (_) {
        pendingOrdersCount = memoryStore.orders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'awaiting_verification').length;
        deliveredOrdersCount = memoryStore.orders.filter(o => o.orderStatus === 'delivered').length;
      }
    } else {
      pendingOrdersCount = memoryStore.orders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'awaiting_verification').length;
      deliveredOrdersCount = memoryStore.orders.filter(o => o.orderStatus === 'delivered').length;
    }

    return {
      totalOrdersCount,
      paidOrdersCount,
      pendingOrdersCount,
      deliveredOrdersCount,
      totalUnitsSold,
      totalProductRevenue,
      totalDeliveryCollected,
      totalGrossRevenue,
      totalProductCOGS,
      totalCourierCost,
      totalGatewayFees,
      totalGeneralExpenses,
      totalAllExpenses,
      expensesByCategory,
      netProfit,
      fundDistribution,
      segmentStats
    };
  }

  async recalculateOrderFinancials(orderId, updateFields = {}) {
    let order = null;
    if (isConnected()) {
      try {
        order = await Order.findById(orderId);
      } catch (e) {}
    }
    if (!order) {
      order = memoryStore.orders.find(o => String(o._id) === orderId);
    }
    if (!order) throw new Error('Order not found');

    if (updateFields.actualCourierCost !== undefined) {
      order.actualCourierCost = Number(updateFields.actualCourierCost);
    }

    if (updateFields.gatewayFee !== undefined) {
      order.gatewayFee = Number(updateFields.gatewayFee);
    }

    if (order.paymentStatus === 'paid') {
      order.netProfit = (order.totalPaid || order.totalPayable) 
        - (order.totalProductCost || 0) 
        - (order.actualCourierCost || 0) 
        - (order.gatewayFee || 0);
    } else {
      order.netProfit = 0;
    }

    await order.save();
    return order;
  }
}

module.exports = new FinancialService();
