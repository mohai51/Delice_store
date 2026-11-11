const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  tagline: {
    type: String,
    trim: true
  },
  volume: {
    type: String,
    default: '30ml'
  },
  originalPrice: {
    type: Number,
    required: true,
    default: 850
  },
  price: {
    type: Number,
    required: true,
    default: 799
  },
  cogs: {
    type: Number,
    required: true,
    default: 320,
    comment: 'Estimated unit cost of goods sold for profit & loss calculation'
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  occasions: [{
    type: String,
    trim: true
  }],
  mood: {
    type: String,
    enum: ['romantic', 'energetic', 'evening', 'general'],
    default: 'general'
  },
  image: {
    type: String,
    default: '/assets/images/bloom.svg'
  },
  images: {
    type: [String],
    default: []
  },
  stock: {
    type: Number,
    default: 100,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  badge: {
    type: String,
    default: 'Opening Offer'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
