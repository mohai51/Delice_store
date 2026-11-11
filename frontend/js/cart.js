/**
 * DÉLICE — Client-side Shopping Cart Module
 * Handles localStorage persistence, quantity manipulation, drawer management, and pricing calculations.
 */

const DeliceCart = (function() {
  const STORAGE_KEY = 'delice_cart_items';
  let cartItems = [];

  // Initialize cart from localStorage
  function init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      cartItems = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Could not read cart from localStorage', e);
      cartItems = [];
    }
    updateBadge();
    renderDrawerItems();
    attachListeners();
  }

  function getItems() {
    return [...cartItems];
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
    updateBadge();
    renderDrawerItems();
    window.dispatchEvent(new CustomEvent('delice:cartUpdated', { detail: { items: cartItems } }));
  }

  function addItem(product, quantity = 1) {
    if (!product || !product.id) return;
    const qty = parseInt(quantity, 10) || 1;
    if (qty <= 0) return;

    const existingIndex = cartItems.findIndex(item => item.id === product.id);

    const primaryImg = (product.images && product.images.length > 0) ? product.images[0] : (product.image || '/assets/images/bloom.svg');

    if (existingIndex > -1) {
      cartItems[existingIndex].quantity += qty;
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
    const qty = parseInt(quantity, 10);
    const index = cartItems.findIndex(item => item.id === productId);
    if (index === -1) return;

    if (qty <= 0) {
      removeItem(productId);
    } else {
      cartItems[index].quantity = qty;
      save();
    }
  }

  function removeItem(productId) {
    const item = cartItems.find(i => i.id === productId);
    cartItems = cartItems.filter(item => item.id !== productId);
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
      const p = productsList.find(x => x.id === item.id);
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
      renderDrawer();
    }
  }

  function getSubtotal() {
    return cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  function getSavings() {
    return cartItems.reduce((acc, item) => {
      const orig = item.originalPrice || item.price;
      return acc + ((orig - item.price) * item.quantity);
    }, 0);
  }

  function getTotalItemsCount() {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
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
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function renderDrawerItems() {
    const container = document.getElementById('drawerCartItems');
    const footerContainer = document.getElementById('drawerCartFooter');
    if (!container) return;

    if (cartItems.length === 0) {
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
            <button type="button" class="qty-btn" onclick="DeliceCart.updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
            <span class="qty-val">${item.quantity}</span>
            <button type="button" class="qty-btn" onclick="DeliceCart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
          </div>
        </div>
        <button type="button" class="cart-item-remove" title="Remove item" onclick="DeliceCart.removeItem('${item.id}')">&times;</button>
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
        box-shadow: 0 10px 25px rgba(24, 22, 25, 0.3);
        z-index: 3000;
        font-size: 0.875rem;
        font-weight: 500;
        border-left: 3px solid #C5A46D;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 3200);
  }

  function attachListeners() {
    // Cart open buttons
    document.querySelectorAll('[data-cart-open]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      });
    });

    // Cart close buttons
    document.querySelectorAll('[data-cart-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
      });
    });

    // Close on overlay click
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
      overlay.addEventListener('click', closeDrawer);
    }
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
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
    syncWithProducts
  };
})();
