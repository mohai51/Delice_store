const Setting = require('../models/Setting');
const deliceProfitService = require('../services/deliceProfitService');
const { memoryStore, isConnected } = require('../config/db');

const DEFAULT_SETTINGS = {
  deliveryChargeInsideDhaka: { value: 60, isPublic: true, description: 'Delivery fee for addresses inside Dhaka city' },
  deliveryChargeOutsideDhaka: { value: 120, isPublic: true, description: 'Delivery fee for outside Dhaka / nationwide' },
  bkashNagadNumber: { value: process.env.BKASH_NAGAD_NUMBER || '01731101780', isPublic: true, description: 'Official bKash and Nagad Send Money number (Personal)' },
  defaultProductCOGS: { value: 320, isPublic: false, description: 'Default cost of goods sold per 30ml bottle' },
  gatewayFeePercentage: { value: 0, isPublic: false, description: 'Payment cash-out / fee percentage (0% for bKash/Nagad Send Money)' },
  storePhone: { value: '+880 1700-000000', isPublic: true, description: 'Customer care phone and WhatsApp' },
  storeEmail: { value: 'care@delicefragrance.com', isPublic: true, description: 'Customer care email' },
  facebookUrl: { value: 'https://facebook.com/delicefragrance', isPublic: true, description: 'Official brand Facebook page' }
};

/**
 * Get Public Settings
 */
exports.getPublicSettings = async (req, res) => {
  const result = {
    deliveryChargeInsideDhaka: DEFAULT_SETTINGS.deliveryChargeInsideDhaka.value,
    deliveryChargeOutsideDhaka: DEFAULT_SETTINGS.deliveryChargeOutsideDhaka.value,
    bkashNagadNumber: DEFAULT_SETTINGS.bkashNagadNumber.value,
    storePhone: DEFAULT_SETTINGS.storePhone.value,
    storeEmail: DEFAULT_SETTINGS.storeEmail.value,
    facebookUrl: DEFAULT_SETTINGS.facebookUrl.value
  };

  if (isConnected()) {
    try {
      const settings = await Setting.find({ isPublic: true });
      settings.forEach(s => { result[s.key] = s.value; });
    } catch (e) {}
  } else if (memoryStore.settings) {
    Object.keys(memoryStore.settings).forEach(k => {
      if (result[k] !== undefined) result[k] = memoryStore.settings[k];
    });
  }

  res.json(result);
};

/**
 * Get All Settings (Admin)
 */
exports.getAllSettings = async (req, res) => {
  const settingsMap = {};
  Object.keys(DEFAULT_SETTINGS).forEach(k => {
    settingsMap[k] = { ...DEFAULT_SETTINGS[k], key: k };
  });

  if (isConnected()) {
    try {
      const dbSettings = await Setting.find();
      dbSettings.forEach(s => {
        settingsMap[s.key] = {
          key: s.key,
          value: s.value,
          isPublic: s.isPublic,
          description: s.description || (DEFAULT_SETTINGS[s.key] ? DEFAULT_SETTINGS[s.key].description : '')
        };
      });
    } catch (e) {}
  } else if (memoryStore.settings) {
    Object.keys(memoryStore.settings).forEach(k => {
      if (settingsMap[k]) settingsMap[k].value = memoryStore.settings[k];
    });
  }

  res.json({ success: true, settings: Object.values(settingsMap) });
};

/**
 * Update Setting (Admin)
 */
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    if (isConnected()) {
      for (const [key, value] of Object.entries(updates)) {
        const isPublic = DEFAULT_SETTINGS[key] ? DEFAULT_SETTINGS[key].isPublic : false;
        const description = DEFAULT_SETTINGS[key] ? DEFAULT_SETTINGS[key].description : '';

        await Setting.findOneAndUpdate(
          { key },
          { key, value, isPublic, description },
          { upsert: true, new: true }
        );
      }
    }

    if (!memoryStore.settings) memoryStore.settings = {};
    Object.assign(memoryStore.settings, updates);

    // Sync with DÉLICE Capital Recovery Baseline if provided
    if (updates.initialPrincipal || updates.unitCost || updates.profitPerBottle || updates.totalInitialStock) {
      try {
        await deliceProfitService.updateSettings(updates, req.admin?.username || 'Admin');
      } catch (e) {
        console.error('[Delice Profit Settings Sync Error]', e.message);
      }
    }

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
};
