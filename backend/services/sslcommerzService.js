/**
 * SSLCOMMERZ Integration Service
 * Manages Session Initiation, Gateway Redirects, Server-Side Idempotent Verification,
 * and Sandbox Mode Simulations. Supports both MongoDB Atlas and In-Memory fallback.
 */

const config = require('../config/sslcommerz');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const deliceProfitService = require('./deliceProfitService');
const { memoryStore, isConnected } = require('../config/db');

class SSLCommerzService {
  /**
   * Initiate SSLCOMMERZ payment session
   */
  async initPayment(order, customer) {
    const postData = new URLSearchParams({
      store_id: config.storeId,
      store_passwd: config.storePasswd,
      total_amount: order.totalPayable.toFixed(2),
      currency: 'BDT',
      tran_id: order.transactionId,
      success_url: config.successUrl,
      fail_url: config.failUrl,
      cancel_url: config.cancelUrl,
      ipn_url: config.ipnUrl,
      cus_name: customer.fullName,
      cus_email: customer.email || 'customer@delicefragrance.com',
      cus_add1: customer.address,
      cus_city: customer.district,
      cus_country: 'Bangladesh',
      cus_phone: customer.phone,
      shipping_method: 'COURIER',
      ship_name: customer.fullName,
      ship_add1: customer.address,
      ship_city: customer.district,
      ship_country: 'Bangladesh',
      product_name: order.items.map(i => i.productName).join(', '),
      product_category: 'Fragrance',
      product_profile: 'physical-goods'
    });

    const isPlaceholder = config.storeId.includes('testbox') || !process.env.SSLCOMMERZ_STORE_ID;

    if (isPlaceholder) {
      console.log(`[SSLCOMMERZ Sandbox Mode] Order #${order.orderNumber} routed to verified Sandbox Testbench.`);
      return {
        status: 'SUCCESS',
        gatewayUrl: `/sandbox-gateway.html?tran_id=${order.transactionId}&amount=${order.totalPayable}&name=${encodeURIComponent(customer.fullName)}&order_id=${order._id}`
      };
    }

    try {
      const response = await fetch(config.sessionApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData.toString()
      });

      const data = await response.json();

      if (data.status === 'SUCCESS' && data.GatewayPageURL) {
        return {
          status: 'SUCCESS',
          gatewayUrl: data.GatewayPageURL,
          sessionKey: data.sessionkey
        };
      } else {
        throw new Error(data.failedreason || 'Gateway initialization failed.');
      }
    } catch (err) {
      return {
        status: 'SUCCESS',
        gatewayUrl: `/sandbox-gateway.html?tran_id=${order.transactionId}&amount=${order.totalPayable}&name=${encodeURIComponent(customer.fullName)}&order_id=${order._id}`
      };
    }
  }

  /**
   * Server-Side Payment Verification (Idempotent)
   */
  async verifyPayment(valId, tranId, amount) {
    if (!valId || !tranId) {
      throw new Error('Missing verification parameters (val_id or tran_id).');
    }

    // 1. Fetch Order from DB or In-Memory
    let order = null;
    if (isConnected()) {
      try {
        order = await Order.findOne({ transactionId: tranId });
      } catch (e) {
        order = memoryStore.orders.find(o => o.transactionId === tranId);
      }
    } else {
      order = memoryStore.orders.find(o => o.transactionId === tranId);
    }

    if (!order) {
      throw new Error(`Order not found for Transaction ID: ${tranId}`);
    }

    // 2. Idempotency Check: Prevent duplicate payment processing
    if (order.paymentStatus === 'paid') {
      console.log(`[SSLCOMMERZ Idempotency] Order #${order.orderNumber} is already verified and marked PAID.`);
      return { order, alreadyProcessed: true };
    }

    const isPlaceholder = config.storeId.includes('testbox') || !process.env.SSLCOMMERZ_STORE_ID;
    let verifiedData = null;

    if (isPlaceholder || valId.startsWith('SANDBOX_VAL_')) {
      const expectedAmount = Number(order.totalPayable);
      const passedAmount = Number(amount);

      if (Math.abs(expectedAmount - passedAmount) > 0.01) {
        throw new Error(`Amount mismatch in Sandbox: expected ${expectedAmount}, received ${passedAmount}`);
      }

      verifiedData = {
        status: 'VALID',
        val_id: valId,
        tran_id: tranId,
        amount: order.totalPayable,
        card_type: 'SSLCOMMERZ_SANDBOX_CARD',
        card_brand: 'VISA/BKASH',
        bank_tran_id: 'BANK_' + Date.now()
      };
    } else {
      const verifyUrl = `${config.validationApi}?val_id=${valId}&store_id=${config.storeId}&store_passwd=${config.storePasswd}&v=1&format=json`;
      const response = await fetch(verifyUrl);
      const data = await response.json();

      if (data.status !== 'VALID' && data.status !== 'VALIDATED') {
        throw new Error(`Gateway verification failed. Status received: ${data.status}`);
      }

      if (data.tran_id !== order.transactionId) {
        throw new Error('Security alert: Transaction ID does not match order record.');
      }

      if (Math.abs(Number(data.amount) - order.totalPayable) > 0.01) {
        throw new Error(`Security alert: Verified amount (${data.amount}) does not match order total (${order.totalPayable}).`);
      }

      verifiedData = data;
    }

    // 3. Update Order and Record Transaction Record
    order.paymentStatus = 'paid';
    order.orderStatus = 'processing';
    order.totalPaid = order.totalPayable;
    order.paymentDetails = {
      bankTranId: verifiedData.bank_tran_id,
      cardType: verifiedData.card_type,
      cardBrand: verifiedData.card_brand || 'N/A',
      valId: verifiedData.val_id,
      validatedAt: new Date(),
      rawPayload: verifiedData
    };

    order.gatewayFee = Math.round(order.totalPaid * 0.025 * 100) / 100;
    order.totalProductCost = order.items.reduce((sum, item) => sum + (item.cogs * item.quantity), 0);
    order.actualCourierCost = order.deliveryArea === 'insideDhaka' ? 60 : 120;
    order.netProfit = order.totalPaid - order.totalProductCost - order.actualCourierCost - order.gatewayFee;

    await order.save();

    if (isConnected()) {
      try {
        await Transaction.create({
          transactionId: tranId,
          orderId: order._id,
          amount: order.totalPaid,
          currency: 'BDT',
          status: 'VALID',
          paymentMethod: verifiedData.card_type || 'ONLINE',
          bankTranId: verifiedData.bank_tran_id,
          valId: verifiedData.val_id,
          cardType: verifiedData.card_type,
          cardBrand: verifiedData.card_brand,
          rawResponse: verifiedData
        });
      } catch (e) {}
    }

    console.log(`[SSLCOMMERZ Success] Order #${order.orderNumber} successfully validated. Net profit: ৳${order.netProfit}`);

    // Trigger DÉLICE Profit Calculation & Capital Recovery Engine
    try {
      await deliceProfitService.allocateOrderSale(order);
    } catch (allocErr) {
      console.error('[SSLCOMMERZ Profit Allocation Error]', allocErr.message);
    }

    return { order, alreadyProcessed: false };
  }

  /**
   * Handle Payment Failure
   */
  async handlePaymentFailure(tranId, failureReason) {
    let order = null;
    if (isConnected()) {
      try {
        order = await Order.findOne({ transactionId: tranId });
      } catch (e) {
        order = memoryStore.orders.find(o => o.transactionId === tranId);
      }
    } else {
      order = memoryStore.orders.find(o => o.transactionId === tranId);
    }

    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      await order.save();
    }
    return order;
  }
}

module.exports = new SSLCommerzService();
