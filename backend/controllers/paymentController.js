const Product = require('../models/Product');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const sslcommerzService = require('../services/sslcommerzService');
const { memoryStore, isConnected } = require('../config/db');

const CATALOG_PRICES = {
  'delice-bloom': { name: 'DÉLICE BLOOM', price: 799, originalPrice: 850, cogs: 320, volume: '30ml' },
  'delice-momentum': { name: 'DÉLICE MOMENTUM', price: 799, originalPrice: 850, cogs: 320, volume: '30ml' },
  'delice-enigma': { name: 'DÉLICE ENIGMA', price: 799, originalPrice: 850, cogs: 320, volume: '30ml' }
};

/**
 * Initiate Payment & Create Pending Order
 * POST /api/payment/initiate
 */
exports.initiatePayment = async (req, res, next) => {
  try {
    const { customer, deliveryArea, items } = req.body;

    // 1. Validate Customer Info
    if (!customer || !customer.fullName || !customer.phone || !customer.district || !customer.address) {
      return res.status(400).json({
        success: false,
        error: 'Please provide full recipient name, mobile number, district, and address.'
      });
    }

    const cleanedPhone = customer.phone.replace(/[\s-]/g, '');
    if (!/^01[3-9]\d{8}$/.test(cleanedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 11-digit Bangladeshi mobile number.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Your shopping cart is empty.'
      });
    }

    // 2. Authoritative Server-Side Price & Cost Calculation
    let productSubtotal = 0;
    let totalCOGS = 0;
    const orderItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) continue;

      const pId = item.id.toLowerCase().trim();
      let prod = null;

      if (isConnected()) {
        try {
          prod = await Product.findOne({ id: pId });
        } catch (e) {}
      }

      let price = 799;
      let origPrice = 850;
      let cogs = 320;
      let name = item.id.toUpperCase();
      let volume = '30ml';

      if (prod) {
        price = prod.price;
        origPrice = prod.originalPrice;
        cogs = prod.cogs || 320;
        name = prod.name;
        volume = prod.volume || '30ml';
      } else if (CATALOG_PRICES[pId]) {
        price = CATALOG_PRICES[pId].price;
        origPrice = CATALOG_PRICES[pId].originalPrice;
        cogs = CATALOG_PRICES[pId].cogs;
        name = CATALOG_PRICES[pId].name;
        volume = CATALOG_PRICES[pId].volume;
      }

      const itemTotal = price * qty;
      productSubtotal += itemTotal;
      totalCOGS += (cogs * qty);

      orderItems.push({
        productId: pId,
        productName: name,
        volume,
        price,
        originalPrice: origPrice,
        cogs,
        quantity: qty,
        itemTotal
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid products in cart.'
      });
    }

    // 3. Delivery Charge Calculation
    let deliveryInside = 60;
    let deliveryOutside = 120;

    if (isConnected()) {
      try {
        const insideSet = await Setting.findOne({ key: 'deliveryChargeInsideDhaka' });
        if (insideSet) deliveryInside = Number(insideSet.value);
        const outsideSet = await Setting.findOne({ key: 'deliveryChargeOutsideDhaka' });
        if (outsideSet) deliveryOutside = Number(outsideSet.value);
      } catch (e) {}
    }

    const isInsideDhaka = deliveryArea === 'insideDhaka';
    const deliveryCharge = isInsideDhaka ? deliveryInside : deliveryOutside;
    const totalPayable = productSubtotal + deliveryCharge;

    // 4. Generate Unique IDs
    const now = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tranId = `TRAN_${now}_${randomSuffix}`;
    const orderNumber = `DLC-${now.toString().slice(-6)}`;

    // 5. Create Pending Order Document
    let order;
    const orderData = {
      orderNumber,
      transactionId: tranId,
      customer: {
        fullName: customer.fullName.trim(),
        phone: cleanedPhone,
        email: customer.email ? customer.email.trim() : '',
        district: customer.district.trim(),
        address: customer.address.trim(),
        orderNotes: customer.orderNotes || ''
      },
      items: orderItems,
      productSubtotal,
      deliveryArea: isInsideDhaka ? 'insideDhaka' : 'outsideDhaka',
      deliveryCharge,
      totalPayable,
      totalPaid: 0,
      totalProductCost: totalCOGS,
      actualCourierCost: isInsideDhaka ? deliveryInside : deliveryOutside,
      gatewayFee: 0,
      netProfit: 0,
      paymentStatus: 'pending',
      orderStatus: 'pending_payment',
      createdAt: new Date()
    };

    if (isConnected()) {
      try {
        order = await Order.create(orderData);
      } catch (e) {
        order = {
          _id: 'MEM_' + Date.now(),
          ...orderData,
          save: async function() {
            const idx = memoryStore.orders.findIndex(o => o.transactionId === this.transactionId);
            if (idx > -1) memoryStore.orders[idx] = this;
            return this;
          }
        };
        memoryStore.orders.push(order);
      }
    } else {
      order = {
        _id: 'MEM_' + Date.now(),
        ...orderData,
        save: async function() {
          const idx = memoryStore.orders.findIndex(o => o.transactionId === this.transactionId);
          if (idx > -1) memoryStore.orders[idx] = this;
          return this;
        }
      };
      memoryStore.orders.push(order);
    }

    // 6. Initiate Gateway Payment Session
    const paymentResult = await sslcommerzService.initPayment(order, customer);

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      tran_id: tranId,
      totalPayable,
      gatewayUrl: paymentResult.gatewayUrl
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Payment Success Callback
 */
exports.paymentSuccess = async (req, res, next) => {
  try {
    const payload = req.method === 'POST' ? req.body : req.query;
    const val_id = payload.val_id || payload.valId;
    const tran_id = payload.tran_id || payload.tranId;
    const amount = payload.amount;

    if (!val_id || !tran_id) {
      return res.redirect(`/payment-failed.html?reason=${encodeURIComponent('Missing transaction parameters from gateway')}`);
    }

    const { order } = await sslcommerzService.verifyPayment(val_id, tran_id, amount);
    res.redirect(`/payment-success.html?tran_id=${tran_id}&order_id=${order._id}`);
  } catch (err) {
    console.error('[Payment Verification Failed]', err.message);
    const payload = req.method === 'POST' ? req.body : req.query;
    const tran_id = payload.tran_id || payload.tranId || '';
    res.redirect(`/payment-failed.html?tran_id=${tran_id}&reason=${encodeURIComponent(err.message)}`);
  }
};

/**
 * Handle Payment Failure Callback
 */
exports.paymentFail = async (req, res, next) => {
  try {
    const payload = req.method === 'POST' ? req.body : req.query;
    const tran_id = payload.tran_id || payload.tranId || '';
    const reason = payload.error || payload.failedreason || 'Payment could not be completed';

    await sslcommerzService.handlePaymentFailure(tran_id, reason);
    res.redirect(`/payment-failed.html?tran_id=${tran_id}&reason=${encodeURIComponent(reason)}`);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Payment Cancellation Callback
 */
exports.paymentCancel = async (req, res, next) => {
  try {
    const payload = req.method === 'POST' ? req.body : req.query;
    const tran_id = payload.tran_id || payload.tranId || '';

    await sslcommerzService.handlePaymentFailure(tran_id, 'User cancelled transaction');
    res.redirect(`/payment-failed.html?tran_id=${tran_id}&reason=${encodeURIComponent('Payment cancelled by customer')}`);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle SSLCOMMERZ IPN
 */
exports.paymentIPN = async (req, res) => {
  try {
    const { val_id, tran_id, amount, status } = req.body;
    if (status === 'VALID' || status === 'VALIDATED') {
      await sslcommerzService.verifyPayment(val_id, tran_id, amount);
    }
    res.status(200).send('IPN_PROCESSED');
  } catch (err) {
    res.status(400).send('IPN_FAILED');
  }
};
