const mongoose = require('mongoose');

const CommissionPayoutSchema = new mongoose.Schema({
  payoutReference: { type: String, required: true, unique: true }, // e.g., PAY-2026-XXXX
  referralCode: { type: String, required: true },
  recipientName: { type: String, required: true },
  recipientPhone: { type: String, required: true },
  payoutMethod: { type: String, enum: ['bkash', 'nagad', 'bank_transfer', 'cash'], required: true },
  accountNumber: { type: String, required: true },
  amount: { type: Number, required: true }, // in BDT integer units
  orderReferences: [{ type: String }], // references of settled orders
  processedByAdmin: { type: String, required: true },
  transactionId: { type: String, default: '' },
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.CommissionPayout || mongoose.model('CommissionPayout', CommissionPayoutSchema);
