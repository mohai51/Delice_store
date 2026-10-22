const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  adminUsername: { type: String, required: true },
  action: { type: String, required: true }, // e.g., 'UPDATE_PRODUCT', 'PUBLISH_HOMEPAGE', 'REFUND_ORDER'
  targetType: { type: String, required: true }, // e.g., 'product', 'order', 'homepage', 'settings'
  targetId: { type: String, default: '' },
  details: { type: Object, default: {} },
  ipAddress: { type: String, default: '127.0.0.1' },
  createdAt: { type: Date, default: Date.now }
});

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
