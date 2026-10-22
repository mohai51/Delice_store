const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  storeName: { type: String, default: 'DÉLICE' },
  tagline: { type: String, default: 'Haute Parfumerie Bangladesh' },
  currency: { type: String, default: 'BDT' },
  currencySymbol: { type: String, default: '৳' },
  
  brandColors: {
    backgroundIvory: { type: String, default: '#F9F6F0' },
    deepBlack: { type: String, default: '#141414' },
    champagneGold: { type: String, default: '#C5A880' }
  },

  contact: {
    email: { type: String, default: 'concierge@deliceparfums.com' },
    phone: { type: String, default: '+880 1712 000 000' },
    whatsapp: { type: String, default: '+8801712000000' },
    address: { type: String, default: 'House 14, Road 71, Gulshan 2, Dhaka 1212' },
    instagram: { type: String, default: 'https://instagram.com/deliceparfums' },
    facebook: { type: String, default: 'https://facebook.com/deliceparfums' }
  },

  deliveryZones: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    charge: { type: Number, required: true },
    estimatedDays: { type: String, default: '2-3 business days' }
  }],
  freeDeliveryThreshold: { type: Number, default: 5000 },

  paymentMethods: {
    cod: {
      enabled: { type: Boolean, default: true },
      title: { type: String, default: 'Cash on Delivery' },
      description: { type: String, default: 'Inspect package upon arrival and pay courier in cash.' }
    },
    bkashManual: {
      enabled: { type: Boolean, default: true },
      title: { type: String, default: 'Manual bKash Send Money' },
      number: { type: String, default: '01712000000' },
      accountType: { type: String, default: 'Personal / Merchant' },
      instructions: { 
        type: String, 
        default: 'Send the exact order total to our bKash number. Then input your sending bKash number and Transaction ID (TrxID) below. Never share your bKash PIN or OTP with anyone. Your order will be verified by our concierge before dispatch.' 
      }
    }
  },

  policies: {
    delivery: { 
      type: String, 
      default: 'Delivery within Dhaka metropolitan area is fulfilled within 24 to 48 hours. Orders across other districts in Bangladesh are delivered within 3 to 5 business days via temperature-controlled courier partners.' 
    },
    returns: { 
      type: String, 
      default: 'Given the intimate and fragile nature of haute perfumery, bottles may be returned within 7 calendar days of receipt only if the cellophane security seal remains unbroken and intact. Damaged transit claims must be reported within 24 hours of delivery.' 
    },
    privacy: { 
      type: String, 
      default: 'DÉLICE safeguards client privacy with paramount discretion. We only record information strictly necessary to fulfill delivery and verify transactions. We do not sell, rent, or distribute personal data.' 
    },
    terms: { 
      type: String, 
      default: 'All fragrance formulations, photographic assets, and brand marks are exclusive intellectual property of DÉLICE. Order confirmation constitutes an offer to purchase subject to product availability and payment verification.' 
    }
  },

  referralRules: {
    commissionPercent: { type: Number, default: 5 },
    refereeDiscountPercent: { type: Number, default: 10 },
    returnPeriodDays: { type: Number, default: 7 }
  },

  seoDefaults: {
    title: { type: String, default: 'DÉLICE — Quiet Luxury Perfumery' },
    description: { type: String, default: 'Exquisite haute fragrances inspired by French craftsmanship and bottled for discerning patrons in Bangladesh.' },
    ogImageUrl: { type: String, default: '/images/hero-desktop.jpg' }
  },

  analyticsRetentionDays: { type: Number, default: 90 },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'System' }
});

module.exports = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
