const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { connectDB, getIsConnected, localStore } = require('../config/db');
const Admin = require('../models/Admin');

async function setupAdmin() {
  await connectDB();

  // Parse command line arguments
  const args = process.argv.slice(2);
  let username = 'admin';
  let email = 'concierge@deliceparfums.com';
  let password = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username' && args[i + 1]) username = args[i + 1];
    if (args[i] === '--email' && args[i + 1]) email = args[i + 1];
    if (args[i] === '--password' && args[i + 1]) password = args[i + 1];
  }

  // If no password provided, generate a secure random 16-character password
  if (!password) {
    password = 'Delice_' + crypto.randomBytes(6).toString('hex') + '!2026';
    console.log(`[Security] No password supplied via --password. Auto-generated secure initial password.`);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const adminData = {
    username,
    email,
    passwordHash,
    role: 'superadmin',
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (getIsConnected()) {
    const existing = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.updatedAt = new Date();
      await existing.save();
      console.log(`[Security] Admin user "${username}" updated successfully.`);
    } else {
      await Admin.create(adminData);
      console.log(`[Security] Admin user "${username}" created successfully.`);
    }
  } else {
    const admins = localStore.getCollection('admins');
    const existingIdx = admins.findIndex(a => a.username === username || a.email === email);
    if (existingIdx !== -1) {
      admins[existingIdx].passwordHash = passwordHash;
      admins[existingIdx].updatedAt = new Date();
      console.log(`[Security] Admin user "${username}" updated in persistent store.`);
    } else {
      adminData._id = `adm_${Date.now()}`;
      admins.push(adminData);
      console.log(`[Security] Admin user "${username}" created in persistent store.`);
    }
    localStore.save();
  }

  console.log('========================================================');
  console.log('  DÉLICE LUXURY ADMIN CREDENTIALS');
  console.log('========================================================');
  console.log(`  Admin URL: http://localhost:4000/admin`);
  console.log(`  Username:  ${username}`);
  console.log(`  Email:     ${email}`);
  console.log(`  Password:  ${password}`);
  console.log('========================================================');
  console.log('  Keep these credentials confidential. You can change');
  console.log('  your password at any time in /admin -> Settings.');
  console.log('========================================================');
}

if (require.main === module) {
  setupAdmin().then(() => process.exit(0)).catch(err => {
    console.error('[Security] Failed to setup admin:', err);
    process.exit(1);
  });
}

module.exports = setupAdmin;
