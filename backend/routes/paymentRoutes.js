const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { checkoutLimiter } = require('../middleware/rateLimiter');

// Initiate payment (Rate limited)
router.post('/initiate', checkoutLimiter, paymentController.initiatePayment);

// Gateway Callbacks (Accept POST from SSLCOMMERZ & GET from test links)
router.all('/success', paymentController.paymentSuccess);
router.all('/fail', paymentController.paymentFail);
router.all('/cancel', paymentController.paymentCancel);
router.post('/ipn', paymentController.paymentIPN);

module.exports = router;
