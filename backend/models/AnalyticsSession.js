const mongoose = require('mongoose');

const analyticsSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  visitorId: {
    type: String,
    required: true,
    index: true
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'tablet', 'pc'],
    default: 'mobile',
    index: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  page: {
    type: String,
    default: '/'
  },
  referrer: {
    type: String,
    default: ''
  },
  screenTimeSeconds: {
    type: Number,
    default: 0
  },
  events: [{
    eventType: {
      type: String,
      enum: ['page_view', 'add_to_cart', 'buy_now', 'order_completed'],
      default: 'page_view'
    },
    productId: String,
    productName: String,
    orderNumber: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  hasAddToCart: {
    type: Boolean,
    default: false,
    index: true
  },
  hasBuyNow: {
    type: Boolean,
    default: false,
    index: true
  },
  hasConverted: {
    type: Boolean,
    default: false,
    index: true
  },
  orderNumber: {
    type: String
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

analyticsSessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AnalyticsSession', analyticsSessionSchema);
