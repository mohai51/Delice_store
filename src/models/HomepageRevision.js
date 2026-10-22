const mongoose = require('mongoose');

const HomepageRevisionSchema = new mongoose.Schema({
  revisionId: { type: String, required: true, unique: true },
  snapshot: { type: Object, required: true },
  adminUsername: { type: String, default: 'Admin' },
  note: { type: String, default: 'Snapshot before publish' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.HomepageRevision || mongoose.model('HomepageRevision', HomepageRevisionSchema);
