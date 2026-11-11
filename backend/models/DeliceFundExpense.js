const mongoose = require('mongoose');

const deliceFundExpenseSchema = new mongoose.Schema({
  fundKey: {
    type: String,
    required: true,
    enum: ['developmentFund', 'marketingFund', 'charityFund', 'reserveFund', 'financeMember', 'employeeSalaryFund'],
    index: true
  },
  fundName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  expenseDate: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    default: 'General'
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  recordedBy: {
    type: String,
    default: 'Admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeliceFundExpense', deliceFundExpenseSchema);
