const mongoose = require('mongoose');

const fundAllocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  percentage: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  fixedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  isPercentage: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#4A102A'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FundAllocation', fundAllocationSchema);
