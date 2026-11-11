const express = require('express');
const router = express.Router();
const slideController = require('../controllers/slideController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.get('/', slideController.getActiveSlides);
router.get('/admin', protectAdmin, slideController.getAdminSlides);
router.post('/', protectAdmin, slideController.createSlide);
router.put('/:id', protectAdmin, slideController.updateSlide);
router.delete('/:id', protectAdmin, slideController.deleteSlide);

module.exports = router;
