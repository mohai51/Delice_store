require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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
const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');
const InventoryAdjustment = require('../models/InventoryAdjustment');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Migration] MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('========================================================');
  console.log('  DÉLICE — MONGODB ATLAS CLUSTER MIGRATION');
  console.log('========================================================');
  console.log(`Connecting to: ${uri.replace(/:([^@:]+)@/, ':****@')}`);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });

  console.log('✓ Successfully connected to MongoDB Atlas!');

  const jsonPath = path.join(__dirname, '../../data/delice_db.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('[Migration] No local data/delice_db.json found. Creating initial collections...');
  } else {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const local = JSON.parse(raw);

    // 1. Migrate Admin
    if (local.admins && local.admins.length > 0) {
      console.log(`\n[1/8] Migrating ${local.admins.length} Admin account(s)...`);
      for (const adm of local.admins) {
        const { _id, ...cleanAdm } = adm;
        const existing = await Admin.findOne({ username: cleanAdm.username });
        if (existing) {
          await Admin.updateOne({ username: cleanAdm.username }, cleanAdm);
          console.log(`  ✓ Updated existing admin: ${cleanAdm.username}`);
        } else {
          await Admin.create(cleanAdm);
          console.log(`  ✓ Created admin in Atlas: ${cleanAdm.username}`);
        }
      }
    }

    // 2. Migrate Products
    if (local.products && local.products.length > 0) {
      console.log(`\n[2/8] Migrating ${local.products.length} Fragrance product(s)...`);
      for (const prod of local.products) {
        const { _id, ...cleanProd } = prod;
        // Ensure products are published live in Atlas
        cleanProd.status = 'published';
        cleanProd.isFeatured = true;

        const existing = await Product.findOne({ slug: cleanProd.slug });
        if (existing) {
          await Product.updateOne({ slug: cleanProd.slug }, cleanProd);
          console.log(`  ✓ Updated product in Atlas: ${cleanProd.name} (${cleanProd.slug})`);
        } else {
          await Product.create(cleanProd);
          console.log(`  ✓ Inserted product into Atlas: ${cleanProd.name} (${cleanProd.slug})`);
        }
      }
    }

    // 3. Migrate Homepage
    if (local.homepage) {
      console.log('\n[3/8] Migrating Homepage configurations and sections...');
      const { _id, ...cleanHp } = local.homepage;
      cleanHp.isPublished = true;
      const existing = await Homepage.findOne({ isPublished: true });
      if (existing) {
        await Homepage.updateOne({ _id: existing._id }, cleanHp);
        console.log('  ✓ Updated published homepage layout in Atlas.');
      } else {
        await Homepage.create(cleanHp);
        console.log('  ✓ Created published homepage layout in Atlas.');
      }
    }

    // 4. Migrate Media Assets
    if (local.media && local.media.length > 0) {
      console.log(`\n[4/8] Migrating ${local.media.length} Media Library record(s)...`);
      for (const med of local.media) {
        const { _id, ...cleanMed } = med;
        const existing = await Media.findOne({ filename: cleanMed.filename });
        if (!existing) {
          await Media.create(cleanMed);
          console.log(`  ✓ Inserted media record in Atlas: ${cleanMed.filename}`);
        }
      }
    }

    // 5. Migrate Settings
    if (local.settings) {
      console.log('\n[5/8] Migrating Store Settings & Delivery Zones...');
      const { _id, ...cleanSett } = local.settings;
      const existing = await Settings.findOne();
      if (existing) {
        await Settings.updateOne({ _id: existing._id }, cleanSett);
        console.log('  ✓ Updated store settings in Atlas.');
      } else {
        await Settings.create(cleanSett);
        console.log('  ✓ Inserted store settings into Atlas.');
      }
    }

    // 6. Migrate Orders
    if (local.orders && local.orders.length > 0) {
      console.log(`\n[6/8] Migrating ${local.orders.length} Order(s)...`);
      for (const ord of local.orders) {
        const { _id, ...cleanOrd } = ord;
        const existing = await Order.findOne({ orderReference: cleanOrd.orderReference });
        if (!existing) {
          await Order.create(cleanOrd);
          console.log(`  ✓ Migrated order to Atlas: ${cleanOrd.orderReference}`);
        }
      }
    }

    // 7. Migrate Referral Codes
    if (local.referralCodes && local.referralCodes.length > 0) {
      console.log(`\n[7/8] Migrating ${local.referralCodes.length} Referral Code(s)...`);
      for (const ref of local.referralCodes) {
        const { _id, ...cleanRef } = ref;
        const existing = await ReferralCode.findOne({ code: cleanRef.code });
        if (!existing) {
          await ReferralCode.create(cleanRef);
          console.log(`  ✓ Migrated referral code: ${cleanRef.code}`);
        }
      }
    }

    // 8. Migrate Customers
    if (local.customers && local.customers.length > 0) {
      console.log(`\n[8/8] Migrating ${local.customers.length} Patron record(s)...`);
      for (const cust of local.customers) {
        const { _id, ...cleanCust } = cust;
        const existing = await Customer.findOne({ phone: cleanCust.phone });
        if (!existing) {
          await Customer.create(cleanCust);
          console.log(`  ✓ Migrated customer: ${cleanCust.name} (${cleanCust.phone})`);
        }
      }
    }
  }

  // Print Collection Verification Counts from MongoDB Atlas
  console.log('\n========================================================');
  console.log('  MONGODB ATLAS CLUSTER STATUS & VERIFIED COUNTS');
  console.log('========================================================');
  const counts = {
    Admins: await Admin.countDocuments(),
    Products: await Product.countDocuments(),
    Orders: await Order.countDocuments(),
    Homepages: await Homepage.countDocuments(),
    Media: await Media.countDocuments(),
    Customers: await Customer.countDocuments(),
    ReferralCodes: await ReferralCode.countDocuments(),
    Settings: await Settings.countDocuments()
  };

  for (const [col, cnt] of Object.entries(counts)) {
    console.log(`  • Collection [${col.padEnd(14)}]: ${cnt} documents`);
  }
  console.log('========================================================');
  console.log('  ALL DATA HAS BEEN SUCCESSFULLY LOADED INTO MONGODB ATLAS!');
  console.log('========================================================');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('[Migration] Failed with error:', err);
  process.exit(1);
});
