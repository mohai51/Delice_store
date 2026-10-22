const mongoose = require('mongoose');

const ReferralCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  ownerEmail: { type: String, default: '' },
  customerId: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  commissionPercent: { type: Number, default: 5 },
  refereeDiscountPercent: { type: Number, default: 10 },
  stats: {
    totalUses: { type: Number, default: 0 },
    totalRevenueGenerated: { type: Number, default: 0 },
    pendingCommission: { type: Number, default: 0 },
    eligibleCommission: { type: Number, default: 0 },
    paidCommission: { type: Number, default: 0 }
  },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ReferralCode || mongoose.model('ReferralCode', ReferralCodeSchema);
