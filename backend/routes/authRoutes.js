const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protectAdmin } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, authController.login);
router.get('/me', protectAdmin, authController.getMe);

module.exports = router;
