/**
 * DÉLICE — Client-side Shopping Cart Module
 * Handles localStorage persistence, quantity manipulation, drawer management, and pricing calculations.
 */

const DeliceCart = (function() {
  const STORAGE_KEY = 'delice_cart_items';
  let cartItems = [];

  // Helper to resolve product from ID string or product object
  function resolveProduct(productOrId) {
    if (!productOrId) return null;

    // 1. If it's already an object with name and price
    if (typeof productOrId === 'object') {
      const pId = String(productOrId.id || productOrId._id || '').trim().toLowerCase().replace(/_/g, '-');
      if (pId && productOrId.name) {
        return {
          id: pId,
          name: productOrId.name,
          price: Number(productOrId.price) || 799,
          originalPrice: Number(productOrId.originalPrice) || 850,
          volume: productOrId.volume || '30ml',
          image: (productOrId.images && productOrId.images.length > 0) ? productOrId.images[0] : (productOrId.image || '/assets/images/bloom.svg'),
          images: productOrId.images || [(productOrId.image || '/assets/images/bloom.svg')]
        };
      }
    }

    // 2. If it's a string ID or object with only id/_id
    const rawId = typeof productOrId === 'object' ? (productOrId.id || productOrId._id || '') : productOrId;
    const normId = String(rawId || '').trim().toLowerCase().replace(/_/g, '-');
    if (!normId) return null;

    // Search in globalProducts if defined
    if (typeof globalProducts !== 'undefined' && Array.isArray(globalProducts) && globalProducts.length) {
      const found = globalProducts.find(p => {
        const pid = String(p.id || '').trim().toLowerCase().replace(/_/g, '-');
        const poid = String(p._id || '').trim();
        return pid === normId || poid === normId;
      });
      if (found) return resolveProduct(found);
    }

    // Search in window.currentActiveProduct
    if (typeof window !== 'undefined' && window.currentActiveProduct) {
      const cur = window.currentActiveProduct;
      const curId = String(cur.id || cur._id || '').trim().toLowerCase().replace(/_/g, '-');
      if (curId === normId) return resolveProduct(cur);
    }

    // Search in DEFAULT_PRODUCTS if defined
    if (typeof DEFAULT_PRODUCTS !== 'undefined' && Array.isArray(DEFAULT_PRODUCTS)) {
      const def = DEFAULT_PRODUCTS.find(p => {
        const pid = String(p.id || '').trim().toLowerCase().replace(/_/g, '-');
        return pid === normId;
      });
      if (def) return resolveProduct(def);
    }

    // Fallback named items
    const nameMap = {
      'delice-bloom': 'DÉLICE BLOOM',
      'delice-momentum': 'DÉLICE MOMENTUM',
      'delice-enigma': 'DÉLICE ENIGMA'
    };
    const fallbackName = nameMap[normId] || normId.toUpperCase().replace(/-/g, ' ');

    return {
      id: normId,
      name: fallbackName,
      price: 799,
      originalPrice: 850,
      volume: '30ml',
      image: `/assets/images/${normId.includes('momentum') ? 'momentum' : normId.includes('enigma') ? 'enigma' : 'bloom'}.svg`,
      images: [`/assets/images/${normId.includes('momentum') ? 'momentum' : normId.includes('enigma') ? 'enigma' : 'bloom'}.svg`]
    };
  }

  // Initialize cart from localStorage with corruption safety
  function init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      cartItems = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(cartItems)) cartItems = [];
    } catch (e) {
      console.warn('Could not read cart from localStorage', e);
      cartItems = [];
    }
    // Filter and sanitize items
    cartItems = cartItems.filter(item => item && (item.id || item._id)).map(item => ({
      id: String(item.id || item._id).toLowerCase().replace(/_/g, '-'),
      name: item.name || 'DÉLICE Fragrance',
      price: Number(item.price) || 799,
      originalPrice: Number(item.originalPrice) || 850,
      volume: item.volume || '30ml',
      image: item.image || '/assets/images/bloom.svg',
      images: item.images || [item.image || '/assets/images/bloom.svg'],
      quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
    }));

    updateBadge();
    renderDrawerItems();
    attachListeners();
  }

  function getItems() {
    if (!Array.isArray(cartItems)) cartItems = [];
    return [...cartItems];
  }

  function save() {
    if (!Array.isArray(cartItems)) cartItems = [];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
    updateBadge();
    renderDrawerItems();
    window.dispatchEvent(new CustomEvent('delice:cartUpdated', { detail: { items: cartItems } }));
  }

  function addItem(productOrId, quantity = 1) {
    const product = resolveProduct(productOrId);
    if (!product || !product.id) {
      console.warn('DeliceCart.addItem: Unable to resolve product:', productOrId);
      return;
    }

    const qty = parseInt(quantity, 10) || 1;
    if (qty <= 0) return;

    if (!Array.isArray(cartItems)) cartItems = [];

    const existingIndex = cartItems.findIndex(item => item && item.id === product.id);
    const primaryImg = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '/assets/images/bloom.svg');

    if (existingIndex > -1) {
      cartItems[existingIndex].quantity = (parseInt(cartItems[existingIndex].quantity, 10) || 0) + qty;
      if (primaryImg) cartItems[existingIndex].image = primaryImg;
    } else {
      cartItems.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 799,
        originalPrice: Number(product.originalPrice) || 850,
        volume: product.volume || '30ml',
        image: primaryImg,
        images: product.images || [primaryImg],
        quantity: qty
      });
    }

    save();
    openDrawer();
    showToast(`Added ${product.name} to your shopping bag.`);
  }

  function updateQuantity(productId, quantity) {
    if (!Array.isArray(cartItems)) cartItems = [];
    const normId = String(productId || '').toLowerCase().replace(/_/g, '-');
    const qty = parseInt(quantity, 10);
    const index = cartItems.findIndex(item => item && item.id === normId);
    if (index === -1) return;

    if (qty <= 0) {
      removeItem(normId);
    } else {
      cartItems[index].quantity = qty;
      save();
    }
  }

  function removeItem(productId) {
    if (!Array.isArray(cartItems)) cartItems = [];
    const normId = String(productId || '').toLowerCase().replace(/_/g, '-');
    const item = cartItems.find(i => i && i.id === normId);
    cartItems = cartItems.filter(i => i && i.id !== normId);
    save();
    if (item) {
      showToast(`Removed ${item.name} from your bag.`);
    }
  }

  function clearCart() {
    cartItems = [];
    save();
  }

  function syncWithProducts(productsList) {
    if (!productsList || !productsList.length || !cartItems.length) return;
    let changed = false;
    cartItems.forEach(item => {
      const p = productsList.find(x => x && (x.id === item.id || x._id === item.id));
      if (p) {
        const primaryImg = (p.images && p.images.length > 0) ? p.images[0] : p.image;
        if (primaryImg && item.image !== primaryImg) {
          item.image = primaryImg;
          changed = true;
        }
      }
    });
    if (changed) {
      save();
    }
  }

  function getSubtotal() {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((acc, item) => acc + ((Number(item.price) || 0) * (parseInt(item.quantity, 10) || 1)), 0);
  }

  function getSavings() {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((acc, item) => {
      const orig = Number(item.originalPrice) || Number(item.price) || 0;
      const cur = Number(item.price) || 0;
      return acc + ((orig - cur) * (parseInt(item.quantity, 10) || 1));
    }, 0);
  }

  function getTotalItemsCount() {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((acc, item) => acc + (parseInt(item.quantity, 10) || 0), 0);
  }

  function updateBadge() {
    const count = getTotalItemsCount();
    const badges = document.querySelectorAll('.cart-count');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) {
      drawer.classList.add('active');
    }
    if (overlay) {
      overlay.classList.add('active');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) {
      drawer.classList.remove('active');
    }
    if (overlay) {
      overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
  }

  function renderDrawerItems() {
    const container = document.getElementById('drawerCartItems');
    const footerContainer = document.getElementById('drawerCartFooter');
    if (!container) return;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      container.innerHTML = `
        <div class="cart-empty-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <p>Your shopping bag is currently empty.</p>
          <a href="/index.html#collection" class="btn btn-primary" style="margin-top:1rem; padding: 0.65rem 1.25rem;" onclick="DeliceCart.closeDrawer()">Explore Fragrances</a>
        </div>
      `;
      if (footerContainer) footerContainer.style.display = 'none';
      return;
    }

    if (footerContainer) footerContainer.style.display = 'block';

    const subtotal = getSubtotal();
    const savings = getSavings();

    container.innerHTML = cartItems.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-thumb">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
        </div>
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <div class="cart-item-price">৳${item.price} <span style="font-size:0.75rem; color:#87828A;">(${item.volume})</span></div>
          <div class="quantity-control">
            <button type="button" class="qty-btn" onclick="DeliceCart.updateQuantity('${item.id}', ${item.quantity - 1})" aria-label="Decrease quantity">−</button>
            <span class="qty-val">${item.quantity}</span>
            <button type="button" class="qty-btn" onclick="DeliceCart.updateQuantity('${item.id}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button type="button" class="cart-item-remove" title="Remove item" onclick="DeliceCart.removeItem('${item.id}')" aria-label="Remove item">&times;</button>
      </div>
    `).join('');

    const subtotalElem = document.getElementById('drawerSubtotal');
    if (subtotalElem) subtotalElem.textContent = `৳${subtotal}`;

    const savingsElem = document.getElementById('drawerSavings');
    if (savingsElem) {
      savingsElem.textContent = savings > 0 ? `Saved ৳${savings}` : '';
    }
  }

  function showToast(message) {
    let toast = document.getElementById('deliceToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'deliceToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: #181619;
        color: #F6F0E8;
        padding: 0.9rem 1.4rem;
        border-radius: 4px;
        box-shadow: 0 10px 25px rgba(24, 22, 25, 0.35);
        z-index: 9999;
        font-size: 0.875rem;
        font-weight: 500;
        border-left: 3px solid #C5A46D;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transform: translateY(100px);
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.pointerEvents = 'auto';
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      toast.style.pointerEvents = 'none';
    }, 3200);
  }

  let listenersAttached = false;
  function attachListeners() {
    if (listenersAttached) return;
    listenersAttached = true;

    // Delegated click listeners for open, close, overlay, and Add to Cart
    document.addEventListener('click', (e) => {
      // 1. Open drawer
      const openBtn = e.target.closest('[data-cart-open]');
      if (openBtn) {
        e.preventDefault();
        openDrawer();
        return;
      }

      // 2. Close drawer
      const closeBtn = e.target.closest('[data-cart-close]');
      if (closeBtn) {
        e.preventDefault();
        closeDrawer();
        return;
      }

      // 3. Close on overlay click
      if (e.target && e.target.id === 'cartOverlay') {
        closeDrawer();
        return;
      }

      // 4. ANY Add to Cart button on any page
      const addCartBtn = e.target.closest('.btn-add-cart, .btn-add-cart-detail, .mood-match-btn-cart, [data-add-to-cart]');
      if (addCartBtn) {
        e.preventDefault();
        e.stopPropagation();

        const prodId = addCartBtn.getAttribute('data-add-to-cart') ||
                       addCartBtn.dataset.addToCart ||
                       addCartBtn.getAttribute('data-product-id') ||
                       addCartBtn.dataset.productId ||
                       (typeof window !== 'undefined' && window.currentActiveProduct && window.currentActiveProduct.id) ||
                       'delice-bloom';

        // Provide immediate visual feedback on the button itself
        const prevText = addCartBtn.innerHTML;
        addCartBtn.innerHTML = 'Added! ✓';
        addCartBtn.style.opacity = '0.9';
        addCartBtn.style.pointerEvents = 'none';

        setTimeout(() => {
          addCartBtn.innerHTML = prevText;
          addCartBtn.style.opacity = '1';
          addCartBtn.style.pointerEvents = 'auto';
        }, 1400);

        addItem(prodId, 1);
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    });
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const api = {
    init,
    getItems,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getSavings,
    getTotalItemsCount,
    openDrawer,
    closeDrawer,
    showToast,
    syncWithProducts,
    resolveProduct
  };

  if (typeof window !== 'undefined') {
    window.DeliceCart = api;
    window.addProductToBag = function(productOrId, qty = 1) {
      return api.addItem(productOrId, qty);
    };
    window.openCartDrawer = openDrawer;
    window.closeCartDrawer = closeDrawer;
  }

  return api;
})();
