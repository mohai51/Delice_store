const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protectAdmin } = require('../middleware/authMiddleware');
const { smartOrderLimiter } = require('../middleware/rateLimiter');

router.get('/', protectAdmin, orderController.getAllOrders);
router.post('/', smartOrderLimiter, orderController.createOrder);
router.get('/by-transaction/:tranId', orderController.getOrderByTransactionId);
router.get('/:id', protectAdmin, orderController.getOrderById);
router.patch('/:id/status', protectAdmin, orderController.updateOrderStatus);
router.delete('/:id', protectAdmin, orderController.deleteOrder);

module.exports = router;
