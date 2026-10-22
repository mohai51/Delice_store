const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  eventType: { 
    type: String, 
    enum: ['page_view', 'product_view', 'add_to_bag', 'checkout_start', 'purchase'], 
    required: true 
  },
  pagePath: { type: String, required: true },
  productSlug: { type: String, default: null },
  productName: { type: String, default: null },
  orderReference: { type: String, default: null }, // for purchase deduplication
  amount: { type: Number, default: 0 },
  deviceCategory: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
  referrer: { type: String, default: 'Direct' },
  utmSource: { type: String, default: null },
  utmMedium: { type: String, default: null },
  utmCampaign: { type: String, default: null },
  location: {
    country: { type: String, default: 'Bangladesh' },
    district: { type: String, default: 'Dhaka' }, // Or 'Unknown'
    isEstimated: { type: Boolean, default: true }
  },
  isBot: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

AnalyticsEventSchema.index({ eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ sessionId: 1 });
AnalyticsEventSchema.index({ orderReference: 1 }, { sparse: true });

module.exports = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
