const mongoose = require('mongoose');

const InventoryAdjustmentSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  variantSize: { type: String, required: true },
  sku: { type: String, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  delta: { type: Number, required: true },
  reason: { type: String, required: true }, // e.g. 'manual_restock', 'order_placed', 'order_cancelled_restock', 'spoilage_damage'
  adminUsername: { type: String, default: 'System' },
  orderReference: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

InventoryAdjustmentSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.models.InventoryAdjustment || mongoose.model('InventoryAdjustment', InventoryAdjustmentSchema);
