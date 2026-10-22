const mongoose = require('mongoose');

const HomepageSchema = new mongoose.Schema({
  version: { type: Number, default: 1 },
  isPublished: { type: Boolean, default: true },
  
  announcementBar: {
    enabled: { type: Boolean, default: true },
    text: { type: String, default: 'Complimentary shipping across Bangladesh on orders over ৳5,000' },
    linkUrl: { type: String, default: '#collection' }
  },

  hero: {
    desktopImageUrl: { type: String, default: '/images/hero-desktop.jpg' },
    mobileImageUrl: { type: String, default: '/images/hero-desktop.jpg' },
    focalPoint: {
      x: { type: Number, default: 50 }, // percentage 0-100
      y: { type: Number, default: 50 }
    },
    headline: { type: String, default: 'A Signature, Remembered.' },
    description: { type: String, default: 'Haute perfumery crafted in Grasse and bottled for discerning souls in Bangladesh.' },
    ctaText: { type: String, default: 'Discover DÉLICE' },
    ctaLink: { type: String, default: '#collection' }
  },

  featuredProducts: [{ type: String }], // Array of product slugs/IDs in display order

  brandStory: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'The Philosophy of Quiet Luxury' },
    subtitle: { type: String, default: 'Raw Essence, Meticulous Restraint' },
    paragraph1: { type: String, default: 'At DÉLICE, perfume is neither an ornament nor an imposition. It is an intimate aura, composed of rare raw botanicals and precious resins from historic distillers.' },
    paragraph2: { type: String, default: 'Each batch matures in small casks, honoring French craftsmanship while attuned to the tropical cadence of Bangladesh.' },
    imageUrl: { type: String, default: '/images/brand-story.jpg' }
  },

  customerExperiences: {
    enabled: { type: Boolean, default: false }, // Hidden by default until real verified reviews exist!
    title: { type: String, default: 'Customer Impressions' },
    subtitle: { type: String, default: 'Verified Patron Reflections' },
    items: [{
      id: { type: String },
      customerName: { type: String },
      location: { type: String },
      quote: { type: String },
      scentPurchased: { type: String },
      approved: { type: Boolean, default: false },
      permissionRecorded: { type: Boolean, default: false },
      mediaUrl: { type: String, default: null }
    }]
  },

  footer: {
    aboutText: { type: String, default: 'DÉLICE Parfums — Quiet luxury fragrances crafted with integrity.' },
    contactEmail: { type: String, default: 'concierge@deliceparfums.com' },
    contactPhone: { type: String, default: '+880 1712 000 000' },
    address: { type: String, default: 'Gulshan 2, Dhaka, Bangladesh' },
    instagramUrl: { type: String, default: 'https://instagram.com' },
    facebookUrl: { type: String, default: 'https://facebook.com' },
    whatsappNumber: { type: String, default: '+8801712000000' },
    newsletterEnabled: { type: Boolean, default: true }
  },

  sectionOrder: [{ type: String }], // e.g. ['hero', 'collection', 'story', 'experiences', 'footer']
  sectionVisibility: {
    announcement: { type: Boolean, default: true },
    hero: { type: Boolean, default: true },
    collection: { type: Boolean, default: true },
    story: { type: Boolean, default: true },
    experiences: { type: Boolean, default: false },
    footer: { type: Boolean, default: true }
  },

  savedBy: { type: String, default: 'System' },
  publishedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Homepage || mongoose.model('Homepage', HomepageSchema);
