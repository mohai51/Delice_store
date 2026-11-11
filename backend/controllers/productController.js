const Product = require('../models/Product');
const { memoryStore, isConnected } = require('../config/db');

// Fallback seed products matching prompt & Brand Book
const DEFAULT_PRODUCTS = [
  {
    id: 'delice-bloom',
    name: 'DÉLICE BLOOM',
    tagline: 'Sweet, Soft & Romantic',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    cogs: 320,
    description: 'A sweet, soft fragrance for everyday use and formal occasions.',
    occasions: ['Everyday use', 'University', 'Formal occasions', 'Daytime outings'],
    mood: 'romantic',
    image: '/assets/images/uploads/delice_Bottle-1_1794420148574.png',
    images: [
      '/assets/images/uploads/delice_Bottle-1_1794420148574.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyLight_1794416616204.png',
      '/assets/images/uploads/delice_DLICEinburgundyshadows_1794416567005.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyShadows_1794416637826.png'
    ],
    stock: 120,
    isActive: true,
    badge: 'Opening Offer'
  },
  {
    id: 'delice-momentum',
    name: 'DÉLICE MOMENTUM',
    tagline: 'Bold, Strong & Resilient',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    cogs: 320,
    description: 'A bold, strong fragrance for busy days, outdoor activities, demanding workdays, and situations involving heat, traffic, and movement.',
    occasions: ['Busy schedules', 'Outdoor activities', 'Workdays', 'Active lifestyles'],
    mood: 'energetic',
    image: '/assets/images/uploads/delice_Bottle-2_1794420107446.png',
    images: [
      '/assets/images/uploads/delice_Bottle-2_1794420107446.png',
      '/assets/images/uploads/delice_DLICEinburgundyshadows_1794416567005.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyLight_1794416616204.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyShadows_1794416637826.png'
    ],
    stock: 100,
    isActive: true,
    badge: 'Opening Offer'
  },
  {
    id: 'delice-enigma',
    name: 'DÉLICE ENIGMA',
    tagline: 'Sophisticated & Intimate',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    cogs: 320,
    description: 'A sophisticated fragrance for evenings, romantic occasions, dates, and formal events.',
    occasions: ['Evening occasions', 'Dates', 'Romantic moments', 'Formal events'],
    mood: 'evening',
    image: '/assets/images/uploads/delice_Bottle-3_1794420022409.png',
    images: [
      '/assets/images/uploads/delice_Bottle-3_1794420022409.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyShadows_1794416637826.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyLight_1794416616204.png',
      '/assets/images/uploads/delice_DLICEinburgundyshadows_1794416567005.png'
    ],
    stock: 90,
    isActive: true,
    badge: 'Opening Offer'
  }
];

/**
 * Get all active products
 */
exports.getAllProducts = async (req, res) => {
  try {
    if (isConnected()) {
      const products = await Product.find({ isActive: true });
      if (products && products.length > 0) {
        // Auto-heal images array if empty on older MongoDB Atlas records
        for (const p of products) {
          if (!p.images || p.images.length === 0) {
            const def = DEFAULT_PRODUCTS.find(d => d.id === p.id);
            if (def && def.images) {
              p.images = def.images;
              await Product.updateOne({ _id: p._id }, { $set: { images: def.images } });
            }
          }
        }
        return res.json(products);
      }
    }
    const mem = memoryStore.products.filter(p => p.isActive !== false);
    res.json(mem.length ? mem : DEFAULT_PRODUCTS);
  } catch (err) {
    res.json(DEFAULT_PRODUCTS);
  }
};

/**
 * Get all products for Admin
 */
exports.getAdminProducts = async (req, res) => {
  try {
    if (isConnected()) {
      const products = await Product.find().sort({ createdAt: -1 });
      if (products && products.length > 0) {
        // Auto-heal images array if empty on older MongoDB Atlas records
        for (const p of products) {
          if (!p.images || p.images.length === 0) {
            const def = DEFAULT_PRODUCTS.find(d => d.id === p.id);
            if (def && def.images) {
              p.images = def.images;
              await Product.updateOne({ _id: p._id }, { $set: { images: def.images } });
            }
          }
        }
        return res.json(products);
      }
    }
    res.json(memoryStore.products.length ? memoryStore.products : DEFAULT_PRODUCTS);
  } catch (err) {
    res.json(DEFAULT_PRODUCTS);
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    let product = null;
    if (isConnected()) {
      product = await Product.findOne({ id: id.toLowerCase() });
      if (product && (!product.images || product.images.length === 0)) {
        const def = DEFAULT_PRODUCTS.find(d => d.id === product.id);
        if (def && def.images) {
          product.images = def.images;
          await Product.updateOne({ _id: product._id }, { $set: { images: def.images } });
        }
      }
    }
    if (!product) {
      product = (memoryStore.products.length ? memoryStore.products : DEFAULT_PRODUCTS).find(p => p.id === id.toLowerCase());
    }
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    res.json(product);
  } catch (err) {
    const p = DEFAULT_PRODUCTS.find(p => p.id === req.params.id.toLowerCase());
    if (p) return res.json(p);
    res.status(404).json({ success: false, error: 'Product not found.' });
  }
};

/**
 * Create new product (Admin)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { id, name, tagline, volume, originalPrice, price, cogs, description, occasions, tags, mood, image, images, stock, badge } = req.body;

    if (!id || !name || !description || price === undefined) {
      return res.status(400).json({ success: false, error: 'Please provide ID, Name, Description and Price.' });
    }

    const imgs = Array.isArray(images) && images.length > 0 
      ? images.filter(Boolean) 
      : (image ? [image] : ['/assets/images/bloom.svg']);

    const occasionList = occasions || tags;

    const prodData = {
      id: id.toLowerCase().trim(),
      name: name.trim(),
      tagline: tagline ? tagline.trim() : '',
      volume: volume || '30ml',
      originalPrice: Number(originalPrice) || 850,
      price: Number(price),
      cogs: Number(cogs) || 320,
      description: description.trim(),
      occasions: Array.isArray(occasionList) ? occasionList : (occasionList ? occasionList.split(',').map(s => s.trim()).filter(Boolean) : []),
      mood: mood || 'general',
      image: imgs[0] || image || '/assets/images/bloom.svg',
      images: imgs,
      stock: Number(stock) || 100,
      badge: badge || 'Opening Offer',
      isActive: true
    };

    let product;
    if (isConnected()) {
      try {
        product = await Product.findOneAndUpdate(
          { id: prodData.id },
          { $set: prodData },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (e) {
        product = prodData;
        const existingIdx = memoryStore.products.findIndex(p => p.id === prodData.id);
        if (existingIdx > -1) memoryStore.products[existingIdx] = prodData;
        else memoryStore.products.push(product);
      }
    } else {
      product = prodData;
      const existingIdx = memoryStore.products.findIndex(p => p.id === prodData.id);
      if (existingIdx > -1) memoryStore.products[existingIdx] = prodData;
      else memoryStore.products.push(product);
    }

    res.status(201).json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

/**
 * Update product (Admin)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    if (updateData.tags && !updateData.occasions) {
      updateData.occasions = updateData.tags;
    }
    if (typeof updateData.occasions === 'string') {
      updateData.occasions = updateData.occasions.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (Array.isArray(updateData.images) && updateData.images.length > 0) {
      updateData.images = updateData.images.filter(Boolean);
      updateData.image = updateData.images[0];
    } else if (updateData.image) {
      updateData.images = [updateData.image];
    }

    let product;

    if (isConnected()) {
      try {
        const mongoose = require('mongoose');
        const filter = mongoose.Types.ObjectId.isValid(id)
          ? { $or: [{ id: id.toLowerCase() }, { _id: id }] }
          : { id: id.toLowerCase() };
        product = await Product.findOneAndUpdate(filter, { $set: updateData }, { new: true });
      } catch (e) {
        console.error('Error in Product.findOneAndUpdate:', e);
      }
    }

    if (!product) {
      const idx = (memoryStore.products.length ? memoryStore.products : DEFAULT_PRODUCTS).findIndex(p => p.id === id.toLowerCase() || p._id === id);
      if (idx > -1) {
        if (!memoryStore.products.length) memoryStore.products = [...DEFAULT_PRODUCTS];
        memoryStore.products[idx] = { ...memoryStore.products[idx], ...updateData };
        product = memoryStore.products[idx];
      }
    }

    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete product (Admin)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isConnected()) {
      try {
        const mongoose = require('mongoose');
        const filter = mongoose.Types.ObjectId.isValid(id)
          ? { $or: [{ id: id.toLowerCase() }, { _id: id }] }
          : { id: id.toLowerCase() };
        await Product.deleteOne(filter);
      } catch (e) {}
    }
    memoryStore.products = memoryStore.products.filter(p => p.id !== id.toLowerCase() && p._id !== id);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
