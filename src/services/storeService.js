const crypto = require('crypto');
const { getIsConnected, localStore } = require('../config/db');

// Mongoose Models
const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Homepage = require('../models/Homepage');
const HomepageRevision = require('../models/HomepageRevision');
const Media = require('../models/Media');
const Customer = require('../models/Customer');
const ReferralCode = require('../models/ReferralCode');
const CommissionPayout = require('../models/CommissionPayout');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');
const InventoryAdjustment = require('../models/InventoryAdjustment');

// Helper to generate IDs
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// Helper to generate unpredictable luxury order reference e.g. DEL-2026-89412
function generateOrderReference() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `DEL-${year}-${rand}`;
}

// Generate crypto tracking token
function generateTrackingToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Clean sanitization for text inputs to prevent XSS / script injection
function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '')
    .trim();
}

class StoreService {
  // ==========================================
  // SETTINGS
  // ==========================================
  async getSettings() {
    if (getIsConnected()) {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }
      return settings;
    }

    if (!localStore.data.settings) {
      localStore.data.settings = {
        _id: generateId('sett'),
        storeName: 'DÉLICE',
        tagline: 'Haute Parfumerie Bangladesh',
        currency: 'BDT',
        currencySymbol: '৳',
        brandColors: {
          backgroundIvory: '#F9F6F0',
          deepBlack: '#141414',
          champagneGold: '#C5A880'
        },
        contact: {
          email: 'concierge@deliceparfums.com',
          phone: '+880 1712 000 000',
          whatsapp: '+8801712000000',
          address: 'House 14, Road 71, Gulshan 2, Dhaka 1212',
          instagram: 'https://instagram.com/deliceparfums',
          facebook: 'https://facebook.com/deliceparfums'
        },
        deliveryZones: [
          { id: 'dhaka_metro', name: 'Inside Dhaka Metropolitan Area', charge: 80, estimatedDays: '1-2 business days' },
          { id: 'outside_dhaka', name: 'Outside Dhaka (All Bangladesh Districts)', charge: 150, estimatedDays: '3-4 business days' }
        ],
        freeDeliveryThreshold: 5000,
        paymentMethods: {
          cod: {
            enabled: true,
            title: 'Cash on Delivery',
            description: 'Inspect package upon arrival and pay courier in cash.'
          },
          bkashManual: {
            enabled: true,
            title: 'Manual bKash Send Money',
            number: '01712000000',
            accountType: 'Personal / Merchant',
            instructions: 'Send the exact order total to our bKash number. Then input your sending bKash number and Transaction ID (TrxID) below. Never share your bKash PIN or OTP with anyone. Your order will be verified by our concierge before dispatch.'
          }
        },
        policies: {
          delivery: 'Delivery within Dhaka metropolitan area is fulfilled within 24 to 48 hours. Orders across other districts in Bangladesh are delivered within 3 to 5 business days via secure temperature-controlled courier partners.',
          returns: 'Given the intimate and fragile nature of haute perfumery, bottles may be returned within 7 calendar days of receipt only if the cellophane security seal remains unbroken and intact. Damaged transit claims must be reported within 24 hours of delivery.',
          privacy: 'DÉLICE safeguards client privacy with paramount discretion. We only record information strictly necessary to fulfill delivery and verify transactions. We do not sell, rent, or distribute personal data.',
          terms: 'All fragrance formulations, photographic assets, and brand marks are exclusive intellectual property of DÉLICE. Order confirmation constitutes an offer to purchase subject to product availability and payment verification.'
        },
        referralRules: {
          commissionPercent: 5,
          refereeDiscountPercent: 10,
          returnPeriodDays: 7
        },
        seoDefaults: {
          title: 'DÉLICE — Quiet Luxury Perfumery',
          description: 'Exquisite haute fragrances inspired by French craftsmanship and bottled for discerning patrons in Bangladesh.',
          ogImageUrl: '/images/hero-desktop.jpg'
        },
        analyticsRetentionDays: 90,
        updatedAt: new Date().toISOString(),
        updatedBy: 'System'
      };
      localStore.save();
    }
    return localStore.data.settings;
  }

  async updateSettings(updates, adminUsername = 'Admin') {
    updates.updatedAt = new Date();
    updates.updatedBy = adminUsername;

    if (getIsConnected()) {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings(updates);
      } else {
        Object.assign(settings, updates);
      }
      return await settings.save();
    }

    const current = await this.getSettings();
    localStore.data.settings = Object.assign({}, current, updates);
    localStore.save();
    return localStore.data.settings;
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  async getProducts({ status, isFeatured, includeArchived = false } = {}) {
    if (getIsConnected()) {
      const query = {};
      if (status) query.status = status;
      if (!includeArchived && !status) query.status = { $ne: 'archived' };
      if (typeof isFeatured === 'boolean') query.isFeatured = isFeatured;
      return await Product.find(query).sort({ featuredOrder: 1, createdAt: -1 });
    }

    let list = localStore.getCollection('products');
    return list.filter(p => {
      if (!includeArchived && !status && p.status === 'archived') return false;
      if (status && p.status !== status) return false;
      if (typeof isFeatured === 'boolean' && p.isFeatured !== isFeatured) return false;
      return true;
    }).sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));
  }

  async getProductBySlug(slug) {
    if (getIsConnected()) {
      return await Product.findOne({ slug });
    }
    const list = localStore.getCollection('products');
    return list.find(p => p.slug === slug) || null;
  }

  async getProductById(id) {
    if (!id) return null;
    const mongoose = require('mongoose');
    if (getIsConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        const prod = await Product.findById(id);
        if (prod) return prod;
      }
      return await Product.findOne({
        $or: [
          { slug: id },
          { name: id }
        ]
      });
    }
    const list = localStore.getCollection('products');
    return list.find(p => p._id === id || p.id === id || p.slug === id) || null;
  }

  async createProduct(data, adminUsername = 'Admin') {
    const slug = (data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '');
    const productData = {
      ...data,
      slug,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (getIsConnected()) {
      delete productData._id;
      return await Product.create(productData);
    }

    productData._id = generateId('prod');
    localStore.getCollection('products').push(productData);
    localStore.save();
    return productData;
  }

  async updateProduct(id, updates, adminUsername = 'Admin') {
    updates.updatedAt = new Date();

    if (getIsConnected()) {
      return await Product.findByIdAndUpdate(id, updates, { new: true });
    }

    const list = localStore.getCollection('products');
    const idx = list.findIndex(p => p._id === id || p.id === id);
    if (idx === -1) throw new Error('Product not found');
    list[idx] = Object.assign({}, list[idx], updates);
    localStore.save();
    return list[idx];
  }

  async deleteProduct(id, adminUsername = 'Admin') {
    let removed = null;
    if (getIsConnected()) {
      removed = await Product.findByIdAndDelete(id);
    } else {
      const list = localStore.getCollection('products');
      const idx = list.findIndex(p => p._id === id || p.id === id);
      if (idx !== -1) {
        removed = list.splice(idx, 1)[0];
        localStore.save();
      }
    }
    if (!removed) throw new Error('Product not found or already deleted');
    return removed;
  }

  async adjustStock({ productId, variantSize, newStock, reason, adminUsername = 'Admin', orderReference = null }) {
    let product = await this.getProductById(productId);
    if (!product) throw new Error('Product not found');

    const variant = (product.variants || []).find(v => v.size === variantSize);
    if (!variant) throw new Error(`Variant ${variantSize} not found for product`);

    const prevStock = variant.stock;
    const delta = newStock - prevStock;
    variant.stock = Math.max(0, newStock);

    const adjustmentRecord = {
      productId: product._id ? product._id.toString() : productId,
      productName: product.name,
      variantSize,
      sku: variant.sku || `${product.slug}-${variant.size}`.toUpperCase(),
      previousStock: prevStock,
      newStock: variant.stock,
      delta,
      reason: sanitizeText(reason),
      adminUsername,
      orderReference,
      createdAt: new Date()
    };

    if (getIsConnected()) {
      delete adjustmentRecord._id;
      await Product.findByIdAndUpdate(product._id, { variants: product.variants, updatedAt: new Date() });
      await InventoryAdjustment.create(adjustmentRecord);
    } else {
      adjustmentRecord._id = generateId('adj');
      await this.updateProduct(product._id || productId, { variants: product.variants });
      localStore.getCollection('inventoryAdjustments').unshift(adjustmentRecord);
      localStore.save();
    }

    return { product, adjustmentRecord };
  }

  async getStockAdjustments(productId = null) {
    if (getIsConnected()) {
      const q = productId ? { productId } : {};
      return await InventoryAdjustment.find(q).sort({ createdAt: -1 }).limit(100);
    }
    const list = localStore.getCollection('inventoryAdjustments');
    if (productId) {
      return list.filter(a => a.productId === productId);
    }
    return list.slice(0, 100);
  }

  // ==========================================
  // HOMEPAGE & REVISIONS
  // ==========================================
  async getHomepage({ isDraft = false } = {}) {
    if (getIsConnected()) {
      let home = await Homepage.findOne({ isPublished: !isDraft }).sort({ updatedAt: -1 });
      if (!home && !isDraft) {
        // Fallback to any homepage or default
        home = await Homepage.findOne().sort({ updatedAt: -1 });
      }
      if (!home) {
        home = await Homepage.create({});
      }
      if (home && home.hero && (!home.hero.slides || home.hero.slides.length === 0)) {
        home.hero.slides = [
          { id: 'slide-1', imageUrl: home.hero.desktopImageUrl || '/images/hero-desktop.jpg', title: home.hero.headline || 'A Signature, Remembered.', subtitle: home.hero.description || 'Haute Parfumerie Bangladesh', link: home.hero.ctaLink || '#collection' },
          { id: 'slide-2', imageUrl: '/images/brand-story.jpg', title: 'The Philosophy of Quiet Luxury', subtitle: 'Raw Essence, Meticulous Restraint', link: '#story' }
        ];
      }
      return home;
    }

    if (!localStore.data.homepage) {
      localStore.data.homepage = {
        _id: generateId('home'),
        version: 1,
        isPublished: true,
        announcementBar: {
          enabled: true,
          text: 'Complimentary white-glove courier across Bangladesh on orders over ৳5,000',
          linkUrl: '#collection'
        },
        hero: {
          desktopImageUrl: '/images/hero-desktop.jpg',
          mobileImageUrl: '/images/hero-desktop.jpg',
          focalPoint: { x: 50, y: 50 },
          headline: 'A Signature, Remembered.',
          description: 'Quiet luxury fragrances distilled in Grasse, bottled for the discerning connoisseur in Bangladesh.',
          ctaText: 'Discover DÉLICE',
          ctaLink: '#collection',
          slides: [
            { id: 'slide-1', imageUrl: '/images/hero-desktop.jpg', title: 'A Signature, Remembered.', subtitle: 'Haute Parfumerie Bangladesh', link: '#collection' },
            { id: 'slide-2', imageUrl: '/images/brand-story.jpg', title: 'The Philosophy of Quiet Luxury', subtitle: 'Raw Essence, Meticulous Restraint', link: '#story' }
          ]
        },
        featuredProducts: ['delice-no-01', 'delice-no-02'],
        brandStory: {
          enabled: true,
          title: 'The Philosophy of Quiet Luxury',
          subtitle: 'Pure Essence, Sublime Restraint',
          paragraph1: 'At DÉLICE, perfume is neither an ornament nor an imposition. It is an intimate aura, composed of rare raw botanicals and precious resins harvested by historic French distillers.',
          paragraph2: 'Each batch is matured in small casks to allow subtle nuances to harmonize, honoring centuries of Grasse craftsmanship while attuned to the tropical cadence of Bangladesh.',
          imageUrl: '/images/brand-story.jpg'
        },
        customerExperiences: {
          enabled: false, // Explicitly hidden until genuine patron reviews are approved
          title: 'Patron Impressions',
          subtitle: 'Verified Customer Reflections',
          items: []
        },
        footer: {
          aboutText: 'DÉLICE — Quiet luxury haute perfumery. Crafted with artistic restraint.',
          contactEmail: 'concierge@deliceparfums.com',
          contactPhone: '+880 1712 000 000',
          address: 'House 14, Road 71, Gulshan 2, Dhaka 1212',
          instagramUrl: 'https://instagram.com/deliceparfums',
          facebookUrl: 'https://facebook.com/deliceparfums',
          whatsappNumber: '+8801712000000',
          newsletterEnabled: true
        },
        sectionOrder: ['announcement', 'hero', 'collection', 'story', 'experiences', 'footer'],
        sectionVisibility: {
          announcement: true,
          hero: true,
          collection: true,
          story: true,
          experiences: false,
          footer: true
        },
        savedBy: 'System',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localStore.save();
    }

    const target = (isDraft && localStore.data.homepageDraft) ? localStore.data.homepageDraft : localStore.data.homepage;
    if (target && target.hero && (!target.hero.slides || target.hero.slides.length === 0)) {
      target.hero.slides = [
        { id: 'slide-1', imageUrl: target.hero.desktopImageUrl || '/images/hero-desktop.jpg', title: target.hero.headline || 'A Signature, Remembered.', subtitle: 'Haute Parfumerie Bangladesh', link: target.hero.ctaLink || '#collection' }
      ];
    }
    return target;
  }

  async saveHomepageDraft(draftData, adminUsername = 'Admin') {
    draftData.updatedAt = new Date();
    draftData.savedBy = adminUsername;
    draftData.isPublished = false;

    if (getIsConnected()) {
      let draft = await Homepage.findOne({ isPublished: false });
      if (!draft) {
        draft = new Homepage(draftData);
      } else {
        Object.assign(draft, draftData);
      }
      return await draft.save();
    }

    localStore.data.homepageDraft = Object.assign({}, localStore.data.homepageDraft || {}, draftData);
    localStore.save();
    return localStore.data.homepageDraft;
  }

  async publishHomepage(adminUsername = 'Admin', note = 'Published updates') {
    const draft = await this.getHomepage({ isDraft: true });
    const currentPublished = await this.getHomepage({ isDraft: false });

    // Create revision snapshot of the currently published version before overwriting
    const revision = {
      revisionId: `rev_${Date.now()}`,
      snapshot: JSON.parse(JSON.stringify(currentPublished)),
      adminUsername,
      note,
      createdAt: new Date()
    };

    const publishData = Object.assign({}, draft, {
      isPublished: true,
      publishedAt: new Date(),
      updatedAt: new Date(),
      savedBy: adminUsername,
      version: (currentPublished.version || 1) + 1
    });

    if (getIsConnected()) {
      delete revision._id;
      await HomepageRevision.create(revision);
      let published = await Homepage.findOne({ isPublished: true });
      if (!published) {
        published = new Homepage(publishData);
      } else {
        Object.assign(published, publishData);
      }
      await published.save();
      return published;
    }

    revision._id = generateId('rev');
    localStore.getCollection('homepageRevisions').unshift(revision);
    localStore.data.homepage = JSON.parse(JSON.stringify(publishData));
    localStore.data.homepageDraft = null; // Clear draft once published
    localStore.save();
    return localStore.data.homepage;
  }

  async getHomepageRevisions() {
    if (getIsConnected()) {
      return await HomepageRevision.find().sort({ createdAt: -1 }).limit(30);
    }
    return localStore.getCollection('homepageRevisions').slice(0, 30);
  }

  async restoreHomepageRevision(revisionId, adminUsername = 'Admin') {
    let rev;
    if (getIsConnected()) {
      rev = await HomepageRevision.findOne({ revisionId });
    } else {
      const list = localStore.getCollection('homepageRevisions');
      rev = list.find(r => r.revisionId === revisionId);
    }

    if (!rev || !rev.snapshot) throw new Error('Revision snapshot not found');

    // Publish the restored snapshot
    return await this.publishHomepage(adminUsername, `Restored revision from ${new Date(rev.createdAt).toLocaleString()}`);
  }

  // ==========================================
  // ORDERS & ATOMIC INVENTORY
  // ==========================================
  async createOrder({ customer, items, paymentMethod, bkashDetails, referralCode, orderNotes, idempotencyKey }) {
    // 1. Check idempotency to prevent double-clicks
    if (idempotencyKey) {
      const existing = await this.findOrderByIdempotencyKey(idempotencyKey);
      if (existing) {
        return { order: existing, isDuplicate: true };
      }
    }

    const settings = await this.getSettings();

    // 2. Validate items and atomically verify/reserve stock
    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (!product || product.status !== 'published') {
        throw new Error(`Product "${item.name || item.productId}" is currently unavailable`);
      }

      const variant = (product.variants || []).find(v => v.size === item.size);
      if (!variant) {
        throw new Error(`Variant "${item.size}" of "${product.name}" is unavailable`);
      }

      const requestedQty = parseInt(item.quantity, 10) || 1;
      if (variant.stock < requestedQty) {
        throw new Error(`Insufficient stock for "${product.name} (${item.size})". Only ${variant.stock} bottle(s) available.`);
      }

      // Decrement stock atomically
      const unitPrice = variant.salePrice || variant.price;
      const itemSubtotal = unitPrice * requestedQty;
      subtotal += itemSubtotal;

      // Primary product image
      const primaryImg = (product.images || []).find(i => i.isPrimary) || (product.images || [])[0];

      validatedItems.push({
        productId: product._id ? product._id.toString() : product.id,
        slug: product.slug,
        name: product.name,
        size: variant.size,
        sku: variant.sku || `${product.slug}-${variant.size}`.toUpperCase(),
        unitPrice,
        quantity: requestedQty,
        subtotal: itemSubtotal,
        imageUrl: primaryImg ? primaryImg.url : '/images/delice-01.jpg'
      });
    }

    // 3. Referral code validation & discount calculation
    let discount = 0;
    let referralSnapshot = {
      code: null,
      referrerId: null,
      commissionRatePercent: 0,
      refereeDiscountPercent: 0,
      commissionAmount: 0,
      status: 'none'
    };

    if (referralCode) {
      const ref = await this.getReferralCode(referralCode);
      if (ref && ref.isActive) {
        // Self-referral check: owner phone must not match order customer phone
        const cleanCustPhone = customer.phone.replace(/[^0-9]/g, '');
        const cleanRefPhone = ref.ownerPhone.replace(/[^0-9]/g, '');
        if (cleanCustPhone !== cleanRefPhone) {
          const discountPct = ref.refereeDiscountPercent || settings.referralRules.refereeDiscountPercent || 10;
          discount = Math.round((subtotal * discountPct) / 100);

          const commPct = ref.commissionPercent || settings.referralRules.commissionPercent || 5;
          const commissionAmount = Math.round(((subtotal - discount) * commPct) / 100);

          referralSnapshot = {
            code: ref.code,
            referrerId: ref._id ? ref._id.toString() : ref.id,
            commissionRatePercent: commPct,
            refereeDiscountPercent: discountPct,
            commissionAmount,
            status: 'pending' // Becomes eligible only after delivery + return period
          };
        }
      }
    }

    // 4. Delivery charge calculation
    const isDhaka = /dhaka/i.test(customer.district || '') || /dhaka/i.test(customer.area || '');
    let dhakaCharge = 80;
    let outsideCharge = 150;
    if (settings && Array.isArray(settings.deliveryZones) && settings.deliveryZones.length >= 2) {
      dhakaCharge = Number(settings.deliveryZones[0]?.charge) || 80;
      outsideCharge = Number(settings.deliveryZones[1]?.charge) || 150;
    }
    let deliveryCharge = isDhaka ? dhakaCharge : outsideCharge;
    const freeDeliveryThreshold = Number(settings?.freeDeliveryThreshold) || 5000;

    if (subtotal >= freeDeliveryThreshold) {
      deliveryCharge = 0;
    }

    const total = Math.max(0, subtotal - discount + deliveryCharge);
    const orderRef = generateOrderReference();
    const trackingToken = generateTrackingToken();

    // 5. Payment details
    const paymentStatus = paymentMethod === 'bkash_manual' ? 'pending_verification' : 'unpaid';

    const orderData = {
      orderReference: orderRef,
      trackingToken,
      idempotencyKey,
      customer: {
        name: sanitizeText(customer.name),
        phone: sanitizeText(customer.phone),
        email: sanitizeText(customer.email || ''),
        district: sanitizeText(customer.district),
        area: sanitizeText(customer.area),
        fullAddress: sanitizeText(customer.fullAddress)
      },
      items: validatedItems,
      pricing: {
        subtotal,
        discount,
        deliveryCharge,
        total
      },
      payment: {
        method: paymentMethod,
        status: paymentStatus,
        bkashSenderNumber: bkashDetails ? sanitizeText(bkashDetails.senderNumber || '') : '',
        bkashTrxId: bkashDetails ? sanitizeText(bkashDetails.trxId || '') : '',
        paymentVerifiedAt: null,
        paymentVerifiedBy: null,
        refundAmount: 0
      },
      fulfillment: {
        status: 'pending',
        courierName: '',
        trackingNumber: '',
        deliveredAt: null,
        cancelledAt: null,
        stockRestocked: false
      },
      referral: referralSnapshot,
      orderNotes: sanitizeText(orderNotes || ''),
      internalNotes: '',
      statusHistory: [
        {
          status: 'Order Placed',
          type: 'system',
          note: `Order registered via storefront. Payment method: ${paymentMethod === 'bkash_manual' ? 'Manual bKash' : 'Cash on Delivery'}.`,
          adminUsername: 'Storefront',
          timestamp: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 6. Deduct stock for all items
    for (const item of validatedItems) {
      const product = await this.getProductById(item.productId);
      const variant = (product.variants || []).find(v => v.size === item.size);
      if (variant) {
        await this.adjustStock({
          productId: product._id ? product._id.toString() : item.productId,
          variantSize: item.size,
          newStock: variant.stock - item.quantity,
          reason: `Customer order placed (${orderRef})`,
          adminUsername: 'Storefront',
          orderReference: orderRef
        });
      }
    }

    // 7. Save order
    let savedOrder;
    if (getIsConnected()) {
      delete orderData._id;
      savedOrder = await Order.create(orderData);
    } else {
      orderData._id = generateId('ord');
      localStore.getCollection('orders').unshift(orderData);
      localStore.save();
      savedOrder = orderData;
    }

    // 8. Update customer record
    await this.recordCustomerOrder(savedOrder);

    // 9. Update referral code stats if applicable
    if (referralSnapshot.code) {
      await this.incrementReferralUsage(referralSnapshot.code, total, referralSnapshot.commissionAmount);
    }

    return { order: savedOrder, isDuplicate: false };
  }

  async findOrderByIdempotencyKey(key) {
    if (!key) return null;
    if (getIsConnected()) {
      return await Order.findOne({ idempotencyKey: key });
    }
    return localStore.getCollection('orders').find(o => o.idempotencyKey === key) || null;
  }

  async getOrderByReference(orderReference) {
    if (getIsConnected()) {
      return await Order.findOne({ orderReference });
    }
    return localStore.getCollection('orders').find(o => o.orderReference === orderReference) || null;
  }

  async getOrderByTrackingToken(trackingToken) {
    if (getIsConnected()) {
      return await Order.findOne({ trackingToken });
    }
    return localStore.getCollection('orders').find(o => o.trackingToken === trackingToken) || null;
  }

  async getOrders({ status, paymentStatus, search, page = 1, limit = 20 } = {}) {
    if (getIsConnected()) {
      const q = {};
      if (status) q['fulfillment.status'] = status;
      if (paymentStatus) q['payment.status'] = paymentStatus;
      if (search) {
        q.$or = [
          { orderReference: new RegExp(search, 'i') },
          { 'customer.name': new RegExp(search, 'i') },
          { 'customer.phone': new RegExp(search, 'i') }
        ];
      }
      const total = await Order.countDocuments(q);
      const orders = await Order.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      return { orders, total, page, pages: Math.ceil(total / limit) };
    }

    let list = localStore.getCollection('orders');
    if (status) list = list.filter(o => o.fulfillment.status === status);
    if (paymentStatus) list = list.filter(o => o.payment.status === paymentStatus);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(o => 
        (o.orderReference || '').toLowerCase().includes(s) ||
        (o.customer.name || '').toLowerCase().includes(s) ||
        (o.customer.phone || '').toLowerCase().includes(s)
      );
    }

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const orders = list.slice(startIndex, startIndex + limit);
    return { orders, total, page, pages: Math.ceil(total / limit) };
  }

  async updateFulfillmentStatus(orderReference, newStatus, { courierName, trackingNumber, note, adminUsername = 'Admin' } = {}) {
    const order = await this.getOrderByReference(orderReference);
    if (!order) throw new Error('Order not found');

    const prevStatus = order.fulfillment.status;
    order.fulfillment.status = newStatus;
    if (courierName) order.fulfillment.courierName = sanitizeText(courierName);
    if (trackingNumber) order.fulfillment.trackingNumber = sanitizeText(trackingNumber);

    if (newStatus === 'delivered' && !order.fulfillment.deliveredAt) {
      order.fulfillment.deliveredAt = new Date();
      // If COD, delivery implies collection of payment
      if (order.payment.method === 'cod' && order.payment.status !== 'paid') {
        order.payment.status = 'paid';
        order.payment.paymentVerifiedAt = new Date();
        order.payment.paymentVerifiedBy = 'Courier Delivery Confirmation';
      }
      // Calculate referral commission eligibility date (deliveredAt + returnPeriodDays)
      if (order.referral && order.referral.status === 'pending') {
        const settings = await this.getSettings();
        const days = settings.referralRules?.returnPeriodDays || 7;
        const eligibleDate = new Date();
        eligibleDate.setDate(eligibleDate.getDate() + days);
        order.referral.eligibleAt = eligibleDate;
      }
    }

    // Cancellation handling: atomically restore reserved stock ONCE
    if (newStatus === 'cancelled' && !order.fulfillment.stockRestocked) {
      order.fulfillment.cancelledAt = new Date();
      order.fulfillment.stockRestocked = true;
      if (order.referral) {
        order.referral.status = 'voided';
      }
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        if (product) {
          const variant = (product.variants || []).find(v => v.size === item.size);
          if (variant) {
            await this.adjustStock({
              productId: item.productId,
              variantSize: item.size,
              newStock: variant.stock + item.quantity,
              reason: `Order cancelled restock (${orderReference})`,
              adminUsername,
              orderReference
            });
          }
        }
      }
    }

    order.statusHistory.push({
      status: `Fulfillment: ${newStatus.toUpperCase()}`,
      type: 'fulfillment',
      note: note || `Fulfillment status changed from ${prevStatus} to ${newStatus}`,
      adminUsername,
      timestamp: new Date()
    });
    order.updatedAt = new Date();

    if (getIsConnected()) {
      return await Order.findOneAndUpdate({ orderReference }, order, { new: true });
    }

    localStore.save();
    return order;
  }

  async updatePaymentStatus(orderReference, newStatus, { note, adminUsername = 'Admin', refundAmount = 0, refundReason = '' } = {}) {
    const order = await this.getOrderByReference(orderReference);
    if (!order) throw new Error('Order not found');

    const prevStatus = order.payment.status;
    order.payment.status = newStatus;

    if (newStatus === 'paid') {
      order.payment.paymentVerifiedAt = new Date();
      order.payment.paymentVerifiedBy = adminUsername;
    } else if (newStatus === 'refunded') {
      order.payment.refundAmount = refundAmount || order.pricing.total;
      order.payment.refundedAt = new Date();
      order.payment.refundReason = sanitizeText(refundReason || note || 'Refund processed');
      if (order.referral) {
        order.referral.status = 'voided';
      }
    }

    order.statusHistory.push({
      status: `Payment: ${newStatus.toUpperCase()}`,
      type: 'payment',
      note: note || `Payment status changed from ${prevStatus} to ${newStatus}`,
      adminUsername,
      timestamp: new Date()
    });
    order.updatedAt = new Date();

    if (getIsConnected()) {
      return await Order.findOneAndUpdate({ orderReference }, order, { new: true });
    }

    localStore.save();
    return order;
  }

  async addOrderInternalNote(orderReference, noteText, adminUsername = 'Admin') {
    const order = await this.getOrderByReference(orderReference);
    if (!order) throw new Error('Order not found');

    order.internalNotes = (order.internalNotes ? order.internalNotes + '\n' : '') + `[${new Date().toLocaleString()} by ${adminUsername}]: ${sanitizeText(noteText)}`;
    order.statusHistory.push({
      status: 'Internal Note Added',
      type: 'note',
      note: sanitizeText(noteText),
      adminUsername,
      timestamp: new Date()
    });
    order.updatedAt = new Date();

    if (getIsConnected()) {
      return await Order.findOneAndUpdate({ orderReference }, order, { new: true });
    }

    localStore.save();
    return order;
  }

  // ==========================================
  // CUSTOMERS & REFERRALS
  // ==========================================
  async recordCustomerOrder(order) {
    const phone = order.customer.phone;
    let customer;

    if (getIsConnected()) {
      customer = await Customer.findOne({ phone });
      if (!customer) {
        customer = new Customer({
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email,
          defaultAddress: {
            district: order.customer.district,
            area: order.customer.area,
            fullAddress: order.customer.fullAddress
          },
          totalOrdersCount: 1,
          totalSpentAmount: order.pricing.total,
          firstOrderAt: order.createdAt,
          lastOrderAt: order.createdAt
        });
      } else {
        customer.totalOrdersCount += 1;
        customer.totalSpentAmount += order.pricing.total;
        customer.lastOrderAt = order.createdAt;
      }
      return await customer.save();
    }

    const list = localStore.getCollection('customers');
    customer = list.find(c => c.phone === phone);
    if (!customer) {
      customer = {
        _id: generateId('cust'),
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        defaultAddress: {
          district: order.customer.district,
          area: order.customer.area,
          fullAddress: order.customer.fullAddress
        },
        totalOrdersCount: 1,
        totalSpentAmount: order.pricing.total,
        firstOrderAt: order.createdAt,
        lastOrderAt: order.createdAt,
        createdAt: new Date()
      };
      list.push(customer);
    } else {
      customer.totalOrdersCount += 1;
      customer.totalSpentAmount += order.pricing.total;
      customer.lastOrderAt = order.createdAt;
    }
    localStore.save();
    return customer;
  }

  async getCustomers({ search, page = 1, limit = 20 } = {}) {
    if (getIsConnected()) {
      const q = search ? {
        $or: [
          { name: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') }
        ]
      } : {};
      const total = await Customer.countDocuments(q);
      const customers = await Customer.find(q).sort({ totalSpentAmount: -1 }).skip((page - 1) * limit).limit(limit);
      return { customers, total, page, pages: Math.ceil(total / limit) };
    }

    let list = localStore.getCollection('customers');
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(s) || (c.phone || '').includes(s));
    }
    const total = list.length;
    const customers = list.slice((page - 1) * limit, page * limit);
    return { customers, total, page, pages: Math.ceil(total / limit) };
  }

  async getReferralCode(code) {
    if (!code) return null;
    const cleanCode = code.toUpperCase().trim();
    if (getIsConnected()) {
      return await ReferralCode.findOne({ code: cleanCode });
    }
    return localStore.getCollection('referralCodes').find(r => r.code === cleanCode) || null;
  }

  async getReferralCodes() {
    if (getIsConnected()) {
      return await ReferralCode.find().sort({ createdAt: -1 });
    }
    return localStore.getCollection('referralCodes');
  }

  async createReferralCode({ code, ownerName, ownerPhone, ownerEmail = '', commissionPercent = 5, refereeDiscountPercent = 10, notes = '' }) {
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9_-]/g, '').trim();
    const existing = await this.getReferralCode(cleanCode);
    if (existing) throw new Error(`Referral code "${cleanCode}" already exists`);

    const data = {
      code: cleanCode,
      ownerName: sanitizeText(ownerName),
      ownerPhone: sanitizeText(ownerPhone),
      ownerEmail: sanitizeText(ownerEmail),
      isActive: true,
      commissionPercent: Number(commissionPercent) || 5,
      refereeDiscountPercent: Number(refereeDiscountPercent) || 10,
      stats: {
        totalUses: 0,
        totalRevenueGenerated: 0,
        pendingCommission: 0,
        eligibleCommission: 0,
        paidCommission: 0
      },
      notes: sanitizeText(notes),
      createdAt: new Date()
    };

    if (getIsConnected()) {
      delete data._id;
      return await ReferralCode.create(data);
    }

    data._id = generateId('ref');
    localStore.getCollection('referralCodes').push(data);
    localStore.save();
    return data;
  }

  async toggleReferralCode(code, isActive) {
    const cleanCode = code.toUpperCase().trim();
    if (getIsConnected()) {
      return await ReferralCode.findOneAndUpdate({ code: cleanCode }, { isActive }, { new: true });
    }

    const list = localStore.getCollection('referralCodes');
    const ref = list.find(r => r.code === cleanCode);
    if (!ref) throw new Error('Referral code not found');
    ref.isActive = isActive;
    localStore.save();
    return ref;
  }

  async incrementReferralUsage(code, orderTotal, commissionAmount) {
    const cleanCode = code.toUpperCase().trim();
    if (getIsConnected()) {
      await ReferralCode.findOneAndUpdate(
        { code: cleanCode },
        {
          $inc: {
            'stats.totalUses': 1,
            'stats.totalRevenueGenerated': orderTotal,
            'stats.pendingCommission': commissionAmount
          }
        }
      );
      return;
    }

    const list = localStore.getCollection('referralCodes');
    const ref = list.find(r => r.code === cleanCode);
    if (ref) {
      if (!ref.stats) ref.stats = { totalUses: 0, totalRevenueGenerated: 0, pendingCommission: 0, eligibleCommission: 0, paidCommission: 0 };
      ref.stats.totalUses += 1;
      ref.stats.totalRevenueGenerated += orderTotal;
      ref.stats.pendingCommission += commissionAmount;
      localStore.save();
    }
  }

  async getCommissionPayoutLedger() {
    if (getIsConnected()) {
      return await CommissionPayout.find().sort({ createdAt: -1 });
    }
    return localStore.getCollection('commissionPayouts');
  }

  async recordCommissionPayout({ referralCode, recipientName, recipientPhone, payoutMethod, accountNumber, amount, orderReferences = [], notes = '', adminUsername = 'Admin' }) {
    const ref = await this.getReferralCode(referralCode);
    if (!ref) throw new Error('Referral code not found');

    const payoutRecord = {
      payoutReference: `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      referralCode: ref.code,
      recipientName: sanitizeText(recipientName || ref.ownerName),
      recipientPhone: sanitizeText(recipientPhone || ref.ownerPhone),
      payoutMethod,
      accountNumber: sanitizeText(accountNumber),
      amount: parseInt(amount, 10),
      orderReferences,
      processedByAdmin: adminUsername,
      transactionId: generateId('trx'),
      status: 'completed',
      notes: sanitizeText(notes),
      createdAt: new Date()
    };

    if (getIsConnected()) {
      delete payoutRecord._id;
      await CommissionPayout.create(payoutRecord);
      await ReferralCode.findOneAndUpdate(
        { code: ref.code },
        {
          $inc: {
            'stats.paidCommission': payoutRecord.amount,
            'stats.eligibleCommission': -payoutRecord.amount
          }
        }
      );
    } else {
      payoutRecord._id = generateId('pay');
      localStore.getCollection('commissionPayouts').unshift(payoutRecord);
      if (ref.stats) {
        ref.stats.paidCommission = (ref.stats.paidCommission || 0) + payoutRecord.amount;
        ref.stats.eligibleCommission = Math.max(0, (ref.stats.eligibleCommission || 0) - payoutRecord.amount);
      }
      localStore.save();
    }

    return payoutRecord;
  }

  // ==========================================
  // MEDIA LIBRARY
  // ==========================================
  async getMediaLibrary() {
    if (getIsConnected()) {
      return await Media.find().sort({ createdAt: -1 });
    }
    return localStore.getCollection('media');
  }

  async recordMediaUpload(mediaData) {
    const data = {
      ...mediaData,
      createdAt: new Date()
    };

    if (getIsConnected()) {
      delete data._id;
      return await Media.create(data);
    }

    data._id = generateId('med');
    localStore.getCollection('media').unshift(data);
    localStore.save();
    return data;
  }

  async checkMediaUsage(mediaUrl) {
    // Check if media is referenced in any product or homepage
    const products = await this.getProducts({ includeArchived: true });
    const homepage = await this.getHomepage({ isDraft: false });

    const usedIn = [];

    // Check products
    for (const p of products) {
      if ((p.images || []).some(img => img.url === mediaUrl || img.thumbnailUrl === mediaUrl)) {
        usedIn.push(`Product: ${p.name}`);
      }
    }

    // Check homepage
    if (homepage.hero?.desktopImageUrl === mediaUrl || homepage.hero?.mobileImageUrl === mediaUrl) {
      usedIn.push('Homepage: Hero Banner');
    }
    if (homepage.brandStory?.imageUrl === mediaUrl) {
      usedIn.push('Homepage: Brand Story Image');
    }

    return usedIn;
  }

  async deleteMedia(filename) {
    if (getIsConnected()) {
      return await Media.findOneAndDelete({ filename });
    }
    const list = localStore.getCollection('media');
    const idx = list.findIndex(m => m.filename === filename);
    if (idx !== -1) {
      const removed = list.splice(idx, 1)[0];
      localStore.save();
      return removed;
    }
    return null;
  }

  // ==========================================
  // FIRST-PARTY ANALYTICS & VISITOR MAP
  // ==========================================
  async recordAnalyticsEvent({ sessionId, eventType, pagePath, productSlug, productName, orderReference, amount, deviceCategory, referrer, utmSource, utmMedium, utmCampaign, location, isBot }) {
    // Deduplicate purchase events
    if (eventType === 'purchase' && orderReference) {
      const existing = await this.findPurchaseEvent(orderReference);
      if (existing) return existing; // Prevent double-counting purchase
    }

    const event = {
      sessionId: sessionId || generateId('sess'),
      eventType,
      pagePath: pagePath || '/',
      productSlug: productSlug || null,
      productName: productName || null,
      orderReference: orderReference || null,
      amount: parseInt(amount, 10) || 0,
      deviceCategory: ['desktop', 'mobile', 'tablet'].includes(deviceCategory) ? deviceCategory : 'desktop',
      referrer: referrer || 'Direct',
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      location: {
        country: location?.country || 'Bangladesh',
        district: location?.district || 'Unknown',
        isEstimated: true
      },
      isBot: Boolean(isBot),
      createdAt: new Date()
    };

    if (getIsConnected()) {
      delete event._id;
      return await AnalyticsEvent.create(event);
    }

    event._id = generateId('evt');
    localStore.getCollection('analyticsEvents').push(event);
    localStore.save();
    return event;
  }

  async findPurchaseEvent(orderReference) {
    if (getIsConnected()) {
      return await AnalyticsEvent.findOne({ eventType: 'purchase', orderReference });
    }
    return localStore.getCollection('analyticsEvents').find(e => e.eventType === 'purchase' && e.orderReference === orderReference) || null;
  }

  async getAnalyticsSummary(timeframeDays = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframeDays);

    let events;
    if (getIsConnected()) {
      events = await AnalyticsEvent.find({ createdAt: { $gte: cutoff }, isBot: false });
    } else {
      events = localStore.getCollection('analyticsEvents').filter(e => new Date(e.createdAt) >= cutoff && !e.isBot);
    }

    const uniqueSessions = new Set(events.map(e => e.sessionId)).size;
    const pageviews = events.filter(e => e.eventType === 'page_view').length;
    const productViews = events.filter(e => e.eventType === 'product_view').length;
    const addToBags = events.filter(e => e.eventType === 'add_to_bag').length;
    const checkoutStarts = events.filter(e => e.eventType === 'checkout_start').length;
    const purchases = events.filter(e => e.eventType === 'purchase').length;

    // Devices
    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    events.forEach(e => {
      const dev = e.deviceCategory || 'desktop';
      devices[dev] = (devices[dev] || 0) + 1;
    });

    // Top pages
    const pageCounts = {};
    events.forEach(e => {
      if (e.pagePath) pageCounts[e.pagePath] = (pageCounts[e.pagePath] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));

    // Top products
    const productCounts = {};
    events.forEach(e => {
      if (e.productName) productCounts[e.productName] = (productCounts[e.productName] || 0) + 1;
    });
    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Locations breakdown (District-level)
    const districtCounts = {};
    events.forEach(e => {
      const dist = e.location?.district || 'Unknown';
      districtCounts[dist] = (districtCounts[dist] || 0) + 1;
    });
    const locations = Object.entries(districtCounts)
      .map(([district, visitors]) => ({ district, visitors }))
      .sort((a, b) => b.visitors - a.visitors);

    // Funnel conversion percentages
    const funnel = {
      productViews,
      addToBags,
      checkoutStarts,
      purchases,
      cartRate: productViews > 0 ? ((addToBags / productViews) * 100).toFixed(1) : 0,
      checkoutRate: addToBags > 0 ? ((checkoutStarts / addToBags) * 100).toFixed(1) : 0,
      purchaseRate: checkoutStarts > 0 ? ((purchases / checkoutStarts) * 100).toFixed(1) : 0,
      overallConversionRate: uniqueSessions > 0 ? ((purchases / uniqueSessions) * 100).toFixed(2) : 0
    };

    // Product-wise Performance & Conversion Analytics
    const allProducts = await this.getProducts({ includeArchived: true });
    let ordersList = [];
    if (getIsConnected()) {
      ordersList = await Order.find({ createdAt: { $gte: cutoff } });
    } else {
      ordersList = localStore.getCollection('orders').filter(o => new Date(o.createdAt) >= cutoff);
    }

    const productPerformance = allProducts.map(p => {
      const pId = p._id ? p._id.toString() : p.id;
      const views = events.filter(e => e.eventType === 'product_view' && (e.productSlug === p.slug || e.productName === p.name)).length;
      const addBags = events.filter(e => e.eventType === 'add_to_bag' && (e.productSlug === p.slug || e.productName === p.name)).length;
      
      let unitsSold = 0;
      let revenue = 0;
      let orderMatches = 0;

      ordersList.forEach(order => {
        let matchedInOrder = false;
        (order.items || []).forEach(item => {
          if (item.slug === p.slug || item.productId === pId || item.name === p.name) {
            unitsSold += (item.quantity || 1);
            revenue += (item.subtotal || ((item.unitPrice || 0) * (item.quantity || 1)));
            matchedInOrder = true;
          }
        });
        if (matchedInOrder) orderMatches++;
      });

      const cartToBuyRate = addBags > 0 
        ? Math.min(100, (orderMatches / addBags) * 100).toFixed(1)
        : (orderMatches > 0 ? '100.0' : '0.0');

      const viewToBuyRate = views > 0 
        ? Math.min(100, (orderMatches / views) * 100).toFixed(1)
        : (orderMatches > 0 ? '100.0' : '0.0');

      return {
        id: pId,
        name: p.name,
        slug: p.slug,
        image: (p.images && p.images[0]) ? p.images[0].url : '/images/delice-01.jpg',
        price: (p.variants && p.variants[0]) ? p.variants[0].price : 0,
        salePrice: (p.variants && p.variants[0]) ? p.variants[0].salePrice : null,
        views,
        addToBag: addBags,
        ordersCount: orderMatches,
        unitsSold,
        revenue,
        cartToBuyRate,
        viewToBuyRate
      };
    });

    return {
      timeframeDays,
      visitors: uniqueSessions,
      pageviews,
      devices,
      topPages,
      topProducts,
      locations,
      funnel,
      productPerformance
    };
  }

  // ==========================================
  // DASHBOARD AGGREGATES
  // ==========================================
  async getDashboardMetrics(timeframeDays = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframeDays);

    const { orders } = await this.getOrders({ limit: 1000 });
    const periodOrders = orders.filter(o => new Date(o.createdAt) >= cutoff);

    // Delivered Net Sales: sum of orders with fulfillment === 'delivered' and payment === 'paid', minus refunds
    const deliveredOrders = periodOrders.filter(o => o.fulfillment.status === 'delivered');
    const deliveredNetSales = deliveredOrders.reduce((sum, o) => {
      const refund = o.payment?.refundAmount || 0;
      return sum + Math.max(0, o.pricing.total - refund);
    }, 0);

    const pendingOrdersCount = periodOrders.filter(o => o.fulfillment.status === 'pending').length;

    // Low stock alerts (< 5 units)
    const products = await this.getProducts({ includeArchived: false });
    const lowStockItems = [];
    products.forEach(p => {
      (p.variants || []).forEach(v => {
        if (v.stock < 5) {
          lowStockItems.push({
            productId: p._id,
            productName: p.name,
            size: v.size,
            stock: v.stock,
            sku: v.sku
          });
        }
      });
    });

    const analytics = await this.getAnalyticsSummary(timeframeDays);

    return {
      timeframeDays,
      totalOrders: periodOrders.length,
      deliveredNetSales,
      pendingOrdersCount,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      analytics
    };
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  async logAdminAction({ adminUsername, action, targetType, targetId = '', details = {}, ipAddress = '127.0.0.1' }) {
    const entry = {
      adminUsername: adminUsername || 'Admin',
      action,
      targetType,
      targetId: targetId ? targetId.toString() : '',
      details,
      ipAddress,
      createdAt: new Date()
    };

    if (getIsConnected()) {
      delete entry._id;
      return await AuditLog.create(entry);
    }

    entry._id = generateId('audit');
    localStore.getCollection('auditLogs').unshift(entry);
    localStore.save();
    return entry;
  }

  async getAuditLogs(limit = 100) {
    if (getIsConnected()) {
      return await AuditLog.find().sort({ createdAt: -1 }).limit(limit);
    }
    return localStore.getCollection('auditLogs').slice(0, limit);
  }
}

module.exports = new StoreService();
