const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'courier',           // Actual shipping fee paid to courier
      'product_cogs',      // Manufacturing / compounding / bottle packaging
      'packaging',         // Boxes, bubble wrap, labels
      'marketing',         // Facebook / Instagram ads, campus promos
      'payment_gateway',   // Transaction fees
      'operational',       // Storage, logistics
      'other'
    ],
    required: true,
    default: 'other'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  note: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
