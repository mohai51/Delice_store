const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.get('/', protectAdmin, orderController.getAllOrders);
router.post('/', orderController.createOrder);
router.get('/by-transaction/:tranId', orderController.getOrderByTransactionId);
router.get('/:id', protectAdmin, orderController.getOrderById);
router.patch('/:id/status', protectAdmin, orderController.updateOrderStatus);

module.exports = router;
