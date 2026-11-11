const mongoose = require('mongoose');

const employeeSlotSchema = new mongoose.Schema({
  slot: { type: Number, required: true }, // 1, 2, 3, 4
  name: { type: String, required: true, default: 'Employee' },
  percentage: { type: Number, required: true, default: 15 } // 15% of total distributable profit
}, { _id: false });

const deliceProfitSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'delice_default_settings'
  },
  initialPrincipal: {
    type: Number,
    required: true,
    default: 73260,
    comment: 'Initial investment / principal (৳73,260)'
  },
  totalInitialStock: {
    type: Number,
    required: true,
    default: 100,
    comment: 'Total initial stock (100 bottles)'
  },
  defaultSellingPrice: {
    type: Number,
    required: true,
    default: 799,
    comment: 'Selling price per bottle (৳799)'
  },
  unitCost: {
    type: Number,
    required: true,
    default: 732.60,
    comment: 'Unit cost / principal repayment per bottle (৳732.60)'
  },
  profitPerBottle: {
    type: Number,
    required: true,
    default: 66.40,
    comment: 'Distributable profit per bottle (৳799 - ৳732.60 = ৳66.40)'
  },
  // Fund distribution percentages (Must sum to 100%)
  fundPercentages: {
    financeMember: { type: Number, default: 10 }, // NirmAN Finance Member Profit (10%)
    developmentFund: { type: Number, default: 20 }, // DÉLICE Development Fund (20%)
    employeeSalaryFund: { type: Number, default: 60 }, // Employee Salary Fund (60%)
    charityFund: { type: Number, default: 3 }, // Charity Fund (3%)
    marketingFund: { type: Number, default: 5 }, // Marketing Fund (5%)
    reserveFund: { type: Number, default: 2 } // Reserve & Emergency Fund (2%)
  },
  employees: {
    type: [employeeSlotSchema],
    default: () => [
      { slot: 1, name: 'Employee 1', percentage: 15 },
      { slot: 2, name: 'Employee 2', percentage: 15 },
      { slot: 3, name: 'Employee 3', percentage: 15 },
      { slot: 4, name: 'Employee 4', percentage: 15 }
    ]
  },
  postRepaymentPolicy: {
    type: String,
    enum: ['full_revenue_as_profit', 'development_fund_boost'],
    default: 'full_revenue_as_profit',
    comment: 'Policy after principal is 100% repaid: all revenue becomes distributable profit or principal part goes to development'
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeliceProfitSetting', deliceProfitSettingSchema);
