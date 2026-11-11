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

    paidOrders.forEach(order => {
      totalProductRevenue += (order.productSubtotal || 0);
      totalDeliveryCollected += (order.deliveryCharge || 0);
      totalProductCOGS += (order.totalProductCost || 0);
      totalCourierCost += (order.actualCourierCost || 0);
      totalGatewayFees += (order.gatewayFee || 0);

      (order.items || []).forEach(item => {
        totalUnitsSold += (item.quantity || 0);
      });
    });

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
    const pendingOrdersCount = memoryStore.orders.filter(o => o.paymentStatus === 'pending').length;
    const deliveredOrdersCount = memoryStore.orders.filter(o => o.orderStatus === 'delivered').length;

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
      fundDistribution
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
