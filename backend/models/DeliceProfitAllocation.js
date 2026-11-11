const mongoose = require('mongoose');

const employeeAllocationSchema = new mongoose.Schema({
  slot: { type: Number, required: true },
  name: { type: String, required: true },
  percentage: { type: Number, required: true, default: 15 },
  amount: { type: Number, required: true }
}, { _id: false });

const deliceProfitAllocationSchema = new mongoose.Schema({
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
    comment: 'Strict idempotency key to prevent double allocation (e.g. ORDER_ITEM_ID)'
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true,
    index: true
  },
  transactionId: {
    type: String,
    default: ''
  },
  customerName: {
    type: String,
    default: 'Customer'
  },
  customerPhone: {
    type: String,
    default: ''
  },
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  bottlesSold: {
    type: Number,
    required: true,
    min: 1
  },
  unitSellingPrice: {
    type: Number,
    required: true,
    comment: 'Actual selling price per bottle (excludes delivery fee)'
  },
  totalRevenue: {
    type: Number,
    required: true,
    comment: 'unitSellingPrice * bottlesSold'
  },
  unitPrincipalRepaid: {
    type: Number,
    required: true,
    comment: 'Principal repayment per bottle (capped at outstanding balance)'
  },
  totalPrincipalRepaid: {
    type: Number,
    required: true,
    comment: 'unitPrincipalRepaid * bottlesSold'
  },
  unitDistributableProfit: {
    type: Number,
    required: true,
    comment: 'unitSellingPrice - unitPrincipalRepaid'
  },
  totalDistributableProfit: {
    type: Number,
    required: true,
    comment: 'totalRevenue - totalPrincipalRepaid'
  },
  // Fund breakdown for this sale (reconciled exact sum)
  fundAllocations: {
    financeMember: { type: Number, required: true }, // 10%
    developmentFund: { type: Number, required: true }, // 20%
    employeeSalaryFund: { type: Number, required: true }, // 60%
    charityFund: { type: Number, required: true }, // 3%
    marketingFund: { type: Number, required: true }, // 5%
    reserveFund: { type: Number, required: true } // 2%
  },
  employeeBreakdown: [employeeAllocationSchema],
  // Snapshot of settings at time of sale
  settingsSnapshot: {
    initialPrincipal: Number,
    unitCost: Number,
    profitPerBottle: Number,
    fundPercentages: mongoose.Schema.Types.Mixed,
    employees: [mongoose.Schema.Types.Mixed],
    postRepaymentPolicy: String
  },
  isReversal: {
    type: Boolean,
    default: false,
    index: true
  },
  reversalOf: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeliceProfitAllocation', deliceProfitAllocationSchema);
