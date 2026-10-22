const mongoose = require('mongoose');

const OrderItemSnapshotSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  slug: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: String, required: true },
  sku: { type: String, required: true },
  unitPrice: { type: Number, required: true }, // in BDT integer minor units
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },
  imageUrl: { type: String }
});

const OrderStatusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  type: { type: String, enum: ['fulfillment', 'payment', 'system', 'note'], default: 'fulfillment' },
  note: { type: String, default: '' },
  adminUsername: { type: String, default: 'System' },
  timestamp: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  orderReference: { type: String, required: true, unique: true }, // e.g., DEL-2026-XXXXX
  trackingToken: { type: String, required: true, unique: true }, // unguessable tracking token
  idempotencyKey: { type: String, default: null }, // prevents duplicate order placement
  
  customer: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    district: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    fullAddress: { type: String, required: true, trim: true }
  },

  items: [OrderItemSnapshotSchema],

  pricing: {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, required: true },
    total: { type: Number, required: true }
  },

  payment: {
    method: { type: String, enum: ['cod', 'bkash_manual'], required: true },
    status: { 
      type: String, 
      enum: ['unpaid', 'pending_verification', 'paid', 'refunded'], 
      default: 'unpaid' 
    },
    bkashSenderNumber: { type: String, default: '' },
    bkashTrxId: { type: String, default: '' },
    paymentVerifiedAt: { type: Date, default: null },
    paymentVerifiedBy: { type: String, default: null },
    refundAmount: { type: Number, default: 0 },
    refundedAt: { type: Date, default: null },
    refundReason: { type: String, default: '' }
  },

  fulfillment: {
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    courierName: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    stockRestocked: { type: Boolean, default: false }
  },

  referral: {
    code: { type: String, default: null },
    referrerId: { type: String, default: null },
    commissionRatePercent: { type: Number, default: 0 },
    refereeDiscountPercent: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['none', 'pending', 'eligible', 'approved', 'paid', 'voided'], 
      default: 'none' 
    },
    eligibleAt: { type: Date, default: null }, // After delivery + return period
    payoutId: { type: String, default: null }
  },

  orderNotes: { type: String, default: '' },
  internalNotes: { type: String, default: '' },
  statusHistory: [OrderStatusHistorySchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

OrderSchema.index({ orderReference: 1 });
OrderSchema.index({ trackingToken: 1 });
OrderSchema.index({ 'customer.phone': 1 });
OrderSchema.index({ 'fulfillment.status': 1 });
OrderSchema.index({ 'payment.status': 1 });
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
