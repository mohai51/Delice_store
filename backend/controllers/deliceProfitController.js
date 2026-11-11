const deliceProfitService = require('../services/deliceProfitService');

/**
 * Get profit overview dashboard data
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const data = await deliceProfitService.getDashboardData();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Get allocations list with filters
 */
exports.getAllocations = async (req, res, next) => {
  try {
    const { startDate, endDate, productId, search, limit } = req.query;
    const allocations = await deliceProfitService.getAllocations({
      startDate,
      endDate,
      productId,
      search,
      limit
    });
    res.json({ success: true, count: allocations.length, allocations });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Fund Ledger
 */
exports.getFundLedger = async (req, res, next) => {
  try {
    const { fundKey } = req.params;
    const ledger = await deliceProfitService.getFundLedger(fundKey);
    res.json({ success: true, ledger });
  } catch (err) {
    next(err);
  }
};

/**
 * Record an expense against a fund (e.g. Development Fund)
 */
exports.recordFundExpense = async (req, res, next) => {
  try {
    const { fundKey } = req.params;
    const { title, amount, expenseDate, category, note } = req.body;
    const adminUser = req.admin?.username || 'Admin';

    const expense = await deliceProfitService.recordFundExpense({
      fundKey,
      title,
      amount,
      expenseDate,
      category,
      note,
      recordedBy: adminUser
    });

    res.status(201).json({ success: true, expense });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Financial Settings
 */
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await deliceProfitService.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Financial Settings
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const adminUser = req.admin?.username || 'Admin';
    const settings = await deliceProfitService.updateSettings(req.body, adminUser);
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Employee Names
 */
exports.updateEmployees = async (req, res, next) => {
  try {
    const { employees } = req.body;
    const adminUser = req.admin?.username || 'Admin';
    const settings = await deliceProfitService.updateEmployees(employees, adminUser);
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate Financial Report
 */
exports.getReport = async (req, res, next) => {
  try {
    const { rangeType, startDate, endDate } = req.query;
    const report = await deliceProfitService.generateReport(rangeType, startDate, endDate);
    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
};
