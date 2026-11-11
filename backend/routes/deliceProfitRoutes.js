const express = require('express');
const router = express.Router();
const deliceProfitController = require('../controllers/deliceProfitController');
const { protectAdmin } = require('../middleware/authMiddleware');

// All routes are strictly protected for authenticated administrators only
router.use(protectAdmin);

router.get('/dashboard', deliceProfitController.getDashboard);
router.get('/allocations', deliceProfitController.getAllocations);
router.get('/funds/:fundKey', deliceProfitController.getFundLedger);
router.post('/funds/:fundKey/expense', deliceProfitController.recordFundExpense);
router.get('/settings', deliceProfitController.getSettings);
router.put('/settings', deliceProfitController.updateSettings);
router.put('/employees', deliceProfitController.updateEmployees);
router.get('/report', deliceProfitController.getReport);

module.exports = router;
