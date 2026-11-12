const Order = require('../models/Order');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const FundAllocation = require('../models/FundAllocation');
const financialService = require('../services/financialService');
const deliceProfitService = require('../services/deliceProfitService');
const { memoryStore, isConnected } = require('../config/db');

const DEFAULT_PRODUCTS = [
  { id: 'delice-bloom', name: 'DÉLICE BLOOM', volume: '30ml', price: 799, originalPrice: 850, cogs: 320, stock: 120, isActive: true },
  { id: 'delice-momentum', name: 'DÉLICE MOMENTUM', volume: '30ml', price: 799, originalPrice: 850, cogs: 320, stock: 100, isActive: true },
  { id: 'delice-enigma', name: 'DÉLICE ENIGMA', volume: '30ml', price: 799, originalPrice: 850, cogs: 320, stock: 90, isActive: true }
];

/**
 * Get Comprehensive Overview Statistics
 * GET /api/admin/overview
 */
exports.getOverview = async (req, res, next) => {
  try {
    const stats = await financialService.getFinancialOverview();

    let recentOrders = [];
    let lowStockProducts = [];

    if (isConnected()) {
      try {
        recentOrders = await Order.find().sort({ createdAt: -1 }).limit(10);
        lowStockProducts = await Product.find({ stock: { $lte: 15 } });
      } catch (e) {}
    } else {
      recentOrders = memoryStore.orders.slice(-10);
      lowStockProducts = (memoryStore.products.length ? memoryStore.products : DEFAULT_PRODUCTS).filter(p => p.stock <= 15);
    }

    let deliceProfit = null;
    try {
      deliceProfit = await deliceProfitService.getDashboardData();
    } catch (e) {}

    res.json({
      success: true,
      stats,
      recentOrders,
      lowStockProducts,
      deliceProfit
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Profit & Loss Statement
 * GET /api/admin/profit-loss
 */
exports.getProfitAndLoss = async (req, res, next) => {
  try {
    const stats = await financialService.getFinancialOverview();

    let paidOrders = [];
    if (isConnected()) {
      try {
        paidOrders = await Order.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 });
      } catch (e) {}
    } else {
      paidOrders = memoryStore.orders.filter(o => o.paymentStatus === 'paid');
    }

    const perOrderFinancials = paidOrders.map(o => ({
      orderId: o._id,
      orderNumber: o.orderNumber,
      customerName: o.customer?.fullName || 'Valued Customer',
      productSubtotal: o.productSubtotal,
      deliveryCollected: o.deliveryCharge,
      totalPaid: o.totalPaid || o.totalPayable,
      productCOGS: o.totalProductCost,
      courierExpense: o.actualCourierCost,
      gatewayFee: o.gatewayFee,
      netProfit: o.netProfit,
      date: o.createdAt
    }));

    res.json({
      success: true,
      summary: stats,
      perOrderFinancials
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Expense Management
 */
exports.getExpenses = async (req, res, next) => {
  try {
    let expenses = [];
    if (isConnected()) {
      try {
        expenses = await Expense.find().sort({ date: -1 });
      } catch (e) {}
    } else {
      expenses = memoryStore.expenses;
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      totalExpenses,
      expenses
    });
  } catch (err) {
    next(err);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, note, date, deliceFundKey } = req.body;

    if (!title || !category || amount === undefined) {
      return res.status(400).json({ success: false, error: 'Please specify title, category, and amount.' });
    }

    const expenseData = {
      title,
      category,
      amount: Number(amount),
      note: note || '',
      date: date ? new Date(date) : new Date(),
      deliceFundKey: deliceFundKey || 'none'
    };

    let expense;
    if (isConnected()) {
      try {
        expense = await Expense.create(expenseData);
      } catch (e) {
        expense = { _id: 'EXP_' + Date.now(), ...expenseData };
        memoryStore.expenses.push(expense);
      }
    } else {
      expense = { _id: 'EXP_' + Date.now(), ...expenseData };
      memoryStore.expenses.push(expense);
    }

    // Connect with DÉLICE Fund Expense Ledger if specified
    if (deliceFundKey && deliceFundKey !== 'none') {
      try {
        await deliceProfitService.recordFundExpense({
          fundKey: deliceFundKey,
          title,
          amount: Number(amount),
          category,
          note: note ? `General OpEx Sync: ${note}` : 'General OpEx Sync',
          recordedBy: req.admin?.username || 'Admin'
        });
      } catch (fundErr) {
        console.error('[Delice Fund Expense Sync Error]', fundErr.message);
      }
    }

    res.status(201).json({ success: true, expense });
  } catch (err) {
    next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isConnected()) {
      try {
        await Expense.findByIdAndDelete(id);
      } catch (e) {}
    }
    memoryStore.expenses = memoryStore.expenses.filter(e => String(e._id) !== id);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Fund Allocation Management
 */
exports.getAllocations = async (req, res, next) => {
  try {
    let allocations = [];
    if (isConnected()) {
      try {
        allocations = await FundAllocation.find();
      } catch (e) {}
    } else {
      allocations = memoryStore.allocations;
    }

    if (!allocations || allocations.length === 0) {
      allocations = [
        { name: 'Business Reinvestment', percentage: 40, isPercentage: true, description: 'Batch expansion & packaging', color: '#4A102A' },
        { name: 'Personal Withdrawal', percentage: 25, isPercentage: true, description: 'Founder distribution', color: '#181619' },
        { name: 'Marketing Budget', percentage: 15, isPercentage: true, description: 'Campus & social acquisition', color: '#FF665C' },
        { name: 'Emergency Fund', percentage: 10, isPercentage: true, description: 'Cash buffer & logistics reserves', color: '#C5A46D' },
        { name: 'Future Stock Purchase', percentage: 10, isPercentage: true, description: 'Glass bottles & atomizers', color: '#5E1837' }
      ];
      memoryStore.allocations = allocations;
    }

    const overview = await financialService.getFinancialOverview();

    res.json({
      success: true,
      allocations,
      fundDistribution: overview.fundDistribution,
      netProfit: overview.netProfit
    });
  } catch (err) {
    next(err);
  }
};

exports.saveAllocation = async (req, res, next) => {
  try {
    const { name, percentage, fixedAmount, isPercentage, description, color } = req.body;
    const allocData = {
      name,
      percentage: Number(percentage) || 0,
      fixedAmount: Number(fixedAmount) || 0,
      isPercentage: isPercentage !== undefined ? isPercentage : true,
      description: description || '',
      color: color || '#4A102A'
    };

    let allocation;
    if (isConnected()) {
      try {
        allocation = await FundAllocation.create(allocData);
      } catch (e) {
        allocation = { _id: 'ALLOC_' + Date.now(), ...allocData };
        memoryStore.allocations.push(allocation);
      }
    } else {
      allocation = { _id: 'ALLOC_' + Date.now(), ...allocData };
      memoryStore.allocations.push(allocation);
    }

    res.status(201).json({ success: true, allocation });
  } catch (err) {
    next(err);
  }
};

exports.updateAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    let allocation;
    if (isConnected()) {
      try {
        allocation = await FundAllocation.findByIdAndUpdate(id, req.body, { new: true });
      } catch (e) {}
    }
    if (!allocation) {
      const idx = memoryStore.allocations.findIndex(a => String(a._id) === id || a.name === id);
      if (idx > -1) {
        memoryStore.allocations[idx] = { ...memoryStore.allocations[idx], ...req.body };
        allocation = memoryStore.allocations[idx];
      }
    }
    res.json({ success: true, allocation });
  } catch (err) {
    next(err);
  }
};

exports.deleteAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isConnected()) {
      try {
        await FundAllocation.findByIdAndDelete(id);
      } catch (e) {}
    }
    memoryStore.allocations = memoryStore.allocations.filter(a => String(a._id) !== id);
    res.json({ success: true, message: 'Allocation removed.' });
  } catch (err) {
    next(err);
  }
};
