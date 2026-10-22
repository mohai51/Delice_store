const { connectDB, getIsConnected, localStore } = require('../config/db');
const storeService = require('../services/storeService');
const Product = require('../models/Product');
const Media = require('../models/Media');

async function seedInitialContent() {
  console.log('[Seed] Initializing DÉLICE demo catalog...');
  await connectDB();

  // Check if products already exist
  const existingProducts = await storeService.getProducts({ includeArchived: true });
  if (existingProducts.length > 0) {
    console.log(`[Seed] Database already contains ${existingProducts.length} product(s). Skipping product seeding.`);
    return;
  }

  // 1. DÉLICE No. 01 — Fresh / Woody direction
  // Per requirements: clearly marked demo product, kept unpublished (draft) by default
  const product01 = {
    name: 'DÉLICE No. 01',
    slug: 'delice-no-01',
    sku: 'DEL-01-EDP',
    scentFamily: 'Fresh Woody',
    shortDescription: 'Crisp Italian bergamot and cracked coriander evolving into smoked Atlas cedarwood, dry vetiver, and white musk.',
    fullDescription: 'DÉLICE No. 01 is an homage to pristine mornings in Grasse and the tranquil sanctuary of an old library. Bright Mediterranean citrus awakens the senses before receding into a meditative heart of cedarwood shavings, earthy Haitian vetiver, and sheer ambergris. Subtly present, never loud—an intimate olfactory whisper for the thoughtful individual.',
    scentNotes: {
      top: ['Calabrian Bergamot', 'Cracked Coriander', 'Bitter Petitgrain'],
      heart: ['Atlas Cedarwood', 'Orris Root', 'French Lavender'],
      base: ['Haitian Vetiver', 'White Amber', 'Clean Musk']
    },
    ingredients: [
      'Alcohol Denat.',
      'Parfum (Fragrance)',
      'Aqua (Water)',
      'Limonene',
      'Linalool',
      'Citronellol',
      'Geraniol',
      'Citral',
      'Farnesol'
    ],
    variants: [
      {
        size: '50ml',
        volumeMl: 50,
        price: 7800, // in BDT integer units (৳7,800)
        salePrice: null,
        stock: 24,
        sku: 'DEL-01-50ML'
      },
      {
        size: '100ml',
        volumeMl: 100,
        price: 12500, // in BDT integer units (৳12,500)
        salePrice: null,
        stock: 18,
        sku: 'DEL-01-100ML'
      }
    ],
    images: [
      {
        id: 'img_delice_01',
        url: '/images/delice-01.jpg',
        thumbnailUrl: '/images/delice-01.jpg',
        altText: 'Heavy crystal flacon of DÉLICE No. 01 seated upon warm limestone plinth',
        isPrimary: true,
        order: 0
      }
    ],
    isFeatured: true,
    featuredOrder: 1,
    status: 'draft', // Kept unpublished/draft by default per requirements until confirmed by owner
    seo: {
      title: 'DÉLICE No. 01 — Fresh Woody Eau de Parfum',
      description: 'An intimate, understated signature of crisp bergamot, noble Atlas cedar, and dry vetiver. Formulated in Grasse.'
    }
  };

  // 2. DÉLICE No. 02 — Amber / Floral direction
  // Per requirements: clearly marked demo product, kept unpublished (draft) by default
  const product02 = {
    name: 'DÉLICE No. 02',
    slug: 'delice-no-02',
    sku: 'DEL-02-EDP',
    scentFamily: 'Amber Floral',
    shortDescription: 'Velvety Damask rose absolute kissed by spiced saffron, wrapped in balsamic labdanum and rich golden amber.',
    fullDescription: 'DÉLICE No. 02 captures the golden dusk of ancient courtyards. Centered on rich French centifolia rose petals steeped in warm honeyed resins, it unfurls with saffron threads, creamy sandalwood, and Madagascar vanilla bean. A warm, enveloping composition crafted for evening gatherings and introspective nights.',
    scentNotes: {
      top: ['Damask Rose Petals', 'Persian Saffron', 'Pink Peppercorn'],
      heart: ['Centifolia Rose Absolute', 'Balsamic Labdanum', 'Incense Smoke'],
      base: ['Golden Amber Resin', 'Creamy Sandalwood', 'Madagascar Bourbon Vanilla']
    },
    ingredients: [
      'Alcohol Denat.',
      'Parfum (Fragrance)',
      'Aqua (Water)',
      'Benzyl Benzoate',
      'Eugenol',
      'Cinnamyl Alcohol',
      'Coumarin',
      'Isoeugenol'
    ],
    variants: [
      {
        size: '50ml',
        volumeMl: 50,
        price: 8800, // in BDT integer units (৳8,800)
        salePrice: null,
        stock: 20,
        sku: 'DEL-02-50ML'
      },
      {
        size: '100ml',
        volumeMl: 100,
        price: 13900, // in BDT integer units (৳13,900)
        salePrice: null,
        stock: 15,
        sku: 'DEL-02-100ML'
      }
    ],
    images: [
      {
        id: 'img_delice_02',
        url: '/images/delice-02.jpg',
        thumbnailUrl: '/images/delice-02.jpg',
        altText: 'DÉLICE No. 02 amber floral flacon resting upon natural travertine stone under soft evening light',
        isPrimary: true,
        order: 0
      }
    ],
    isFeatured: true,
    featuredOrder: 2,
    status: 'draft', // Kept unpublished/draft by default per requirements
    seo: {
      title: 'DÉLICE No. 02 — Amber Floral Eau de Parfum',
      description: 'Opulent rose absolute and spiced amber resins distilled into an enveloping quiet luxury fragrance.'
    }
  };

  await storeService.createProduct(product01, 'SeedScript');
  await storeService.createProduct(product02, 'SeedScript');

  // Record initial media assets into media library
  await storeService.recordMediaUpload({
    filename: 'hero-desktop.jpg',
    originalName: 'hero-desktop.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 632673,
    dimensions: { width: 1920, height: 1080 },
    url: '/images/hero-desktop.jpg',
    thumbnailUrl: '/images/hero-desktop.jpg',
    altText: 'DÉLICE signature perfume bottle atop champagne silk drapery',
    usedIn: ['homepage:hero']
  });

  await storeService.recordMediaUpload({
    filename: 'delice-01.jpg',
    originalName: 'delice-01.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 666205,
    dimensions: { width: 1024, height: 1024 },
    url: '/images/delice-01.jpg',
    thumbnailUrl: '/images/delice-01.jpg',
    altText: 'DÉLICE No. 01 bottle on limestone pedestal',
    usedIn: ['product:delice-no-01']
  });

  await storeService.recordMediaUpload({
    filename: 'delice-02.jpg',
    originalName: 'delice-02.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 783194,
    dimensions: { width: 1024, height: 1024 },
    url: '/images/delice-02.jpg',
    thumbnailUrl: '/images/delice-02.jpg',
    altText: 'DÉLICE No. 02 bottle on travertine with rose petals and amber',
    usedIn: ['product:delice-no-02']
  });

  await storeService.recordMediaUpload({
    filename: 'brand-story.jpg',
    originalName: 'brand-story.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 896498,
    dimensions: { width: 1200, height: 900 },
    url: '/images/brand-story.jpg',
    thumbnailUrl: '/images/brand-story.jpg',
    altText: 'French perfumer atelier desk with tincture bottles and parchment formulas',
    usedIn: ['homepage:brandStory']
  });

  // Ensure default homepage is initialized
  await storeService.getHomepage();

  console.log('[Seed] Initial content seeded successfully. (2 demo products in draft status per specification).');
}

if (require.main === module) {
  seedInitialContent().then(() => process.exit(0)).catch(err => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  });
}

module.exports = seedInitialContent;
