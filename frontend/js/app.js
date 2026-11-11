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
    tagline: 'Sweet, Soft & Romantic',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    description: 'A sweet, soft fragrance for everyday use and formal occasions.',
    occasions: ['Everyday use', 'University', 'Formal occasions', 'Daytime outings'],
    mood: 'romantic',
    image: '/assets/images/uploads/delice_Bottle-1_1794420148574.png',
    images: [
      '/assets/images/uploads/delice_Bottle-1_1794420148574.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyLight_1794416616204.png',
      '/assets/images/uploads/delice_DLICEinburgundyshadows_1794416567005.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyShadows_1794416637826.png'
    ],
    stock: 120,
    badge: 'Opening Offer'
  },
  {
    id: 'delice-momentum',
    name: 'DÉLICE MOMENTUM',
    tagline: 'Bold, Fresh & Resilient',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    description: 'A bold, strong fragrance for busy days, outdoor activities, demanding workdays, and situations involving heat, traffic, and movement.',
    occasions: ['Busy schedules', 'Outdoor activities', 'Workdays', 'Active lifestyles'],
    mood: 'energetic',
    image: '/assets/images/uploads/delice_Bottle-2_1794420107446.png',
    images: [
      '/assets/images/uploads/delice_Bottle-2_1794420107446.png',
      '/assets/images/uploads/delice_DLICEinburgundyshadows_1794416567005.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyLight_1794416616204.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyShadows_1794416637826.png'
    ],
    stock: 100,
    badge: 'Opening Offer'
  },
  {
    id: 'delice-enigma',
    name: 'DÉLICE ENIGMA',
    tagline: 'Sophisticated & Intimate',
    volume: '30ml',
    originalPrice: 850,
    price: 799,
    description: 'A sophisticated fragrance for evenings, romantic occasions, dates, and formal events.',
    occasions: ['Evening occasions', 'Dates', 'Romantic moments', 'Formal events'],
    mood: 'evening',
    image: '/assets/images/uploads/delice_Bottle-3_1794420022409.png',
    images: [
      '/assets/images/uploads/delice_Bottle-3_1794420022409.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyShadows_1794416637826.png',
      '/assets/images/uploads/delice_DLICE_MysteryinBurgundyLight_1794416616204.png',
      '/assets/images/uploads/delice_DLICEinburgundyshadows_1794416567005.png'
    ],
    stock: 90,
    badge: 'Opening Offer'
  }
];

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
      return `
        <div class="hero-slide ${idx === 0 ? 'active' : ''}">
          <img src="${s.image}" alt="${s.title || 'DÉLICE Fragrance'}" class="hero-slide-bg">
          <div class="hero-overlay"></div>
          <div class="container hero-actions-container">
            <div class="hero-actions clean-actions">
              <a href="/checkout.html?buyNow=${targetProdId}" class="btn btn-hero-buy">
                Buy Now
              </a>
              <button type="button" class="btn btn-hero-bag" onclick="addProductToBag('${targetProdId}')">
                Add to Cart
              </button>
              <a href="#collection" class="btn btn-hero-explore">
                Explore Fragrance
              </a>
            </div>
          </div>
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
      <article class="product-card" id="card-${prod.id}">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <!-- Main Image: Clicking advances to next angle -->
          <div style="cursor:pointer; width:100%; height:100%; display:flex; align-items:center; justify-content:center;" onclick="slideCardImage('${prod.id}', 1, event)" title="Click to view next angle">
            <img src="${activeImg}" id="card-img-${prod.id}" alt="${prod.name} 30ml Bottle" loading="lazy">
          </div>

          <!-- Right Arrow Button -->
          <button type="button" class="prod-slider-arrow prod-slider-next" 
            aria-label="Next Image" 
            title="Next Angle"
            onclick="slideCardImage('${prod.id}', 1, event)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          
          <!-- 4-Image Thumbnail Gallery Bar -->
          <div class="product-thumbs-bar" id="thumbs-bar-${prod.id}">
            ${imgs.slice(0, 4).map((img, i) => `
              <button type="button" class="prod-card-thumb ${i === currentIdx ? 'active' : ''}" 
                data-index="${i}"
                title="View Angle ${i + 1}"
                onmouseenter="setCardImageIndex('${prod.id}', ${i}, event)"
                onclick="setCardImageIndex('${prod.id}', ${i}, event)">
                <img src="${img}" alt="${prod.name} angle ${i + 1}">
              </button>
            `).join('')}
          </div>
        </div>

        <div class="product-body" style="padding:1.15rem 1.25rem 1.35rem;">
          <!-- 1. Name & 30ml ONLY (NO EAU DE PARFUM) -->
          <div class="product-header-row" style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:0.4rem;">
            <h3 class="product-title" onclick="viewProductDetails('${prod.id}')" style="cursor:pointer; margin:0; font-size:1.22rem; font-weight:700; color:#181619; letter-spacing:0.04em;">${prod.name}</h3>
            <span style="font-size:0.78rem; font-weight:600; color:#4A102A; background:#FAF6F0; padding:0.2rem 0.55rem; border-radius:4px; border:1px solid #EBE3D5; letter-spacing:0.04em;">30ml</span>
          </div>

          <!-- 2. Price right after Name (naamer por a daam) -->
          <div class="product-pricing" style="margin-bottom:0.65rem;">
            <span class="price-current">৳${price}</span>
            <span class="price-original">৳${orig}</span>
            ${discountPercent > 0 ? `<span class="price-savings">SAVE ৳${savings} (${discountPercent}%)</span>` : ''}
          </div>

          <!-- 3. Description -->
          <p class="product-description" style="margin-bottom:0.65rem; font-size:0.875rem; line-height:1.5; color:#59555B;">${prod.description}</p>
          
          <!-- 4. Occasions / Tags ("কবে কোথায় কীভাবে ব্যবহার করা যাবে") -->
          <div class="product-tags" style="margin-bottom:0.95rem;">
            ${(prod.occasions || []).map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
          </div>

          <!-- 5. Action Buttons (Clean, Premium, No Icons / No Emojis) -->
          <div class="product-actions" style="display:grid; grid-template-columns: 1fr 1fr; gap:0.65rem;">
            <button type="button" class="btn btn-primary" onclick="addProductToBag('${prod.id}')" style="padding:0.85rem 0.6rem; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">
              Add to Cart
            </button>
            <a href="/checkout.html?buyNow=${prod.id}" class="btn btn-gold" style="padding:0.85rem 0.6rem; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">
              Buy Now
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
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
    cardImg.src = imgs[validIndex];
    if (cardImg.dataset) cardImg.dataset.index = validIndex;
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
  const product = globalProducts.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('productModal');
  const modalContent = document.getElementById('productModalContent');
  if (!modal || !modalContent) {
    window.location.href = `/product.html?id=${productId}`;
    return;
  }

  const orig = Number(product.originalPrice) || 850;
  const price = Number(product.price) || 799;
  const savings = orig - price;
  const discountPercent = orig > price ? Math.round(((orig - price) / orig) * 100) : 0;

  // Matching box image
  let boxImg = '/assets/images/bloom-box.svg';
  if (product.id.includes('momentum')) boxImg = '/assets/images/momentum-box.svg';
  if (product.id.includes('enigma')) boxImg = '/assets/images/enigma-box.svg';

  // Up to 4 product pictures
  const imgs = (product.images && product.images.length > 0)
    ? product.images
    : [product.image, boxImg, '/assets/images/hero-slide-1.svg', '/assets/images/brand-story.svg'].filter(Boolean);

  window.modalCurrentImgs = imgs.slice(0, 4);
  window.modalCurrentIndex = 0;

  modalContent.innerHTML = `
    <div class="product-detail-grid">
      <div>
        <div class="detail-gallery" style="background:#FAF6F0; border-radius:8px; padding:2rem; display:flex; align-items:center; justify-content:center; min-height:340px; position:relative;">
          <!-- Left Arrow Button -->
          <button type="button" class="modal-gallery-arrow modal-gallery-prev" 
            aria-label="Previous Image" 
            title="Previous Angle"
            onclick="slideModalImage(-1, event)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <img src="${imgs[0] || product.image}" id="quickModalMainImg" alt="${product.name}" style="max-height:320px; width:auto; margin:0 auto; object-fit:contain; transition:opacity 0.18s ease;">

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
      </div>
      <div>
        <span class="tagline-sub">AUTHENTIC 30ML EDITION</span>
        <h2 class="detail-title" style="margin-bottom:0.5rem;">${product.name}</h2>
        <p style="font-size:0.85rem; color:#8C7E72; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:1rem;">30ml Edition</p>
        <p style="color:#59555B; margin-bottom:1.5rem; line-height:1.7;">${product.description}</p>
        
        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:0.9rem; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.5rem; color:#4A102A;">Recommended Occasions</h4>
          <div class="product-tags">
            ${(product.occasions || []).map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
          </div>
        </div>

        <div class="detail-pricing" style="margin-bottom:1.5rem; padding: 1rem 0; border-top:1px solid #E0D4C3; border-bottom:1px solid #E0D4C3;">
          <div>
            <div style="font-size:0.75rem; text-transform:uppercase; color:#87828A;">Opening Offer Price</div>
            <div class="price-current">৳${price}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; text-transform:uppercase; color:#87828A;">Regular Price</div>
            <div class="price-original">৳${orig}</div>
          </div>
          <div style="margin-left:auto;">
            <span class="badge-offer" style="background:#FF665C;">
              ${discountPercent > 0 ? `SAVE ৳${savings} (${discountPercent}% OFF)` : 'OFFER'}
            </span>
          </div>
        </div>

        <!-- BOTH "ADD TO CART" AND "BUY NOW" IN MODAL (NO EMOJIS) -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <button type="button" class="btn btn-primary btn-block" onclick="addProductToBag('${product.id}'); closeModal('productModal');" style="text-transform:uppercase; letter-spacing:0.12em; font-weight:700;">
            Add to Cart
          </button>
          <a href="/checkout.html?buyNow=${product.id}" class="btn btn-gold btn-block" style="text-transform:uppercase; letter-spacing:0.12em; font-weight:700; text-align:center;">
            Buy Now
          </a>
        </div>
      </div>
    </div>
  `;

  openModal('productModal');
}

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

function slideMoodImage(prodId, direction, event) {
  if (event) event.stopPropagation();
  const product = globalProducts.find(p => p.id === prodId);
  if (!product) return;
  const imgs = (product.images && product.images.length > 0) ? product.images : [product.image];
  let newIdx = (window.moodImageIndex || 0) + direction;
  if (newIdx < 0) newIdx = imgs.length - 1;
  if (newIdx >= imgs.length) newIdx = 0;
  window.moodImageIndex = newIdx;

  const imgEl = document.getElementById('moodMatchMainImg');
  if (imgEl) {
    imgEl.src = imgs[newIdx];
  }
}
window.slideMoodImage = slideMoodImage;

function renderMoodFinderProduct() {
  const activeBtn = document.querySelector('.mood-pill-btn.active');
  const mood = activeBtn ? activeBtn.getAttribute('data-mood') : 'romantic';
  const matchResult = document.getElementById('moodMatchResult');
  if (!matchResult) return;

  let matched = globalProducts.find(p => p.mood === mood) || globalProducts[0];
  const imgs = (matched.images && matched.images.length > 0) ? matched.images : [matched.image || '/assets/images/bloom.svg'];
  window.moodImageIndex = 0;
  const mainImg = imgs[0];

  matchResult.innerHTML = `
    <div class="mood-match-card">
      <div style="background:#FAF6F0; border-radius:8px; padding:1.5rem; text-align:center; position:relative; min-height:240px; display:flex; align-items:center; justify-content:center;">
        <!-- Left Arrow Button -->
        <button type="button" class="prod-slider-arrow prod-slider-prev" 
          aria-label="Previous Image" 
          title="Previous Angle"
          onclick="slideMoodImage('${matched.id}', -1, event)"
          style="left:0.5rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <img src="${mainImg}" id="moodMatchMainImg" alt="${matched.name}" style="max-height:220px; width:auto; margin:0 auto; object-fit:contain; transition:opacity 0.18s ease;">

        <!-- Right Arrow Button -->
        <button type="button" class="prod-slider-arrow prod-slider-next" 
          aria-label="Next Image" 
          title="Next Angle"
          onclick="slideMoodImage('${matched.id}', 1, event)"
          style="right:0.5rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
      <div>
        <span class="tagline-sub">YOUR RECOMMENDED SIGNATURE</span>
        <h3 style="font-size:1.6rem; margin-bottom:0.4rem;">${matched.name}</h3>
        <p style="color:#59555B; margin-bottom:1rem; font-size:0.95rem;">${matched.description}</p>
        <div class="product-tags" style="margin-bottom:1.25rem;">
          ${(matched.occasions || []).map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
        </div>
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <span style="font-family:var(--font-heading); font-size:1.5rem; font-weight:700; color:#4A102A;">৳${matched.price}</span>
          <button type="button" class="btn btn-primary" onclick="addProductToBag('${matched.id}')" style="text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">Add to Cart</button>
          <a href="/checkout.html?buyNow=${matched.id}" class="btn btn-gold" style="text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">Buy Now</a>
          <button type="button" class="btn btn-secondary" onclick="viewProductDetails('${matched.id}')" style="text-transform:uppercase; letter-spacing:0.1em;">Explore Details</button>
        </div>
      </div>
    </div>
  `;
}

function initMoodFinder() {
  const buttons = document.querySelectorAll('.mood-pill-btn');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMoodFinderProduct();
    });
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
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
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
