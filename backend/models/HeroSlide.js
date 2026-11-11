const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema({
  badge: {
    type: String,
    default: 'Authentic Eau De Parfum • 30ml',
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Big title is required'],
    trim: true
  },
  titleHighlight: {
    type: String,
    trim: true
  },
  subtitle: {
    type: String,
    required: [true, 'Subtitle is required'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Hero slide image is required']
  },
  productId: {
    type: String,
    default: 'delice-bloom'
  },
  offerPrice: {
    type: Number,
    default: 799
  },
  originalPrice: {
    type: Number,
    default: 850
  },
  order: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HeroSlide', heroSlideSchema);
