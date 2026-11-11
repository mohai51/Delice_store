const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.get('/', productController.getAllProducts);
router.get('/admin', protectAdmin, productController.getAdminProducts);
router.get('/:id', productController.getProductById);
router.post('/', protectAdmin, productController.createProduct);
router.put('/:id', protectAdmin, productController.updateProduct);
router.delete('/:id', protectAdmin, productController.deleteProduct);

module.exports = router;
