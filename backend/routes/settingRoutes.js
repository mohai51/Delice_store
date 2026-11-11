const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.get('/public', settingController.getPublicSettings);
router.get('/', protectAdmin, settingController.getAllSettings);
router.put('/', protectAdmin, settingController.updateSettings);

module.exports = router;
