const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, lowercase: true, trim: true, default: '' },
  defaultAddress: {
    district: { type: String, default: '' },
    area: { type: String, default: '' },
    fullAddress: { type: String, default: '' }
  },
  totalOrdersCount: { type: Number, default: 0 },
  totalSpentAmount: { type: Number, default: 0 }, // in BDT integer units
  firstOrderAt: { type: Date, default: null },
  lastOrderAt: { type: Date, default: null },
  assignedReferralCode: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
