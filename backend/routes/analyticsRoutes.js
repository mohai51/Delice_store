const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protectAdmin } = require('../middleware/authMiddleware');

// Public beacon/fetch tracking endpoint
router.post('/track', analyticsController.trackEvent);

// Admin-protected stats endpoint
router.get('/stats', protectAdmin, analyticsController.getStats);

module.exports = router;
