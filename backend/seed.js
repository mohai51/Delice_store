/**
 * DÉLICE Database Seed Script
 * Populates Superadmin User, Products, System Settings, and Fund Allocations.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('./config/db');
const AdminUser = require('./models/AdminUser');
const Product = require('./models/Product');
const Setting = require('./models/Setting');
const FundAllocation = require('./models/FundAllocation');
const Expense = require('./models/Expense');
const Order = require('./models/Order');

async function seed() {
  await connectDB();

  console.log('[Seed] Seeding DÉLICE Database...');

  // 1. Seed Admin User
  const adminUsername = process.env.ADMIN_DEFAULT_USER || 'admin';
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@delicefragrance.com';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@Delice2026';

  let admin = await AdminUser.findOne({ username: adminUsername });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    admin = await AdminUser.create({
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: 'superadmin'
    });
    console.log(`[Seed] Superadmin created: ${adminUsername} (Password: ${adminPassword})`);
  } else {
    console.log(`[Seed] Superadmin already exists.`);
  }

  // 2. Seed Official 3 Products
  const products = [
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
      image: '/assets/images/bloom.svg',
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
      image: '/assets/images/momentum.svg',
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
      image: '/assets/images/enigma.svg',
      stock: 90,
      isActive: true,
      badge: 'Opening Offer'
    }
  ];

  for (const p of products) {
    await Product.findOneAndUpdate({ id: p.id }, p, { upsert: true, new: true });
  }
  console.log('[Seed] Products seeded successfully.');

  // 3. Seed Settings
  const settings = [
    { key: 'deliveryChargeInsideDhaka', value: 60, isPublic: true, description: 'Delivery fee for Dhaka city' },
    { key: 'deliveryChargeOutsideDhaka', value: 120, isPublic: true, description: 'Delivery fee for outside Dhaka' },
    { key: 'defaultProductCOGS', value: 320, isPublic: false, description: 'Default COGS per 30ml bottle' },
    { key: 'gatewayFeePercentage', value: 2.5, isPublic: false, description: 'SSLCOMMERZ transaction fee percentage' },
    { key: 'storePhone', value: '+880 1700-000000', isPublic: true, description: 'Support phone and WhatsApp' },
    { key: 'storeEmail', value: 'care@delicefragrance.com', isPublic: true, description: 'Support email' },
    { key: 'facebookUrl', value: 'https://facebook.com/delicefragrance', isPublic: true, description: 'Official Facebook link' }
  ];

  for (const s of settings) {
    await Setting.findOneAndUpdate({ key: s.key }, s, { upsert: true, new: true });
  }
  console.log('[Seed] Settings seeded successfully.');

  // 4. Seed Fund Allocations
  const allocations = [
    { name: 'Business Reinvestment', percentage: 40, isPercentage: true, description: 'Batch expansion & compounding', color: '#4A102A' },
    { name: 'Personal Withdrawal', percentage: 25, isPercentage: true, description: 'Founder profit withdrawal', color: '#181619' },
    { name: 'Marketing Budget', percentage: 15, isPercentage: true, description: 'Campus promotions & meta ads', color: '#FF665C' },
    { name: 'Emergency Fund', percentage: 10, isPercentage: true, description: 'Operating cash buffer', color: '#C5A46D' },
    { name: 'Future Stock Purchase', percentage: 10, isPercentage: true, description: 'Atomizers, caps and packaging cartons', color: '#5E1837' }
  ];

  for (const a of allocations) {
    await FundAllocation.findOneAndUpdate({ name: a.name }, a, { upsert: true, new: true });
  }
  console.log('[Seed] Fund Allocations seeded successfully.');

  // 5. Initial Seed Orders & Expenses for immediate realistic reporting
  const orderCount = await Order.countDocuments();
  if (orderCount === 0) {
    console.log('[Seed] Creating initial launch batch records...');
    
    // Seed an initial paid order
    const order1 = await Order.create({
      orderNumber: 'DLC-261001',
      transactionId: 'TRAN_1731300000001_101',
      customer: {
        fullName: 'Zubair Hossain',
        phone: '01711223344',
        email: 'zubair@example.com',
        district: 'Dhaka',
        address: 'House 14, Road 5, Dhanmondi, Dhaka',
        orderNotes: 'Please ring the bell upon arrival.'
      },
      items: [{
        productId: 'delice-bloom',
        productName: 'DÉLICE BLOOM',
        volume: '30ml',
        price: 799,
        originalPrice: 850,
        cogs: 320,
        quantity: 1,
        itemTotal: 799
      }],
      productSubtotal: 799,
      deliveryArea: 'insideDhaka',
      deliveryCharge: 60,
      totalPayable: 859,
      totalPaid: 859,
      totalProductCost: 320,
      actualCourierCost: 60,
      gatewayFee: 21.48, // 2.5% of 859
      netProfit: 457.52, // 859 - 320 - 60 - 21.48
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      paymentDetails: {
        bankTranId: 'BANK_DBBL_991823',
        cardType: 'BKASH-MobileBanking',
        cardBrand: 'bKash',
        valId: 'VALIDATED_SEED_01',
        validatedAt: new Date(Date.now() - 86400000 * 2)
      }
    });

    const order2 = await Order.create({
      orderNumber: 'DLC-261002',
      transactionId: 'TRAN_1731300000002_102',
      customer: {
        fullName: 'Nafisa Rahman',
        phone: '01819887766',
        email: 'nafisa@example.com',
        district: 'Chittagong',
        address: 'GEC Circle, Nasirabad, Chittagong',
        orderNotes: 'Fragrance gift for university convocation.'
      },
      items: [
        {
          productId: 'delice-momentum',
          productName: 'DÉLICE MOMENTUM',
          volume: '30ml',
          price: 799,
          originalPrice: 850,
          cogs: 320,
          quantity: 1,
          itemTotal: 799
        },
        {
          productId: 'delice-enigma',
          productName: 'DÉLICE ENIGMA',
          volume: '30ml',
          price: 799,
          originalPrice: 850,
          cogs: 320,
          quantity: 1,
          itemTotal: 799
        }
      ],
      productSubtotal: 1598,
      deliveryArea: 'outsideDhaka',
      deliveryCharge: 120,
      totalPayable: 1718,
      totalPaid: 1718,
      totalProductCost: 640,
      actualCourierCost: 120,
      gatewayFee: 42.95,
      netProfit: 915.05,
      paymentStatus: 'paid',
      orderStatus: 'processing',
      paymentDetails: {
        bankTranId: 'BANK_VISA_448192',
        cardType: 'VISA-CreditCard',
        cardBrand: 'Visa',
        valId: 'VALIDATED_SEED_02',
        validatedAt: new Date(Date.now() - 86400000)
      }
    });

    // Seed initial operational expenses
    await Expense.create([
      {
        title: 'Initial Protective Folding Boxes (500 units)',
        category: 'packaging',
        amount: 3500,
        note: 'High-density rigid unboxing cartons',
        date: new Date(Date.now() - 86400000 * 5)
      },
      {
        title: 'Campus Launch Awareness & Photography',
        category: 'marketing',
        amount: 2000,
        note: 'University student awareness campaign',
        date: new Date(Date.now() - 86400000 * 3)
      }
    ]);

    console.log('[Seed] Initial sample launch orders and expenses seeded.');
  }

  console.log('[Seed] Database initialization complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
