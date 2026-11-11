const mongoose = require('mongoose');

const deliceProfitAuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true // 'SETTINGS_UPDATE', 'EMPLOYEE_RENAME', 'REVERSAL', 'EXPENSE_RECORDED'
  },
  performedBy: {
    type: String,
    default: 'Admin'
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeliceProfitAuditLog', deliceProfitAuditLogSchema);
