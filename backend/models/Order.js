const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  volume: {
    type: String,
    default: '30ml'
  },
  price: {
    type: Number,
    required: true,
    comment: 'Snapshot price at purchase time'
  },
  originalPrice: {
    type: Number,
    required: true
  },
  cogs: {
    type: Number,
    required: true,
    default: 320,
    comment: 'Snapshot product unit cost at purchase time'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  itemTotal: {
    type: Number,
    required: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  customer: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    district: { type: String, required: true },
    address: { type: String, required: true },
    orderNotes: { type: String }
  },
  items: [orderItemSchema],
  productSubtotal: {
    type: Number,
    required: true
  },
  deliveryArea: {
    type: String,
    enum: ['insideDhaka', 'outsideDhaka'],
    required: true
  },
  deliveryCharge: {
    type: Number,
    required: true,
    comment: 'Snapshot delivery charge collected'
  },
  totalPayable: {
    type: Number,
    required: true
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  // Bangladesh Payment Architecture (100% Online vs COD with Advance Delivery Fee)
  paymentMethod: {
    type: String,
    enum: ['full_online', 'cod_advance', 'sslcommerz'],
    default: 'full_online',
    index: true
  },
  paymentProvider: {
    type: String,
    enum: ['bkash', 'nagad', 'sslcommerz', 'other'],
    default: 'bkash'
  },
  senderNumber: {
    type: String,
    trim: true
  },
  advancePaid: {
    type: Number,
    default: 0,
    comment: 'Amount received in advance via bKash/Nagad (100% for full_online, or delivery fee for COD)'
  },
  cashDueOnDelivery: {
    type: Number,
    default: 0,
    comment: 'Cash amount courier rider must collect upon parcel handover'
  },
  // Financial breakdown snapshots
  totalProductCost: {
    type: Number,
    default: 0,
    comment: 'Snapshot sum of item cogs * quantity'
  },
  actualCourierCost: {
    type: Number,
    default: 0,
    comment: 'Actual expense paid to courier partner (e.g. Steadfast, Pathao)'
  },
  gatewayFee: {
    type: Number,
    default: 0,
    comment: 'SSLCOMMERZ transaction fee (e.g. 2.5% on successful charge)'
  },
  netProfit: {
    type: Number,
    default: 0,
    comment: 'Real net profit = totalPaid - totalProductCost - actualCourierCost - gatewayFee'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'awaiting_verification', 'paid', 'failed', 'refunded'],
    default: 'awaiting_verification',
    index: true
  },
  orderStatus: {
    type: String,
    enum: ['pending_payment', 'awaiting_verification', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'awaiting_verification',
    index: true
  },
  paymentDetails: {
    bankTranId: String,
    cardType: String,
    cardBrand: String,
    valId: String,
    validatedAt: Date,
    rawPayload: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
