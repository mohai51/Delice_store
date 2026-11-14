/**
 * DÉLICE — Main Application Script
 * Dynamic Hero Slideshow from API, Product Catalog with Auto Discount %, 
 * "Buy Now" & "Add to Bag" Everywhere, Interactive Scent Finder, and Modals.
 */

// Default Fallback Products
const DEFAULT_PRODUCTS = [
  {
    id: 'delice-bloom',
    name: 'DÉLICE BLOOM',
    tagline: 'Parisian Floral Romance • Soft & Graceful',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    description: 'An ode to youthful romance and blooming grace. Tender centifolia rose petals and velvety peonies blend with sparkling fresh bergamot and a delicate white musk base. Soft, sweet, and endlessly romantic.',
    occasions: ['Campus & Everyday', 'Romantic Dates', 'Spring Outings', 'Daytime Events'],
    mood: 'romantic',
    image: '/assets/images/uploads/delice_Bottle-1_1794420148574.png',
    images: [
      '/assets/images/uploads/delice_Bottle-1_1794420148574.png',
      '/assets/images/bloom-box.svg',
      '/assets/images/bloom.svg',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyLight_1794416616204.png'
    ],
    stock: 120,
    badge: 'Opening Offer'
  },
  {
    id: 'delice-momentum',
    name: 'DÉLICE MOMENTUM',
    tagline: 'Executive Distinction • Bold, Fresh & Dynamic',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    description: 'Crafted for the modern gentleman who leads with effortless charisma. Crisp Italian bergamot and neroli meet spicy black pepper, aromatic cardamom, and a commanding smoked cedarwood and vetiver foundation.',
    occasions: ['Executive Workdays', 'Active Motion', 'Outdoor Demands', 'Signatures'],
    mood: 'energetic',
    image: '/assets/images/uploads/delice_Bottle-2_1794420107446.png',
    images: [
      '/assets/images/uploads/delice_Bottle-2_1794420107446.png',
      '/assets/images/momentum-box.svg',
      '/assets/images/momentum.svg',
      '/assets/images/uploads/delice_DLICEinburgundyshadows_1794416567005.png'
    ],
    stock: 100,
    badge: 'Opening Offer'
  },
  {
    id: 'delice-enigma',
    name: 'DÉLICE ENIGMA',
    tagline: 'Midnight Royalty • Seductive, Rich & Mysterious',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    description: 'A mysterious journey into midnight opulence and regal sensuality. Rich noble oud wood is enlivened with spicy saffron, glowing pink peppercorns, and juicy dark plum, melting into deep velvet amber and smoky warmth.',
    occasions: ['Evening Soirées', 'Intimate Dates', 'Formal Nights', 'Special Occasions'],
    mood: 'evening',
    image: '/assets/images/uploads/delice_Bottle-3_1794420022409.png',
    images: [
      '/assets/images/uploads/delice_Bottle-3_1794420022409.png',
      '/assets/images/enigma-box.svg',
      '/assets/images/enigma.svg',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyShadows_1794416637826.png'
    ],
    stock: 90,
    badge: 'Opening Offer'
  }
];

// Rich Product Fragrance Details (Luxury Olfactory & Spec Breakdown)
const PRODUCT_RICH_DETAILS = {
  'delice-bloom': {
    id: 'delice-bloom',
    name: 'DÉLICE BLOOM',
    tagline: 'Parisian Haute Couture Floral Romance',
    volume: '30ml Edition',
    concentration: 'Eau de Parfum (Fine-Mist Vaporisateur)',
    scentFamily: 'Chypre Floral Sweet Romance',
    keyNotes: 'Grasse Centifolia Rose, Tender Peony, Calabrian Bergamot, Dewy Mandarin & Soft White Musk',
    topNotes: 'Calabrian Bergamot, Sweet Mandarin, Crisp Dewdrop Accord',
    heartNotes: 'Grasse Centifolia Rose, Velvet Pink Peony, Apricot Blossom',
    baseNotes: 'Soft White Musk, Gentle Cashmere Woods, Subtle Sweet Amber',
    hookStory: 'If you love delicate Parisian floral romance, this is the DÉLICE version: an enchanting floral bouquet crafted with tender Grasse rose, velvety peony, sparkling Calabrian bergamot, and a soft kiss of white musk, blended to be long-lasting and effortlessly worn from day to night.',
    sprayDetails: {
      title: '30ml Luxury Fine-Mist Spray (Eau de Parfum)',
      description: 'A precision French-style micro-mist atomizer that spreads a soft, floating floral cloud around you. Spray 3–5 times onto the neck, collarbones, and wrists for an airy, elegant scent trail. Formulated with high-grade perfume oils that stay vibrant throughout a warm day in Bangladesh without staining delicate clothing.'
    },
    pocketLuxury: 'Crafted as a sleek 30ml pocket-luxury flacon that fits seamlessly into your handbag, vanity, or travel pouch—ready whenever you want an effortless touch-up.',
    bestFor: 'Feminine romantic wear, campus & everyday outings, daytime dates, morning coffee, and celebratory gatherings.',
    faqs: [
      {
        q: 'Is this an original DÉLICE fragrance?',
        a: 'Yes. DÉLICE Bloom is our own bespoke Eau de Parfum formulation, hand-blended with premium imported perfume oils to capture timeless Parisian floral elegance, radiant character, and long-lasting performance at an accessible price point in Bangladesh.'
      },
      {
        q: 'How long does it last?',
        a: 'It is formulated specifically to endure a normal day in Bangladesh\'s climate. Expect 6 to 8+ hours of noticeable longevity on skin, and 12+ hours of lingering presence on fabrics. The spray projects gently for the first 2–3 hours before settling into an intimate, elegant floral scent bubble.'
      },
      {
        q: 'How should I apply it for the best projection?',
        a: 'Spray 3–5 times directly onto warm pulse points: both sides of the neck, collarbones, and inner wrists. Adding 1–2 light sprays to cotton clothing creates a long-lasting, ethereal scent cloud.'
      },
      {
        q: 'What is the price of DÉLICE Bloom in Bangladesh?',
        a: 'The special launch price is ৳799 (regular ৳850) for the 30ml Eau de Parfum edition. We deliver nationwide across all 64 districts in Bangladesh with safe packaging and prompt dispatch.'
      },
      {
        q: 'How do delivery and payment work?',
        a: 'Delivery takes 1–2 business days inside Dhaka (৳60) and 2–4 business days outside Dhaka (৳120). Payment is made easily and securely via bKash or Nagad Send Money to our official merchant hotline (01731101780).'
      },
      {
        q: 'What if my bottle is damaged during courier transit?',
        a: 'We offer a 100% hassle-free replacement guarantee. If your bottle arrives broken or the sprayer is damaged, simply contact us within 48 hours of delivery with an unboxing photo or video, and we will dispatch a replacement bottle immediately at no extra charge.'
      }
    ]
  },
  'delice-momentum': {
    id: 'delice-momentum',
    name: 'DÉLICE MOMENTUM',
    tagline: 'British Executive Distinction & Dynamic Poise',
    volume: '30ml Edition',
    concentration: 'Eau de Parfum (Fine-Mist Vaporisateur)',
    scentFamily: 'Aromatic Citrus Woody',
    keyNotes: 'Italian Bergamot, Smoked Cardamom, Black Peppercorn, French Lavender, Cedarwood & Haitian Vetiver',
    topNotes: 'Crisp Italian Bergamot, Sun-drenched Neroli, Cracked Black Pepper',
    heartNotes: 'Smoked Green Cardamom, French Lavender, Silver Mountain Sage',
    baseNotes: 'Smoked Atlas Cedarwood, Haitian Vetiver, Oakmoss, Warm Crystal Amber',
    hookStory: 'If you love sharp British executive distinction, this is the DÉLICE version: a crisp aromatic woody fragrance with sparkling Italian bergamot, cracked black pepper, smoked cardamom, and rich cedarwood, blended to project authority, freshness, and poise from morning meetings to evening affairs.',
    sprayDetails: {
      title: '30ml Luxury Fine-Mist Spray (Eau de Parfum)',
      description: 'A robust, high-output micro-mist atomizer engineered to project a sharp, clean, and commanding scent trail. Spray on the neck, collar, and chest for an energetic presence that keeps you fresh and confident all day.'
    },
    pocketLuxury: 'Engineered in a compact 30ml flacon that fits seamlessly into your suit pocket, laptop bag, or gym kit for instant revitalization before an important meeting or dinner.',
    bestFor: 'Dynamic executive wear, corporate boardrooms, active movement, driving, evening dinners, and signature daily confidence.',
    faqs: [
      {
        q: 'Is this an original DÉLICE fragrance?',
        a: 'Yes. DÉLICE Momentum is our own exclusive Eau de Parfum creation, expertly crafted with imported aromatic concentrates to give modern leaders a distinguished, premium scent profile without luxury brand markups.'
      },
      {
        q: 'How long does it last in tropical heat and commute?',
        a: 'Engineered with deep woody base notes and dense aromatic fixatives, DÉLICE Momentum withstands tropical humidity, sweat, and active movement, providing 7 to 9+ hours of performance on skin and over 14+ hours on jackets and shirts.'
      },
      {
        q: 'How should I apply it for maximum projection?',
        a: 'Apply 2 sprays to the sides of the neck, 1 to each wrist, and 1 across the chest or shirt collar. The crisp citrus and spice open with immediate impact, drying down into an authoritative cedarwood-vetiver trail.'
      },
      {
        q: 'What is the price of DÉLICE Momentum in Bangladesh?',
        a: 'The special launch price is ৳799 (regular ৳850) for the 30ml Eau de Parfum edition. We deliver nationwide across all 64 districts in Bangladesh with safe protective packaging.'
      },
      {
        q: 'How do delivery and payment work?',
        a: 'Delivery takes 1–2 business days inside Dhaka (৳60) and 2–4 business days outside Dhaka (৳120). Payment is made conveniently via bKash or Nagad Send Money to our official merchant hotline (01731101780).'
      },
      {
        q: 'What is your replacement policy if transit damage occurs?',
        a: 'All orders are securely packaged with heavy cushioning. In the rare event of transit damage or a defective atomizer, report it within 48 hours with unboxing photos for an instant, free replacement bottle.'
      }
    ]
  },
  'delice-enigma': {
    id: 'delice-enigma',
    name: 'DÉLICE ENIGMA',
    tagline: 'Midnight Royalty & Hypnotic Velvet Oud',
    volume: '30ml Edition',
    concentration: 'Eau de Parfum (Fine-Mist Vaporisateur)',
    scentFamily: 'Royal Oriental Woody',
    keyNotes: 'Noble Midnight Oud Wood, Royal Saffron, Dark Velvety Plum, Pink Peppercorn & Golden Amber Resin',
    topNotes: 'Sparkling Royal Saffron, Fiery Pink Peppercorn, Bitter Orange Zest',
    heartNotes: 'Dark Velvety Plum, Midnight Rose Petals, Exotic Spices',
    baseNotes: 'Noble Midnight Oud Wood, Golden Amber Resin, Smoky Vanilla Bean, Rich Patchouli',
    hookStory: 'If you love hypnotic midnight royalty, rare orientals, and seductive mystery, this is the DÉLICE version: an opulent oriental woody perfume with noble midnight oud wood, royal saffron, fiery pink pepper, and velvety dark plum, blended to leave a deep, intoxicating, and unforgettable trail.',
    sprayDetails: {
      title: '30ml Luxury Fine-Mist Spray (Eau de Parfum)',
      description: 'A precision vaporisateur designed to disperse rich oriental resins and oud molecules evenly without staining delicate fabrics. Spray onto warm pulse points for a hypnotic, velvet aura that commands admiration.'
    },
    pocketLuxury: 'A sleek 30ml flacon built with dark luxury aesthetics, convenient to carry in your evening clutch or pocket for an instant touch-up before grand gatherings.',
    bestFor: 'Intimate evening dates, VIP events, weddings, winter evenings, romantic nights, and seductive signature occasions.',
    faqs: [
      {
        q: 'Is this an original DÉLICE fragrance?',
        a: 'Yes. DÉLICE Enigma is our proprietary Eau de Parfum formulation, carefully balanced with exquisite oriental midnight oud notes and glowing saffron to offer true niche-level luxury at an honest price.'
      },
      {
        q: 'How long does it last?',
        a: 'Due to its rich concentration of heavy woods, resins, and amber, DÉLICE Enigma offers exceptional staying power: 10 to 12+ hours on skin and multiple days on fabrics like coats, blazers, and scarves. Its sillage is magnetic and memorable.'
      },
      {
        q: 'Is the oud note overwhelming or harsh?',
        a: 'Not at all. Unlike heavy traditional ouds, DÉLICE Enigma is modern, smooth, and refined. The noble oud is softened by dark juicy plum and glowing pink pepper, making it velvety, seductive, and wearable for men and women alike.'
      },
      {
        q: 'What is the price of DÉLICE Enigma in Bangladesh?',
        a: 'The special launch price is ৳799 (regular ৳850) for the 30ml Eau de Parfum edition. We deliver nationwide across all 64 districts in Bangladesh.'
      },
      {
        q: 'How do delivery and payment work?',
        a: 'Delivery takes 1–2 business days inside Dhaka (৳60) and 2–4 business days outside Dhaka (৳120). Payment is made via bKash or Nagad Send Money to our official merchant hotline (01731101780).'
      },
      {
        q: 'What is your replacement policy for broken items?',
        a: 'Every bottle is shipped in our rigid protective packaging. If your shipment arrives damaged, notify us within 48 hours of delivery with photos or video, and we will send a free replacement bottle immediately.'
      }
    ]
  }
};
window.PRODUCT_RICH_DETAILS = PRODUCT_RICH_DETAILS;

let globalProducts = DEFAULT_PRODUCTS;

document.addEventListener('DOMContentLoaded', () => {
  loadHeroSlides();
  loadProducts();
  initMoodFinder();
  initMobileNav();
  initModals();
});

/* ==========================================================================
   DYNAMIC HERO SLIDER (Connected to Admin & API)
   ========================================================================== */
async function loadHeroSlides() {
  const sliderContainer = document.getElementById('heroSliderContainer');
  if (!sliderContainer) return;

  let slidesData = [];
  try {
    const res = await fetch('/api/slides');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        slidesData = data;
      }
    }
  } catch (err) {
    console.warn('Using default hero slides:', err.message);
  }

  if (slidesData.length === 0) {
    // Keep static fallback
    initHeroSlider();
    return;
  }

  // Render slides dynamically from API
  sliderContainer.innerHTML = `
    ${slidesData.map((s, idx) => {
      const targetProdId = s.productId || 'delice-bloom';
      const bannerImg = s.image || `/assets/images/hero-slide-${(idx % 3) + 1}.svg`;
      const linkUrl = targetProdId ? `/checkout.html?buyNow=${targetProdId}` : '#collection';

      return `
        <div class="hero-slide ${idx === 0 ? 'active' : ''}" data-slide="${idx}">
          <a href="${linkUrl}" class="hero-banner-link" aria-label="${s.title || 'DÉLICE Fragrance'}">
            <img src="${bannerImg}" alt="${s.title || 'DÉLICE Fragrance'} • ৳${s.offerPrice || 799}" class="hero-banner-img">
          </a>
        </div>
      `;
    }).join('')}

    <button type="button" class="slider-control-btn slider-control-prev" aria-label="Previous Slide">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <button type="button" class="slider-control-btn slider-control-next" aria-label="Next Slide">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>

    <div class="slider-dots">
      ${slidesData.map((_, i) => `<button type="button" class="slider-dot ${i === 0 ? 'active' : ''}" aria-label="Go to slide ${i+1}"></button>`).join('')}
    </div>
  `;

  initHeroSlider();
}

function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.slider-dot');
  const prevBtn = document.querySelector('.slider-control-prev');
  const nextBtn = document.querySelector('.slider-control-next');

  if (!slides.length) return;

  let currentSlide = 0;
  let slideInterval = null;

  function showSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    currentSlide = index;
  }

  function startAutoSlide() {
    stopAutoSlide();
    slideInterval = setInterval(() => {
      showSlide(currentSlide + 1);
    }, 6000);
  }

  function stopAutoSlide() {
    if (slideInterval) clearInterval(slideInterval);
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      showSlide(currentSlide - 1);
      startAutoSlide();
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      showSlide(currentSlide + 1);
      startAutoSlide();
    };
  }

  dots.forEach((dot, index) => {
    dot.onclick = () => {
      showSlide(index);
      startAutoSlide();
    };
  });

  const sliderContainer = document.getElementById('heroSliderContainer');
  if (sliderContainer) {
    sliderContainer.onmouseenter = stopAutoSlide;
    sliderContainer.onmouseleave = startAutoSlide;

    let touchStartX = 0;
    sliderContainer.ontouchstart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };
    sliderContainer.ontouchend = (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) showSlide(currentSlide + 1);
      else if (touchEndX - touchStartX > 50) showSlide(currentSlide - 1);
    };
  }

  startAutoSlide();
}

/* ==========================================================================
   PRODUCT CATALOG (Auto Discount % & Both Buy Now + Add to Bag)
   ========================================================================== */
async function loadProducts() {
  const gridContainer = document.getElementById('productGrid');
  if (!gridContainer) return;

  try {
    const response = await fetch('/api/products?t=' + Date.now());
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        globalProducts = data;
      }
    }
  } catch (err) {
    console.log('Using default client products catalog:', err.message);
  }

  renderProductGrid(globalProducts);
  renderMoodFinderProduct();
  if (typeof DeliceCart !== 'undefined' && typeof DeliceCart.syncWithProducts === 'function') {
    DeliceCart.syncWithProducts(globalProducts);
  }
}

window.cardImageIndices = window.cardImageIndices || {};
window.productImagesMap = window.productImagesMap || {};

function renderProductGrid(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = products.map(prod => {
    const orig = Number(prod.originalPrice) || 850;
    const price = Number(prod.price) || 799;
    const savings = orig - price;
    const discountPercent = orig > price ? Math.round(((orig - price) / orig) * 100) : 0;

    // Up to 4 product pictures
    const imgs = (prod.images && prod.images.length > 0)
      ? prod.images
      : [prod.image].filter(Boolean);

    // Save image list to global lookup map for instant switching
    window.productImagesMap[prod.id] = imgs;
    if (window.cardImageIndices[prod.id] === undefined) {
      window.cardImageIndices[prod.id] = 0;
    }
    const currentIdx = window.cardImageIndices[prod.id] || 0;
    const activeImg = imgs[currentIdx] || imgs[0] || prod.image;

    return `
      <article class="product-card clickable-card" id="card-${prod.id}" onclick="navigateToProduct('${prod.id}', event)" tabindex="0" role="link" aria-label="View ${prod.name} details">
        <div class="product-media" data-prod-id="${prod.id}">
          <div class="product-badges" style="z-index:20;">
            ${discountPercent > 0 ? `<span class="badge-offer" style="background:#FF665C;">${discountPercent}% OFF</span>` : `<span class="badge-offer">${prod.badge || 'Offer'}</span>`}
            <span class="badge-volume">${prod.volume || '30ml'}</span>
          </div>

          <!-- Left Arrow Button -->
          <button type="button" class="prod-slider-arrow prod-slider-prev" 
            aria-label="Previous Image" 
            title="Previous Angle"
            onclick="slideCardImage('${prod.id}', -1, event)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <!-- Main Image -->
          <div class="product-media-click-area" title="Click to view ${prod.name} details">
            <img src="${activeImg}" id="card-img-${prod.id}" class="product-main-img" alt="${prod.name} 30ml Bottle" loading="lazy">
          </div>

          <!-- Right Arrow Button -->
          <button type="button" class="prod-slider-arrow prod-slider-next" 
            aria-label="Next Image" 
            title="Next Angle"
            onclick="slideCardImage('${prod.id}', 1, event)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          
          <!-- 4-Image Thumbnail Gallery Bar -->
          <div class="product-thumbs-bar" id="thumbs-bar-${prod.id}">
            ${imgs.slice(0, 4).map((img, i) => `
              <button type="button" class="prod-card-thumb ${i === currentIdx ? 'active' : ''}" 
                data-index="${i}"
                title="View photo ${i + 1}"
                onmouseenter="setCardImageIndex('${prod.id}', ${i}, event)"
                onclick="setCardImageIndex('${prod.id}', ${i}, event)">
                <img src="${img}" alt="${prod.name} thumbnail ${i + 1}">
              </button>
            `).join('')}
          </div>
        </div>

        <div class="product-body">
          <!-- 1. Name & 30ml Badge -->
          <div class="product-header-row">
            <h3 class="product-title">${prod.name}</h3>
            <span class="badge-volume-pill">${prod.volume || '30ml'}</span>
          </div>

          <!-- 2. Price right after Name -->
          <div class="product-pricing">
            <span class="price-current">৳${price}</span>
            <span class="price-original">৳${orig}</span>
            ${discountPercent > 0 ? `<span class="price-savings">${discountPercent}% OFF</span>` : ''}
          </div>

          <!-- 3. Direct Action Buttons (Buy Now & Add to Cart) -->
          <div class="product-card-actions">
            <a href="/checkout.html?buyNow=${prod.id}" class="btn btn-buy-now" onclick="event.stopPropagation()" title="Buy ${prod.name} Now">
              Buy Now
            </a>
            <button type="button" class="btn btn-add-cart" onclick="event.stopPropagation(); addProductToBag('${prod.id}')" title="Add ${prod.name} to Cart">
              Add to Cart
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  attachCardSliderListeners();
}

function navigateToProduct(prodId, event) {
  // If recent touch swipe on gallery, ignore click
  if (window.lastCardSwipeTime && (Date.now() - window.lastCardSwipeTime < 350)) {
    return;
  }
  // Ignore clicks that originated from child buttons/links/slider controls
  if (event && event.target && event.target.closest('button, a, .prod-slider-arrow, .prod-card-thumb')) {
    return;
  }
  window.location.href = `/product.html?id=${encodeURIComponent(prodId)}`;
}
window.navigateToProduct = navigateToProduct;

function attachCardSliderListeners() {
  document.querySelectorAll('.product-card').forEach(card => {
    const prodId = card.id ? card.id.replace('card-', '') : null;
    if (!prodId) return;

    // Keyboard accessibility for whole clickable card
    card.onkeydown = (e) => {
      if (e.key === 'Enter') {
        if (e.target === card) {
          e.preventDefault();
          navigateToProduct(prodId, e);
        }
      }
    };

    const prevBtn = card.querySelector('.prod-slider-prev');
    if (prevBtn) {
      prevBtn.onclick = (e) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        slideCardImage(prodId, -1, e);
      };
    }

    const nextBtn = card.querySelector('.prod-slider-next');
    if (nextBtn) {
      nextBtn.onclick = (e) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        slideCardImage(prodId, 1, e);
      };
    }

    // Touch swipe support for product card image gallery on mobile
    const mediaEl = card.querySelector('.product-media');
    if (mediaEl) {
      let tStartX = 0;
      let tStartY = 0;
      mediaEl.addEventListener('touchstart', (e) => {
        tStartX = e.changedTouches[0].clientX;
        tStartY = e.changedTouches[0].clientY;
      }, { passive: true });
      mediaEl.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].clientX - tStartX;
        const diffY = e.changedTouches[0].clientY - tStartY;
        if (Math.abs(diffX) > 36 && Math.abs(diffX) > Math.abs(diffY)) {
          window.lastCardSwipeTime = Date.now();
          slideCardImage(prodId, diffX < 0 ? 1 : -1, e);
        }
      }, { passive: true });
    }

    const thumbs = card.querySelectorAll('.prod-card-thumb');
    thumbs.forEach((thumb, idx) => {
      thumb.onclick = (e) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        setCardImageIndex(prodId, idx, e);
      };
      thumb.onmouseenter = (e) => {
        setCardImageIndex(prodId, idx, e);
      };
    });
  });
}

window.cardImageIndices = window.cardImageIndices || {};

function setCardImageIndex(prodId, index, event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
    if (typeof event.preventDefault === 'function' && event.cancelable) event.preventDefault();
  }

  let imgs = window.productImagesMap[prodId];
  if (!imgs || !imgs.length) {
    const list = (typeof globalProducts !== 'undefined' && Array.isArray(globalProducts) && globalProducts.length)
      ? globalProducts
      : (typeof DEFAULT_PRODUCTS !== 'undefined' ? DEFAULT_PRODUCTS : []);

    const product = list.find(p => String(p.id).toLowerCase() === String(prodId).toLowerCase() || String(p._id) === String(prodId));
    imgs = (product && product.images && product.images.length > 0)
      ? product.images
      : (product ? [product.image] : []);
    if (imgs.length) window.productImagesMap[prodId] = imgs;
  }
  if (!imgs || !imgs.length) return;

  const validIndex = ((index % imgs.length) + imgs.length) % imgs.length;
  window.cardImageIndices[prodId] = validIndex;

  const cardImg = document.getElementById(`card-img-${prodId}`);
  if (cardImg) {
    if (cardImg.style) cardImg.style.opacity = '0.35';
    cardImg.src = imgs[validIndex];
    if (cardImg.dataset) cardImg.dataset.index = validIndex;
    if (cardImg.style) {
      setTimeout(() => {
        cardImg.style.opacity = '1';
      }, 120);
    }
  }

  const thumbsBar = document.getElementById(`thumbs-bar-${prodId}`);
  if (thumbsBar) {
    const thumbs = thumbsBar.querySelectorAll('.prod-card-thumb');
    thumbs.forEach((t, i) => {
      if (i === validIndex) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
  }
}
window.setCardImageIndex = setCardImageIndex;

function slideCardImage(prodId, direction, event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
    if (typeof event.preventDefault === 'function' && event.cancelable) event.preventDefault();
  }
  const currentIndex = window.cardImageIndices[prodId] !== undefined ? window.cardImageIndices[prodId] : 0;
  setCardImageIndex(prodId, currentIndex + direction, event);
}
window.slideCardImage = slideCardImage;

function changeCardImage(prodId, imgSrc, btnEl, event) {
  if (event) event.stopPropagation();
  if (btnEl && btnEl.dataset && btnEl.dataset.index !== undefined) {
    setCardImageIndex(prodId, parseInt(btnEl.dataset.index, 10), event);
  } else {
    const cardImg = document.getElementById(`card-img-${prodId}`);
    if (cardImg) cardImg.src = imgSrc;
  }
}
window.changeCardImage = changeCardImage;

function addProductToBag(productId) {
  const product = globalProducts.find(p => p.id === productId);
  if (product) {
    DeliceCart.addItem(product, 1);
  }
}

function viewProductDetails(productId) {
  const normId = String(productId).toLowerCase().replace(/_/g, '-');
  const product = (globalProducts && globalProducts.find(p => p.id === normId)) ||
                  DEFAULT_PRODUCTS.find(p => p.id === normId) ||
                  DEFAULT_PRODUCTS[0];
  const rich = PRODUCT_RICH_DETAILS[normId] || PRODUCT_RICH_DETAILS['delice-bloom'];

  const modal = document.getElementById('productModal');
  const modalContent = document.getElementById('productModalContent');
  if (!modal || !modalContent) {
    window.location.href = `/product.html?id=${normId}`;
    return;
  }

  const orig = Number(product.originalPrice) || 850;
  const price = Number(product.price) || 799;
  const savings = orig - price;
  const discountPercent = orig > price ? Math.round(((orig - price) / orig) * 100) : 0;

  // Matching box image
  let boxImg = '/assets/images/bloom-box.svg';
  if (normId.includes('momentum')) boxImg = '/assets/images/momentum-box.svg';
  if (normId.includes('enigma')) boxImg = '/assets/images/enigma-box.svg';

  // Up to 4 product pictures
  const imgs = (product.images && product.images.length > 0)
    ? product.images
    : [product.image, boxImg, '/assets/images/hero-slide-1.svg', '/assets/images/brand-story.svg'].filter(Boolean);

  window.modalCurrentImgs = imgs.slice(0, 4);
  window.modalCurrentIndex = 0;

  modalContent.innerHTML = `
    <div class="product-detail-grid quick-modal-grid">
      <!-- Left Column: Gallery & Standalone Link -->
      <div>
        <div class="detail-gallery" id="quickModalGalleryFrame" style="background:#FAF6F0; border-radius:8px; padding:1.75rem; display:flex; align-items:center; justify-content:center; min-height:320px; position:relative;">
          <!-- Left Arrow Button -->
          <button type="button" class="modal-gallery-arrow modal-gallery-prev" 
            aria-label="Previous Image" 
            title="Previous Angle"
            onclick="slideModalImage(-1, event)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <img src="${imgs[0] || product.image}" id="quickModalMainImg" alt="${rich.name}" style="max-height:290px; width:auto; margin:0 auto; object-fit:contain; transition:opacity 0.18s ease;">

          <!-- Right Arrow Button -->
          <button type="button" class="modal-gallery-arrow modal-gallery-next" 
            aria-label="Next Image" 
            title="Next Angle"
            onclick="slideModalImage(1, event)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        
        <!-- 4 Image Selector for Quick View Modal with Visual Thumbnails -->
        <div id="quickModalThumbs" style="display:flex; justify-content:center; gap:0.6rem; margin-top:0.85rem; flex-wrap:wrap;">
          ${imgs.slice(0, 4).map((img, i) => `
            <button type="button" class="quick-modal-thumb-btn ${i === 0 ? 'active' : ''}" data-index="${i}" style="width:52px; height:52px; padding:2px; border:2px solid ${i === 0 ? '#4A102A' : '#E0D4C3'}; border-radius:6px; background:#FFF; cursor:pointer; overflow:hidden;" 
              onclick="setModalImageIndex(${i})">
              <img src="${img}" alt="Angle ${i + 1}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">
            </button>
          `).join('')}
        </div>
        <p style="text-align:center; font-size:0.75rem; color:#87828A; margin-top:0.5rem;">Explore all 4 angles: Bottle Flacon, Unboxing Box, Campaign &amp; Editorial</p>

        <!-- Direct Link to Dedicated Product Page -->
        <div style="text-align:center; margin-top:1.25rem;">
          <a href="/product.html?id=${normId}" style="display:inline-flex; align-items:center; gap:0.4rem; font-size:0.82rem; font-weight:700; color:#4A102A; text-decoration:underline;">
            Open Dedicated Product Page &rarr;
          </a>
        </div>
      </div>

      <!-- Right Column: Rich Details Breakdown -->
      <div>
        <div class="detail-meta-header" style="margin-bottom:1rem; padding-bottom:1rem;">
          <span class="tagline-sub" style="font-size:0.75rem; color:#C5A46D; font-weight:700; letter-spacing:0.12em;">${rich.tagline}</span>
          <h2 class="detail-title" style="margin:0.25rem 0 0.5rem; font-size:1.75rem;">${rich.name}</h2>
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <span style="font-size:0.82rem; color:#4A102A; font-weight:700; background:#FAF6F0; padding:0.2rem 0.6rem; border-radius:4px; border:1px solid #EBE3D5;">${rich.concentration}</span>
            <span style="font-size:0.82rem; color:#59555B; font-weight:600;">30ml Pocket Luxury Edition</span>
          </div>
          <div class="detail-pricing" style="margin-top:0.75rem; display:flex; align-items:baseline; gap:0.75rem;">
            <span class="price-current" style="font-size:1.6rem; font-weight:700; color:#4A102A;">৳${price}</span>
            <span class="price-original" style="font-size:1.05rem; text-decoration:line-through; color:#87828A;">৳${orig}</span>
            <span class="badge-offer" style="background:#FF665C; color:#FFF; font-size:0.72rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:700;">
              SAVE ৳${savings} (${discountPercent}% OFF)
            </span>
          </div>
        </div>

        <!-- 1. Opening Hook Story -->
        <div class="rich-detail-hook">
          ${rich.hookStory}
        </div>

        <!-- 2. Fragrance Notes Box & Olfactory Pyramid -->
        <div class="notes-breakdown-card">
          <div class="rich-section-title">
            <span>Fragrance Notes</span>
            <span class="scent-family-pill">${rich.scentFamily}</span>
          </div>
          <p style="font-size:0.88rem; color:#181619; margin:0 0 0.75rem; line-height:1.5;">
            <strong>Key Notes:</strong> ${rich.keyNotes}
          </p>
          <table class="notes-pyramid-table">
            <tbody>
              <tr>
                <td class="note-tier-label">Top Notes</td>
                <td class="note-tier-values">${rich.topNotes}</td>
              </tr>
              <tr>
                <td class="note-tier-label">Heart Notes</td>
                <td class="note-tier-values">${rich.heartNotes}</td>
              </tr>
              <tr>
                <td class="note-tier-label">Base Notes</td>
                <td class="note-tier-values">${rich.baseNotes}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 3. Spray or Bottle Specification -->
        <div class="spray-spec-box">
          <div class="rich-section-title" style="font-size:0.88rem; margin-bottom:0.35rem;">
            <span>Atomizer &amp; Format: ${rich.sprayDetails.title}</span>
          </div>
          <p style="font-size:0.86rem; color:#59555B; margin:0 0 0.5rem; line-height:1.6;">
            ${rich.sprayDetails.description}
          </p>
          <p style="font-size:0.82rem; color:#87828A; margin:0; line-height:1.5;">
            <strong>Pocket Portability:</strong> ${rich.pocketLuxury}
          </p>
        </div>

        <!-- 4. Best For & Occasions -->
        <div style="margin-bottom:1.25rem;">
          <div class="rich-section-title" style="font-size:0.88rem; margin-bottom:0.4rem;">
            <span>Best For &amp; Recommended Wear</span>
          </div>
          <p style="font-size:0.88rem; color:#181619; margin:0 0 0.5rem;">${rich.bestFor}</p>
          <div class="product-tags">
            ${(product.occasions || []).map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
          </div>
        </div>

        <!-- Reassurance & Delivery Box -->
        <div style="background:#FAF6F0; border:1px solid #E0D4C3; border-radius:8px; padding:0.9rem 1.15rem; margin-bottom:1.25rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A102A" stroke-width="2">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            <strong style="font-size:0.86rem; color:#4A102A;">Nationwide Delivery in Bangladesh:</strong>
          </div>
          <p style="font-size:0.82rem; color:#59555B; margin:0;">
            Inside Dhaka: 1–2 business days (৳60) &bull; Outside Dhaka: 2–4 business days (৳120). Official bKash/Nagad Send Money verified.
          </p>
        </div>

        <!-- Action Buttons -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.5rem;">
          <button type="button" class="btn btn-primary" onclick="addProductToBag('${normId}'); closeModal('productModal');" style="text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">
            Add to Cart
          </button>
          <a href="/checkout.html?buyNow=${normId}" class="btn btn-gold" style="text-transform:uppercase; letter-spacing:0.1em; font-weight:700; text-align:center;">
            Buy Now
          </a>
        </div>

        <!-- 5. Frequently Asked Questions (Accordion) -->
        <div style="margin-top:1.5rem;">
          <h4 style="font-size:0.95rem; text-transform:uppercase; letter-spacing:0.1em; color:#4A102A; margin-bottom:0.5rem; font-weight:700;">
            Frequently Asked Questions
          </h4>
          <div class="delice-faq-accordion">
            ${rich.faqs.map(faq => `
              <details class="delice-faq-item">
                <summary>${faq.q}</summary>
                <div class="faq-ans">${faq.a}</div>
              </details>
            `).join('')}
          </div>
        </div>

      </div>
    </div>
  `;

  openModal('productModal');
}
window.viewProductDetails = viewProductDetails;
window.addProductToBag = addProductToBag;

window.modalCurrentImgs = [];
window.modalCurrentIndex = 0;

function setModalImageIndex(index) {
  const imgs = window.modalCurrentImgs;
  if (!imgs || !imgs.length) return;
  if (index < 0) index = imgs.length - 1;
  if (index >= imgs.length) index = 0;
  window.modalCurrentIndex = index;

  const mainImg = document.getElementById('quickModalMainImg');
  if (mainImg) {
    mainImg.src = imgs[index];
  }

  const thumbBtns = document.querySelectorAll('#quickModalThumbs .quick-modal-thumb-btn');
  thumbBtns.forEach((btn, i) => {
    if (i === index) {
      btn.style.borderColor = '#4A102A';
      btn.classList.add('active');
    } else {
      btn.style.borderColor = '#E0D4C3';
      btn.classList.remove('active');
    }
  });
}
window.setModalImageIndex = setModalImageIndex;

function slideModalImage(direction, event) {
  if (event) event.stopPropagation();
  setModalImageIndex(window.modalCurrentIndex + direction);
}
window.slideModalImage = slideModalImage;

// Touch Swipe & Keyboard Navigation for Product Image Sliders
document.addEventListener('touchstart', (e) => {
  const media = e.target.closest('.product-media') || e.target.closest('#productModal .detail-gallery');
  if (!media) return;
  media._touchStartX = e.changedTouches[0].screenX;
  media._touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const media = e.target.closest('.product-media') || e.target.closest('#productModal .detail-gallery');
  if (!media || media._touchStartX === undefined) return;
  const touchEndX = e.changedTouches[0].screenX;
  const touchEndY = e.changedTouches[0].screenY;
  const diffX = touchEndX - media._touchStartX;
  const diffY = touchEndY - media._touchStartY;
  if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
    if (media.classList.contains('product-media')) {
      const prodId = media.dataset.prodId;
      if (prodId) slideCardImage(prodId, diffX < 0 ? 1 : -1, e);
    } else {
      slideModalImage(diffX < 0 ? 1 : -1, e);
    }
  }
}, { passive: true });

// Keyboard arrow key navigation when modal is open
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('productModal');
  if (modal && modal.classList.contains('active')) {
    if (e.key === 'ArrowLeft') {
      slideModalImage(-1, e);
    } else if (e.key === 'ArrowRight') {
      slideModalImage(1, e);
    }
  }
});

/* ==========================================================================
   INTERACTIVE MOOD FINDER (Both Buy Now & Add To Cart - No Emojis)
   ========================================================================== */
window.moodImageIndex = 0;

const MOOD_ATMOSPHERE_CONFIG = {
  'romantic': {
    badge: 'Parisian Floral Romance',
    image: '/assets/images/scent-guide-bloom-model.jpg',
    fallback: '/assets/images/scent-guide-bloom.jpg',
    alt: 'DÉLICE BLOOM — Parisian Haute Couture Floral Romance',
    tagline: 'HAUTE PARFUMERIE &bull; SOFT, SWEET &amp; ROMANTIC',
    accords: 'Tender Peony &bull; Grasse Rose &bull; Calabrian Bergamot &bull; White Musk',
    story: 'An exquisite ode to youthful romance and timeless Parisian grace. Tender Centifolia rose petals and velvety peonies bloom effortlessly over a sparkling kiss of fresh bergamot, wrapped in a soft, sensual veil of white musk. Sweet, delightfully delicate, and breathtakingly feminine.'
  },
  'energetic': {
    badge: 'Executive Distinction',
    image: '/assets/images/scent-guide-momentum-model.jpg',
    fallback: '/assets/images/scent-guide-momentum.jpg',
    alt: 'DÉLICE MOMENTUM — Executive Distinction & Charismatic Motion',
    tagline: 'BRITISH LUXURY HERITAGE &bull; BOLD &amp; CONFIDENT',
    accords: 'Italian Bergamot &bull; Neroli &bull; Cracked Black Pepper &bull; Smoked Cedarwood',
    story: 'Crafted for the modern gentleman who moves with effortless executive poise and magnetic presence. Crisp Italian bergamot and neroli meet the spicy warmth of cracked black pepper and cardamom, grounded in an authoritative foundation of smoked cedarwood and earthy vetiver. Bold, fresh, and remarkably resilient.'
  },
  'evening': {
    badge: 'Midnight Royalty',
    image: '/assets/images/scent-guide-enigma-model.jpg',
    fallback: '/assets/images/scent-guide-enigma.jpg',
    alt: 'DÉLICE ENIGMA — Midnight Velvet Royalty & Seductive Oud',
    tagline: 'ROYAL ORIENTAL OPULENCE &bull; SOPHISTICATED &amp; INTIMATE',
    accords: 'Noble Midnight Oud &bull; Royal Saffron &bull; Dark Plum &bull; Golden Amber',
    story: 'A hypnotic journey into midnight opulence and regal sensuality. Noble midnight oud wood is ignited with sparkling saffron, fiery pink peppercorns, and juicy dark plum, melting seamlessly into deep velvet amber and warm smoky woods. Seductive, mysterious, and unforgettable.'
  }
};

window.selectMood = function(mood, clickedBtn) {
  const buttons = document.querySelectorAll('.mood-pill-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mood') === mood);
  });
  renderMoodFinderProduct();
};

function renderMoodFinderProduct() {
  const activeBtn = document.querySelector('.mood-pill-btn.active');
  const mood = activeBtn ? activeBtn.getAttribute('data-mood') : 'romantic';
  const matchResult = document.getElementById('moodMatchResult');
  if (!matchResult) return;

  let matched = globalProducts.find(p => p.mood === mood) || globalProducts[0];
  const moodCfg = MOOD_ATMOSPHERE_CONFIG[mood] || MOOD_ATMOSPHERE_CONFIG['romantic'];

  matchResult.innerHTML = `
    <div class="mood-match-card">
      <div class="mood-match-media" onclick="viewProductDetails('${matched.id}')" style="cursor:pointer;" title="Click to view ${matched.name} details">
        <span class="mood-match-badge">${moodCfg.badge}</span>
        <img src="${moodCfg.image}" id="moodMatchMainImg" alt="${moodCfg.alt}" onerror="this.onerror=null; this.src='${moodCfg.fallback}';">
      </div>
      <div class="mood-match-info">
        <span class="tagline-sub" style="font-size:0.75rem; color:#C5A46D; font-weight:700; letter-spacing:0.12em;">${moodCfg.tagline}</span>
        <h3 style="font-size:1.65rem; margin:0.25rem 0 0.35rem; color:#181619; letter-spacing:0.02em;">${matched.name}</h3>
        <div style="font-size:0.82rem; font-weight:600; color:#4A102A; margin-bottom:0.75rem;">
          ${moodCfg.accords}
        </div>
        <p style="color:#59555B; margin-bottom:1.15rem; font-size:0.92rem; line-height:1.65;">
          ${moodCfg.story}
        </p>
        <div class="product-tags" style="margin-bottom:1.25rem;">
          ${(matched.occasions || []).map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
        </div>
        <div class="mood-match-actions">
          <span class="price-display" style="font-family:var(--font-heading); font-size:1.5rem; font-weight:700; color:#4A102A;">৳${matched.price}</span>
          <button type="button" class="btn btn-primary" onclick="addProductToBag('${matched.id}')" style="text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">Add to Cart</button>
          <a href="/checkout.html?buyNow=${matched.id}" class="btn btn-gold" style="text-transform:uppercase; letter-spacing:0.1em; font-weight:700; text-align:center;">Buy Now</a>
          <a href="/product.html?id=${matched.id}" class="btn btn-secondary" style="text-transform:uppercase; letter-spacing:0.08em; font-weight:600; text-align:center;">Details</a>
        </div>
      </div>
    </div>
  `;
}

function initMoodFinder() {
  const buttons = document.querySelectorAll('.mood-pill-btn');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.onclick = (e) => {
      if (e) e.preventDefault();
      const mood = btn.getAttribute('data-mood');
      window.selectMood(mood, btn);
    };
  });

  renderMoodFinderProduct();
}

/* ==========================================================================
   MOBILE NAVIGATION
   ========================================================================== */
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('open');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });

    // Close mobile menu when tapping anywhere outside
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('open') && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('open');
      }
    });

    // Close mobile menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) {
        navMenu.classList.remove('open');
      }
    });
  }
}

/* ==========================================================================
   MODALS
   ========================================================================== */
function initModals() {
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = btn.getAttribute('data-modal-open');
      openModal(modalId);
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = btn.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}
window.openModal = openModal;
window.closeModal = closeModal;

/* ==========================================================================
   STORY SECTION PHOTO SWITCHER (d1 and d2 authentic founders & lab images)
   ========================================================================== */
window.storyPhotos = [
  {
    src: '/assets/images/d1.jpg',
    badge: 'Crafting The Essence',
    caption: 'Sayod Sulayman Sukria, Mohaiminul Islam, Abdullah Basar Tarif & Zayed Iqbal Munna during formulation trials.'
  },
  {
    src: '/assets/images/d2.jpg',
    badge: 'The Founders • 4 Friends',
    caption: 'Four friends united by one relentless mission: authentic luxury fragrances crafted for Bangladesh.'
  }
];
window.storyCurrentPhotoIndex = 0;

function switchStoryPhoto(index) {
  const photos = window.storyPhotos;
  if (!photos || !photos.length) return;
  const idx = ((index % photos.length) + photos.length) % photos.length;
  window.storyCurrentPhotoIndex = idx;

  const mainImg = document.getElementById('storyMainPhoto');
  const badgeEl = document.getElementById('storyPhotoBadge');
  const thumbs = [document.getElementById('storyThumb0'), document.getElementById('storyThumb1')];

  if (mainImg) {
    mainImg.style.opacity = '0.3';
    setTimeout(() => {
      mainImg.src = photos[idx].src;
      mainImg.style.objectPosition = idx === 1 ? 'center top' : 'center center';
      mainImg.style.opacity = '1';
    }, 110);
  }
  if (badgeEl) badgeEl.textContent = photos[idx].badge;

  thumbs.forEach((t, i) => {
    if (t) t.classList.toggle('active', i === idx);
  });
}
window.switchStoryPhoto = switchStoryPhoto;

// Touch swipe listener on story frame
document.addEventListener('DOMContentLoaded', () => {
  const frame = document.getElementById('storyMediaFrame');
  if (!frame) return;
  let startX = 0;
  frame.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].clientX;
  }, { passive: true });
  frame.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 35) {
      switchStoryPhoto(window.storyCurrentPhotoIndex + (diff < 0 ? 1 : -1));
    }
  }, { passive: true });
});

