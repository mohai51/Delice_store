const mongoose = require('mongoose');
const HeroSlide = require('../models/HeroSlide');
const { isConnected } = require('../config/db');

const DEFAULT_SLIDES = [
  {
    badge: 'Authentic Eau De Parfum • 30ml',
    title: 'Make It',
    titleHighlight: 'Yours.',
    subtitle: 'Romantic in feeling. Bold in self-expression. Alive with youthful energy.',
    image: '/assets/images/hero-slide-1.svg',
    productId: 'delice-bloom',
    offerPrice: 799,
    originalPrice: 850,
    order: 1,
    isActive: true
  },
  {
    badge: 'Signature Profiles',
    title: 'A Fragrance for',
    titleHighlight: 'Every Side of You.',
    subtitle: 'From university lectures and outdoor active days to intimate evenings—explore fragrances attuned to your rhythm.',
    image: '/assets/images/hero-slide-2.svg',
    productId: 'delice-momentum',
    offerPrice: 799,
    originalPrice: 850,
    order: 2,
    isActive: true
  },
  {
    badge: 'Special Opening Offer',
    title: 'Your Mood.',
    titleHighlight: 'Your Moments.',
    subtitle: 'Enjoy our introductory opening offer: ৳799 across all 30ml editions. Pure, dependable fragrance.',
    image: '/assets/images/hero-slide-3.svg',
    productId: 'delice-enigma',
    offerPrice: 799,
    originalPrice: 850,
    order: 3,
    isActive: true
  }
];

let inMemorySlides = DEFAULT_SLIDES.map((s, idx) => ({ _id: 'slide_mem_' + (idx + 1), ...s }));
let initialSeedDone = false;

/**
 * Get active slides for Storefront
 * GET /api/slides
 */
exports.getActiveSlides = async (req, res) => {
  try {
    if (isConnected()) {
      const slides = await HeroSlide.find({ isActive: true }).sort({ order: 1 });
      if (slides && slides.length > 0) return res.json(slides);
    }
    const mem = inMemorySlides.filter(s => s.isActive !== false);
    res.json(mem.length ? mem : DEFAULT_SLIDES);
  } catch (err) {
    res.json(DEFAULT_SLIDES);
  }
};

/**
 * Get all slides for Admin
 * GET /api/slides/admin
 */
exports.getAdminSlides = async (req, res, next) => {
  try {
    if (isConnected()) {
      let slides = await HeroSlide.find().sort({ order: 1 });
      // Only seed on initial database setup if collection is completely fresh and never seeded
      if ((!slides || slides.length === 0) && !initialSeedDone) {
        initialSeedDone = true;
        const count = await HeroSlide.countDocuments();
        if (count === 0) {
          slides = await HeroSlide.insertMany(DEFAULT_SLIDES);
        }
      }
      return res.json(slides || []);
    }
    res.json(inMemorySlides);
  } catch (err) {
    next(err);
  }
};

/**
 * Create new Hero Slide (Admin)
 * POST /api/slides
 */
exports.createSlide = async (req, res, next) => {
  try {
    initialSeedDone = true;
    const { badge, title, titleHighlight, subtitle, image, productId, offerPrice, originalPrice, order } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: 'Please upload or provide a Slide Image.' });
    }

    const slideData = {
      badge: badge ? badge.trim() : '',
      title: title && title.trim() ? title.trim() : 'Hero Slide',
      titleHighlight: titleHighlight ? titleHighlight.trim() : '',
      subtitle: subtitle ? subtitle.trim() : '',
      image: image.trim(),
      productId: productId || 'delice-bloom',
      offerPrice: Number(offerPrice) || 799,
      originalPrice: Number(originalPrice) || 850,
      order: Number(order) || 1,
      isActive: true
    };

    let slide;
    if (isConnected()) {
      slide = await HeroSlide.create(slideData);
    } else {
      slide = { _id: 'SLIDE_' + Date.now(), ...slideData };
      inMemorySlides.push(slide);
    }

    res.status(201).json({ success: true, slide });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Hero Slide (Admin)
 * PUT /api/slides/:id
 */
exports.updateSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    let slide = null;

    if (isConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        slide = await HeroSlide.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).catch(() => null);
      } else {
        slide = await HeroSlide.findOneAndUpdate({ _id: id }, req.body, { new: true }).catch(() => null);
      }
    }

    if (!slide) {
      const idx = inMemorySlides.findIndex(s => String(s._id) === String(id));
      if (idx > -1) {
        inMemorySlides[idx] = { ...inMemorySlides[idx], ...req.body };
        slide = inMemorySlides[idx];
      }
    }

    if (!slide) {
      return res.status(404).json({ success: false, error: 'Hero slide not found.' });
    }

    res.json({ success: true, slide });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete Hero Slide (Admin)
 * DELETE /api/slides/:id
 */
exports.deleteSlide = async (req, res, next) => {
  try {
    initialSeedDone = true;
    const { id } = req.params;

    if (isConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await HeroSlide.findByIdAndDelete(id).catch(() => null);
      } else {
        await HeroSlide.findOneAndDelete({ _id: id }).catch(() => null);
      }
    }

    inMemorySlides = inMemorySlides.filter(s => String(s._id) !== String(id));
    res.json({ success: true, message: 'Hero slide deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
