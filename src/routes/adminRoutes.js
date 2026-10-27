const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const storeService = require('../services/storeService');
const { authenticateAdmin, requireAdmin, logoutSession, SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } = require('../middleware/auth');
const { upload, processUploadedImage } = require('../middleware/upload');
const Admin = require('../models/Admin');
const { getIsConnected, localStore } = require('../config/db');

// Login rate limiting to prevent brute force
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

// ==========================================
// 1. AUTHENTICATION
// ==========================================
router.post('/auth/login', loginRateLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const result = await authenticateAdmin(username, password);
  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  // Set secure HTTP-only cookie
  res.cookie(SESSION_COOKIE_NAME, result.session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  // Also set CSRF token cookie for frontend JS to read
  res.cookie(CSRF_COOKIE_NAME, result.session.csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    admin: result.admin,
    csrfToken: result.session.csrfToken
  });
});

router.post('/auth/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  logoutSession(token);
  res.clearCookie(SESSION_COOKIE_NAME);
  res.clearCookie(CSRF_COOKIE_NAME);
  res.json({ success: true, message: 'Logged out successfully.' });
});

router.get('/auth/me', requireAdmin, (req, res) => {
  res.json({
    authenticated: true,
    admin: {
      username: req.adminSession.username,
      email: req.adminSession.email,
      role: req.adminSession.role
    },
    csrfToken: req.adminSession.csrfToken
  });
});

router.post('/auth/change-password', requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    let admin;
    if (getIsConnected()) {
      admin = await Admin.findOne({ username: req.adminSession.username });
    } else {
      admin = localStore.getCollection('admins').find(a => a.username === req.adminSession.username);
    }

    if (!admin) return res.status(404).json({ error: 'Admin account not found.' });

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Current password does not match.' });

    const salt = await bcrypt.genSalt(12);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    admin.updatedAt = new Date();

    if (getIsConnected()) {
      await admin.save();
    } else {
      localStore.save();
    }

    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'PASSWORD_CHANGED',
      targetType: 'admin',
      targetId: req.adminSession.adminId
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. DASHBOARD
// ==========================================
router.get('/dashboard', requireAdmin, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const metrics = await storeService.getDashboardMetrics(days);
    const { orders: recentOrders } = await storeService.getOrders({ limit: 6 });

    res.json({
      metrics,
      recentOrders
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. HOMEPAGE EDITOR & REVISIONS
// ==========================================
router.get('/homepage', requireAdmin, async (req, res, next) => {
  try {
    const published = await storeService.getHomepage({ isDraft: false });
    const draft = await storeService.getHomepage({ isDraft: true });
    const revisions = await storeService.getHomepageRevisions();
    const products = await storeService.getProducts({ includeArchived: false });

    res.json({
      published,
      draft,
      revisions,
      products
    });
  } catch (err) {
    next(err);
  }
});

router.post('/homepage/draft', requireAdmin, async (req, res, next) => {
  try {
    const draft = await storeService.saveHomepageDraft(req.body, req.adminUsername);
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'SAVE_HOMEPAGE_DRAFT',
      targetType: 'homepage'
    });
    res.json({ success: true, draft, message: 'Draft saved successfully.' });
  } catch (err) {
    next(err);
  }
});

router.post('/homepage/publish', requireAdmin, async (req, res, next) => {
  try {
    const { note } = req.body;
    const published = await storeService.publishHomepage(req.adminUsername, note || 'Published updates from admin panel');
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'PUBLISH_HOMEPAGE',
      targetType: 'homepage',
      details: { version: published.version, note }
    });
    res.json({ success: true, published, message: 'Homepage published successfully.' });
  } catch (err) {
    next(err);
  }
});

router.post('/homepage/restore/:revisionId', requireAdmin, async (req, res, next) => {
  try {
    const published = await storeService.restoreHomepageRevision(req.params.revisionId, req.adminUsername);
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'RESTORE_HOMEPAGE_REVISION',
      targetType: 'homepage',
      targetId: req.params.revisionId
    });
    res.json({ success: true, published, message: 'Revision restored and published successfully.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. PRODUCTS & INVENTORY
// ==========================================
router.get('/products', requireAdmin, async (req, res, next) => {
  try {
    const products = await storeService.getProducts({ includeArchived: true });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.post('/products', requireAdmin, async (req, res, next) => {
  try {
    const product = await storeService.createProduct(req.body, req.adminUsername);
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'CREATE_PRODUCT',
      targetType: 'product',
      targetId: product._id,
      details: { name: product.name, slug: product.slug }
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const product = await storeService.updateProduct(req.params.id, req.body, req.adminUsername);
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'UPDATE_PRODUCT',
      targetType: 'product',
      targetId: req.params.id,
      details: { name: product.name }
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const removed = await storeService.deleteProduct(req.params.id, req.adminUsername);
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'DELETE_PRODUCT',
      targetType: 'product',
      targetId: req.params.id,
      details: { name: removed.name }
    });
    res.json({ success: true, message: 'Product deleted successfully', removed });
  } catch (err) {
    next(err);
  }
});

router.post('/products/:id/adjust-stock', requireAdmin, async (req, res, next) => {
  try {
    const { variantSize, newStock, reason } = req.body;
    if (!variantSize || typeof newStock !== 'number' || !reason) {
      return res.status(400).json({ error: 'Variant size, new stock count, and reason are required.' });
    }

    const result = await storeService.adjustStock({
      productId: req.params.id,
      variantSize,
      newStock,
      reason,
      adminUsername: req.adminUsername
    });

    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'ADJUST_STOCK',
      targetType: 'product',
      targetId: req.params.id,
      details: { variantSize, newStock, reason }
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/products/:id/stock-history', requireAdmin, async (req, res, next) => {
  try {
    const history = await storeService.getStockAdjustments(req.params.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. MEDIA LIBRARY & SHARP UPLOADS
// ==========================================
router.get('/media', requireAdmin, async (req, res, next) => {
  try {
    const media = await storeService.getMediaLibrary();
    res.json(media);
  } catch (err) {
    next(err);
  }
});

router.post('/media/upload', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const processed = await processUploadedImage(req.file.path, req.file.originalname);
    const mediaRecord = await storeService.recordMediaUpload({
      ...processed,
      altText: req.body.altText || req.file.originalname,
      uploadedBy: req.adminUsername
    });

    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'UPLOAD_MEDIA',
      targetType: 'media',
      targetId: mediaRecord._id,
      details: { filename: mediaRecord.filename, sizeBytes: mediaRecord.sizeBytes }
    });

    res.status(201).json(mediaRecord);
  } catch (err) {
    next(err);
  }
});

router.get('/media/usage', requireAdmin, async (req, res, next) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'URL required.' });
    const usedIn = await storeService.checkMediaUsage(url);
    res.json({ url, usedIn, canDeleteSafely: usedIn.length === 0 });
  } catch (err) {
    next(err);
  }
});

router.delete('/media/:filename', requireAdmin, async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const mediaUrl = `/uploads/${filename}`;
    const usedIn = await storeService.checkMediaUsage(mediaUrl);

    if (usedIn.length > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        error: `Cannot delete image: It is currently used in ${usedIn.join(', ')}. Pass ?force=true to override.`,
        usedIn
      });
    }

    const removed = await storeService.deleteMedia(filename);

    // Remove disk files safely
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'DELETE_MEDIA',
      targetType: 'media',
      targetId: filename
    });

    res.json({ success: true, removed, message: 'Media removed.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. ORDERS MANAGEMENT
// ==========================================
router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const { status, paymentStatus, search, page, limit } = req.query;
    const result = await storeService.getOrders({
      status,
      paymentStatus,
      search,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:reference', requireAdmin, async (req, res, next) => {
  try {
    const order = await storeService.getOrderByReference(req.params.reference);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:reference/fulfillment', requireAdmin, async (req, res, next) => {
  try {
    const { status, courierName, trackingNumber, note } = req.body;
    if (!status) return res.status(400).json({ error: 'Fulfillment status required.' });

    const order = await storeService.updateFulfillmentStatus(req.params.reference, status, {
      courierName,
      trackingNumber,
      note,
      adminUsername: req.adminUsername
    });

    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'UPDATE_FULFILLMENT',
      targetType: 'order',
      targetId: req.params.reference,
      details: { newStatus: status, courierName, trackingNumber }
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:reference/payment', requireAdmin, async (req, res, next) => {
  try {
    const { status, note, refundAmount, refundReason } = req.body;
    if (!status) return res.status(400).json({ error: 'Payment status required.' });

    const order = await storeService.updatePaymentStatus(req.params.reference, status, {
      note,
      refundAmount,
      refundReason,
      adminUsername: req.adminUsername
    });

    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'UPDATE_PAYMENT',
      targetType: 'order',
      targetId: req.params.reference,
      details: { newStatus: status, refundAmount }
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:reference/notes', requireAdmin, async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ error: 'Note text required.' });

    const order = await storeService.addOrderInternalNote(req.params.reference, note, req.adminUsername);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. ANALYTICS & VISITOR MAP
// ==========================================
router.get('/analytics', requireAdmin, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const summary = await storeService.getAnalyticsSummary(days);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 8. CUSTOMERS & REFERRALS
// ==========================================
router.get('/customers', requireAdmin, async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await storeService.getCustomers({
      search,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/referrals', requireAdmin, async (req, res, next) => {
  try {
    const codes = await storeService.getReferralCodes();
    const payouts = await storeService.getCommissionPayoutLedger();
    res.json({ codes, payouts });
  } catch (err) {
    next(err);
  }
});

router.post('/referrals', requireAdmin, async (req, res, next) => {
  try {
    const ref = await storeService.createReferralCode(req.body);
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'CREATE_REFERRAL_CODE',
      targetType: 'referral',
      targetId: ref.code
    });
    res.status(201).json(ref);
  } catch (err) {
    next(err);
  }
});

router.patch('/referrals/:code/toggle', requireAdmin, async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const updated = await storeService.toggleReferralCode(req.params.code, Boolean(isActive));
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'TOGGLE_REFERRAL_CODE',
      targetType: 'referral',
      targetId: req.params.code,
      details: { isActive }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/referrals/payouts', requireAdmin, async (req, res, next) => {
  try {
    const ledger = await storeService.getCommissionPayoutLedger();
    res.json(ledger);
  } catch (err) {
    next(err);
  }
});

router.post('/referrals/payouts', requireAdmin, async (req, res, next) => {
  try {
    const payout = await storeService.recordCommissionPayout({
      ...req.body,
      adminUsername: req.adminUsername
    });
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'COMMISSION_PAYOUT',
      targetType: 'referral_payout',
      targetId: payout.payoutReference,
      details: { referralCode: payout.referralCode, amount: payout.amount }
    });
    res.status(201).json(payout);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 9. SETTINGS, BACKUP & AUDIT LOGS
// ==========================================
router.get('/settings', requireAdmin, async (req, res, next) => {
  try {
    const settings = await storeService.getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.put('/settings', requireAdmin, async (req, res, next) => {
  try {
    const settings = await storeService.updateSettings(req.body, req.adminUsername);
    await storeService.logAdminAction({
      adminUsername: req.adminUsername,
      action: 'UPDATE_SETTINGS',
      targetType: 'settings'
    });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.get('/backup/export', requireAdmin, async (req, res, next) => {
  try {
    // Generate full database export as JSON download
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      storeName: 'DÉLICE',
      settings: await storeService.getSettings(),
      products: await storeService.getProducts({ includeArchived: true }),
      orders: (await storeService.getOrders({ limit: 5000 })).orders,
      customers: (await storeService.getCustomers({ limit: 5000 })).customers,
      referralCodes: await storeService.getReferralCodes(),
      commissionPayouts: await storeService.getCommissionPayoutLedger(),
      homepage: await storeService.getHomepage({ isDraft: false }),
      homepageDraft: await storeService.getHomepage({ isDraft: true }),
      auditLogs: await storeService.getAuditLogs(500)
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="delice_backup_${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    next(err);
  }
});

router.get('/audit-logs', requireAdmin, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const logs = await storeService.getAuditLogs(limit);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
