const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  dimensions: {
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, default: null },
  optimizedWebpUrl: { type: String, default: null },
  altText: { type: String, default: '' },
  usedIn: [{ type: String }], // references like 'product:delice-01', 'homepage:hero'
  uploadedBy: { type: String, default: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Media || mongoose.model('Media', MediaSchema);
