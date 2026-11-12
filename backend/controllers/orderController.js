const Order = require('../models/Order');
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const financialService = require('../services/financialService');
const deliceProfitService = require('../services/deliceProfitService');
const DeliceProfitAllocation = require('../models/DeliceProfitAllocation');
const { memoryStore, isConnected } = require('../config/db');

const CATALOG_PRICES = {
  'delice-bloom': { name: 'DÉLICE BLOOM', price: 799, originalPrice: 850, cogs: 320, volume: '30ml' },
  'delice-momentum': { name: 'DÉLICE MOMENTUM', price: 799, originalPrice: 850, cogs: 320, volume: '30ml' },
  'delice-enigma': { name: 'DÉLICE ENIGMA', price: 799, originalPrice: 850, cogs: 320, volume: '30ml' }
};

/**
 * Create Order with Bangladesh Payment Architecture
 * Supports:
 * 1. 100% Online Payment via bKash / Nagad Send Money to 01731101780
 * 2. Cash on Delivery (Delivery charge ৳60/৳120 paid in advance via bKash/Nagad)
 * POST /api/orders
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { customer, deliveryArea, items, paymentMethod, paymentProvider, senderNumber, transactionId } = req.body;

    // 1. Validate Customer Info
    if (!customer || !customer.fullName || !customer.phone || !customer.district || !customer.address) {
      return res.status(400).json({
        success: false,
        error: 'Please provide full recipient name, mobile number, district, and detailed address.'
      });
    }

    const cleanedPhone = customer.phone.replace(/[\s-]/g, '');
    if (!/^01[3-9]\d{8}$/.test(cleanedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678).'
      });
    }

    // 2. Validate Payment Details (bKash & Nagad Send Money)
    const validMethods = ['full_online', 'cod_advance'];
    const pMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'full_online';
    const pProvider = (paymentProvider === 'nagad') ? 'nagad' : 'bkash';

    const cleanedSender = senderNumber ? senderNumber.replace(/[\s-]/g, '').trim() : '';
    if (!cleanedSender || !/^01[3-9]\d{8}$/.test(cleanedSender)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter the valid 11-digit bKash or Nagad sender mobile number from which payment was made.'
      });
    }

    const trxId = transactionId ? transactionId.trim().toUpperCase() : '';
    if (!trxId || trxId.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid bKash or Nagad Transaction ID (TrxID).'
      });
    }

    // Check for duplicate TrxID
    if (isConnected()) {
      try {
        const existingOrder = await Order.findOne({ transactionId: trxId });
        if (existingOrder) {
          return res.status(400).json({
            success: false,
            error: `Transaction ID "${trxId}" has already been submitted for Order #${existingOrder.orderNumber}.`
          });
        }
      } catch (e) {}
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Your shopping cart is empty.'
      });
    }

    // 3. Authoritative Server-Side Product & Price Calculation
    let productSubtotal = 0;
    let totalCOGS = 0;
    const orderItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) continue;

      const pId = item.id ? item.id.toLowerCase().trim() : '';
      let prod = null;

      if (isConnected()) {
        try {
          prod = await Product.findOne({ id: pId });
        } catch (e) {}
      }

      let price = 799;
      let origPrice = 850;
      let cogs = 320;
      let name = item.name || (item.id ? item.id.toUpperCase() : 'Fragrance');
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

    // 4. Delivery Calculation (Inside Dhaka ৳60 vs Outside Dhaka ৳120)
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

    // District logic: 'Dhaka' defaults to insideDhaka, any other district defaults to outsideDhaka
    const isDhakaDistrict = customer.district.trim().toLowerCase() === 'dhaka';
    const isInsideDhaka = (deliveryArea === 'insideDhaka' || (isDhakaDistrict && deliveryArea !== 'outsideDhaka'));
    const deliveryCharge = isInsideDhaka ? deliveryInside : deliveryOutside;
    const finalDeliveryArea = isInsideDhaka ? 'insideDhaka' : 'outsideDhaka';

    const totalPayable = productSubtotal + deliveryCharge;

    // 5. Payment Method Specific Figures
    let advancePaid = 0;
    let cashDueOnDelivery = 0;

    if (pMethod === 'full_online') {
      // 100% Advance Payment
      advancePaid = totalPayable;
      cashDueOnDelivery = 0;
    } else if (pMethod === 'cod_advance') {
      // Cash on Delivery with Delivery Charge paid in advance
      advancePaid = deliveryCharge;
      cashDueOnDelivery = productSubtotal;
    } else {
      advancePaid = totalPayable;
      cashDueOnDelivery = 0;
    }

    // 6. Generate IDs
    const now = Date.now();
    const orderNumber = `DLC-${now.toString().slice(-6)}`;

    const orderData = {
      orderNumber,
      transactionId: trxId,
      customer: {
        fullName: customer.fullName.trim(),
        phone: cleanedPhone,
        email: customer.email ? customer.email.trim() : '',
        district: customer.district.trim(),
        address: customer.address.trim(),
        orderNotes: customer.orderNotes ? customer.orderNotes.trim() : ''
      },
      items: orderItems,
      productSubtotal,
      deliveryArea: finalDeliveryArea,
      deliveryCharge,
      totalPayable,
      totalPaid: advancePaid,
      paymentMethod: pMethod,
      paymentProvider: pProvider,
      senderNumber: cleanedSender,
      advancePaid,
      cashDueOnDelivery,
      totalProductCost: totalCOGS,
      actualCourierCost: isInsideDhaka ? deliveryInside : deliveryOutside,
      gatewayFee: 0,
      netProfit: pMethod === 'full_online' 
        ? (totalPayable - totalCOGS - deliveryCharge)
        : (advancePaid - deliveryCharge), // For COD, initial profit reflects advance until courier settles product price
      paymentStatus: 'awaiting_verification',
      orderStatus: 'processing',
      paymentDetails: {
        bankTranId: trxId,
        cardType: `${pProvider.toUpperCase()} (${pMethod === 'full_online' ? '100% Online' : 'COD Advance Fee'})`,
        cardBrand: pProvider.toUpperCase(),
        valId: `TRX-${cleanedSender.slice(-4)}-${trxId.slice(-4)}`,
        validatedAt: new Date()
      },
      createdAt: new Date()
    };

    let order;
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

    res.status(201).json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        transactionId: order.transactionId,
        totalPayable: order.totalPayable,
        advancePaid: order.advancePaid,
        cashDueOnDelivery: order.cashDueOnDelivery,
        paymentMethod: order.paymentMethod,
        paymentProvider: order.paymentProvider
      },
      redirectUrl: `/payment-success.html?orderId=${order.orderNumber}&tranId=${order.transactionId}`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all orders (Admin)
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, search } = req.query;

    if (isConnected()) {
      let query = {};
      if (status && status !== 'all') query.orderStatus = status;
      if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
      if (search) {
        query.$or = [
          { orderNumber: new RegExp(search, 'i') },
          { transactionId: new RegExp(search, 'i') },
          { 'customer.phone': new RegExp(search, 'i') },
          { 'customer.fullName': new RegExp(search, 'i') }
        ];
      }
      const orders = await Order.find(query).sort({ createdAt: -1 });

      let allocations = [];
      try {
        allocations = await DeliceProfitAllocation.find({ isReversal: false });
      } catch (e) {}

      const allocMap = {};
      allocations.forEach(a => {
        const key = a.orderNumber || a.orderId;
        if (!allocMap[key]) {
          allocMap[key] = {
            bottlesSold: 0,
            totalRevenue: 0,
            totalPrincipalRepaid: 0,
            totalDistributableProfit: 0,
            fundAllocations: a.fundAllocations
          };
        }
        allocMap[key].bottlesSold += a.bottlesSold;
        allocMap[key].totalRevenue += a.totalRevenue;
        allocMap[key].totalPrincipalRepaid += a.totalPrincipalRepaid;
        allocMap[key].totalDistributableProfit += a.totalDistributableProfit;
      });

      const enrichedOrders = orders.map(o => {
        const obj = o.toObject ? o.toObject() : { ...o };
        obj.deliceProfit = allocMap[o.orderNumber] || allocMap[String(o._id)] || null;
        return obj;
      });

      return res.json({ success: true, count: enrichedOrders.length, orders: enrichedOrders });
    }

    // In-Memory store filtering
    let orders = [...memoryStore.orders];
    if (status && status !== 'all') {
      orders = orders.filter(o => o.orderStatus === status);
    }
    if (paymentStatus && paymentStatus !== 'all') {
      orders = orders.filter(o => o.paymentStatus === paymentStatus);
    }
    if (search) {
      const s = search.toLowerCase();
      orders = orders.filter(o => 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(s)) ||
        (o.transactionId && o.transactionId.toLowerCase().includes(s)) ||
        (o.customer?.phone && o.customer.phone.includes(s)) ||
        (o.customer?.fullName && o.customer.fullName.toLowerCase().includes(s))
      );
    }

    const memAllocations = (memoryStore.deliceProfitAllocations || []).filter(a => !a.isReversal);
    const allocMap = {};
    memAllocations.forEach(a => {
      const key = a.orderNumber || a.orderId;
      if (!allocMap[key]) {
        allocMap[key] = {
          bottlesSold: 0,
          totalRevenue: 0,
          totalPrincipalRepaid: 0,
          totalDistributableProfit: 0,
          fundAllocations: a.fundAllocations
        };
      }
      allocMap[key].bottlesSold += a.bottlesSold;
      allocMap[key].totalRevenue += a.totalRevenue;
      allocMap[key].totalPrincipalRepaid += a.totalPrincipalRepaid;
      allocMap[key].totalDistributableProfit += a.totalDistributableProfit;
    });

    const enrichedOrders = orders.map(o => {
      const obj = { ...o };
      obj.deliceProfit = allocMap[o.orderNumber] || allocMap[String(o._id)] || null;
      return obj;
    });

    res.json({ success: true, count: enrichedOrders.length, orders: enrichedOrders });
  } catch (err) {
    next(err);
  }
};

/**
 * Get order by ID
 */
exports.getOrderById = async (req, res, next) => {
  try {
    let order = null;
    if (isConnected()) {
      try {
        order = await Order.findById(req.params.id);
      } catch (e) {}
    }
    if (!order) {
      order = memoryStore.orders.find(o => String(o._id) === req.params.id || o.orderNumber === req.params.id);
    }
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

/**
 * Get order by Transaction ID or Order Number (Publicly accessible for receipt)
 */
exports.getOrderByTransactionId = async (req, res, next) => {
  try {
    const { tranId } = req.params;
    const mongoose = require('mongoose');
    let order = null;

    if (isConnected()) {
      try {
        const query = [{ transactionId: tranId }, { orderNumber: tranId }];
        if (mongoose.Types.ObjectId.isValid(tranId)) {
          query.push({ _id: tranId });
        }
        order = await Order.findOne({ $or: query });
      } catch (e) {}
    }
    if (!order) {
      order = memoryStore.orders.find(o => 
        o.transactionId === tranId || 
        o.orderNumber === tranId || 
        String(o._id) === tranId
      );
    }
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

/**
 * Update order status & payment verification (Admin)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus, actualCourierCost, gatewayFee } = req.body;

    let order = null;
    if (isConnected()) {
      try {
        order = await Order.findById(id);
      } catch (e) {}
    }
    if (!order) {
      order = memoryStore.orders.find(o => String(o._id) === id);
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
      // If delivered, cash due from rider is collected
      if (orderStatus === 'delivered') {
        order.paymentStatus = 'paid';
        order.totalPaid = order.totalPayable;
      }
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') {
        order.totalPaid = order.totalPayable;
      }
    }

    if (actualCourierCost !== undefined) {
      order.actualCourierCost = Number(actualCourierCost);
    }
    if (gatewayFee !== undefined) {
      order.gatewayFee = Number(gatewayFee);
    }

    // Profit calculation:
    // If fully paid or delivered, full net profit is realized
    const revenue = (order.paymentStatus === 'paid' || order.orderStatus === 'delivered')
      ? order.totalPayable
      : (order.advancePaid || 0);

    order.netProfit = revenue
      - (order.totalProductCost || 0)
      - (order.actualCourierCost || 0)
      - (order.gatewayFee || 0);

    await order.save();

    // Trigger DÉLICE Profit Calculation & Capital Recovery Engine
    try {
      if (order.paymentStatus === 'paid' || order.orderStatus === 'delivered') {
        await deliceProfitService.allocateOrderSale(order);
      } else if (order.orderStatus === 'cancelled' || order.paymentStatus === 'refunded') {
        await deliceProfitService.reverseOrderSale(order, `Order ${order.orderStatus || order.paymentStatus}`);
      }
    } catch (allocErr) {
      console.error('[DÉLICE Profit Hook Error]', allocErr.message);
    }

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};
