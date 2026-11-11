const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.use(protectAdmin);

router.get('/overview', adminController.getOverview);
router.get('/profit-loss', adminController.getProfitAndLoss);
router.get('/inventory', adminController.getInventory);

// Expenses
router.get('/expenses', adminController.getExpenses);
router.post('/expenses', adminController.createExpense);
router.delete('/expenses/:id', adminController.deleteExpense);

// Fund Allocation
router.get('/allocations', adminController.getAllocations);
router.post('/allocations', adminController.saveAllocation);
router.put('/allocations/:id', adminController.updateAllocation);
router.delete('/allocations/:id', adminController.deleteAllocation);

module.exports = router;
