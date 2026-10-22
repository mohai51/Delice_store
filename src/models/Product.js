const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  size: { type: String, required: true }, // e.g., '50ml', '100ml'
  volumeMl: { type: Number, required: true },
  price: { type: Number, required: true }, // in BDT integer units (e.g. 8500)
  salePrice: { type: Number, default: null }, // optional genuine sale price
  stock: { type: Number, required: true, default: 0 },
  sku: { type: String, required: true }
});

const ProductImageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  altText: { type: String, default: '' },
  isPrimary: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  sku: { type: String, required: true, trim: true },
  scentFamily: { type: String, required: true }, // e.g., 'Fresh Woody', 'Amber Floral'
  shortDescription: { type: String, required: true },
  fullDescription: { type: String, required: true },
  scentNotes: {
    top: [{ type: String }],
    heart: [{ type: String }],
    base: [{ type: String }]
  },
  ingredients: [{ type: String }],
  variants: [VariantSchema],
  images: [ProductImageSchema],
  isFeatured: { type: Boolean, default: false },
  featuredOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProductSchema.index({ slug: 1 });
ProductSchema.index({ status: 1, isFeatured: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
