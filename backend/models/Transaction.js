const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'BDT'
  },
  status: {
    type: String,
    enum: ['INITIATED', 'VALID', 'FAILED', 'CANCELLED', 'REFUNDED'],
    default: 'INITIATED',
    index: true
  },
  paymentMethod: {
    type: String
  },
  bankTranId: {
    type: String
  },
  valId: {
    type: String
  },
  cardType: {
    type: String
  },
  cardBrand: {
    type: String
  },
  rawResponse: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
