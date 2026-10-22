/**
 * DÉLICE — Quiet Luxury Perfumery Storefront Engine
 * Vanilla JavaScript (No React, Vue, Angular or jQuery)
 */

(function () {
  'use strict';

  // State
  const state = {
    config: null,
    cart: [],
    sessionId: null
  };

  // Helper: Format BDT Currency
  function formatBDT(amount) {
    const num = Math.round(Number(amount) || 0);
    return '৳' + num.toLocaleString('en-US');
  }

  // Session ID Management for First-Party Analytics
  function getOrCreateSessionId() {
    let sid = localStorage.getItem('delice_sid');
    if (!sid) {
      sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('delice_sid', sid);
    }
    return sid;
  }

  // First-party privacy-respecting analytics
  async function trackEvent(eventType, payload = {}) {
    try {
      const body = {
        sessionId: state.sessionId,
        eventType,
        pagePath: window.location.pathname,
        referrer: document.referrer || 'Direct',
        deviceCategory: window.innerWidth < 768 ? 'mobile' : (window.innerWidth < 1024 ? 'tablet' : 'desktop'),
        ...payload
      };

      // Non-blocking fire & forget
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/storefront/analytics/collect', JSON.stringify(body));
      } else {
        fetch('/api/storefront/analytics/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive: true
        });
      }
    } catch (e) {
      // Ignore client analytics errors to ensure undisturbed shopping
    }
  }

  // Toast Notifications
  function showToast(message, duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Cart Management
  function loadCart() {
    try {
      const saved = localStorage.getItem('delice_cart');
      state.cart = saved ? JSON.parse(saved) : [];
    } catch (e) {
      state.cart = [];
    }
    updateCartUI();
  }

  function saveCart() {
    try {
      localStorage.setItem('delice_cart', JSON.stringify(state.cart));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
    updateCartUI();
  }

  function addToBag(item) {
    // Check if variant is already in cart
    const existingIndex = state.cart.findIndex(
      i => i.productId === item.productId && i.size === item.size
    );

    if (existingIndex > -1) {
      state.cart[existingIndex].quantity += item.quantity || 1;
    } else {
      state.cart.push({
        productId: item.productId,
        slug: item.slug,
        name: item.name,
        size: item.size,
        unitPrice: item.unitPrice,
        quantity: item.quantity || 1,
        imageUrl: item.imageUrl
      });
    }

    saveCart();
    trackEvent('add_to_bag', {
      productSlug: item.slug,
      productName: item.name
    });

    showToast(`Added ${item.name} (${item.size}) to your bag.`);
    openCartDrawer();
  }

  function updateQuantity(productId, size, delta) {
    const item = state.cart.find(i => i.productId === productId && i.size === size);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      state.cart = state.cart.filter(i => !(i.productId === productId && i.size === size));
    }

    saveCart();
  }

  function removeFromBag(productId, size) {
    state.cart = state.cart.filter(i => !(i.productId === productId && i.size === size));
    saveCart();
  }

  function updateCartUI() {
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // Update count badges
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = totalCount;
      el.style.display = totalCount > 0 ? 'flex' : 'none';
    });

    // Update Drawer Elements if present
    const drawerBody = document.getElementById('cart-drawer-items');
    const drawerSubtotal = document.getElementById('cart-drawer-subtotal');
    const checkoutBtn = document.getElementById('cart-drawer-checkout-btn');

    if (drawerSubtotal) {
      drawerSubtotal.textContent = formatBDT(subtotal);
    }

    if (checkoutBtn) {
      checkoutBtn.disabled = state.cart.length === 0;
    }

    if (drawerBody) {
      if (state.cart.length === 0) {
        drawerBody.innerHTML = `
          <div style="text-align: center; padding: 48px 0; color: var(--color-muted);">
            <p style="font-size: 1.1rem; margin-bottom: 12px; font-family: var(--font-serif);">Your shopping bag is empty.</p>
            <p style="font-size: 0.85rem; margin-bottom: 24px;">Discover our collection of rare, quiet luxury fragrances.</p>
            <a href="/#collection" class="btn btn-secondary btn-close-drawer">Explore Collection</a>
          </div>
        `;
        const closeBtn = drawerBody.querySelector('.btn-close-drawer');
        if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
      } else {
        drawerBody.innerHTML = state.cart.map(item => `
          <div class="cart-item" data-product-id="${item.productId}" data-size="${item.size}">
            <div class="cart-item-image">
              <img src="${item.imageUrl || '/images/delice-01.jpg'}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-size">${item.size} • ${formatBDT(item.unitPrice)}</div>
              <div class="cart-item-qty-row">
                <div class="qty-control">
                  <button class="qty-btn btn-qty-minus" aria-label="Decrease quantity">−</button>
                  <span class="qty-val">${item.quantity}</span>
                  <button class="qty-btn btn-qty-plus" aria-label="Increase quantity">+</button>
                </div>
                <button class="cart-item-remove btn-item-remove">Remove</button>
              </div>
            </div>
          </div>
        `).join('');

        // Attach event listeners for quantity & removal
        drawerBody.querySelectorAll('.cart-item').forEach(el => {
          const pId = el.getAttribute('data-product-id');
          const pSize = el.getAttribute('data-size');

          el.querySelector('.btn-qty-minus')?.addEventListener('click', () => updateQuantity(pId, pSize, -1));
          el.querySelector('.btn-qty-plus')?.addEventListener('click', () => updateQuantity(pId, pSize, 1));
          el.querySelector('.btn-item-remove')?.addEventListener('click', () => removeFromBag(pId, pSize));
        });
      }
    }
  }

  // Drawer Controls
  function openCartDrawer() {
    const backdrop = document.getElementById('drawer-backdrop');
    const drawer = document.getElementById('cart-drawer');
    if (backdrop && drawer) {
      backdrop.classList.add('active');
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartDrawer() {
    const backdrop = document.getElementById('drawer-backdrop');
    const drawer = document.getElementById('cart-drawer');
    if (backdrop && drawer) {
      backdrop.classList.remove('active');
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Mobile Navigation
  function toggleMobileNav() {
    const nav = document.getElementById('mobile-nav-drawer');
    if (nav) {
      nav.classList.toggle('open');
      document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
    }
  }

  // Policy Modals
  async function openPolicyModal(policyType) {
    const backdrop = document.getElementById('modal-backdrop');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body-content');

    if (!backdrop || !titleEl || !bodyEl) return;

    titleEl.textContent = 'Concierge Information';
    bodyEl.textContent = 'Loading policy information...';
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
      if (!state.config) {
        const res = await fetch('/api/storefront/config');
        state.config = await res.json();
      }

      const titles = {
        delivery: 'Delivery Information',
        returns: 'Returns & Exchanges',
        privacy: 'Client Privacy Policy',
        terms: 'Terms of Service'
      };

      titleEl.textContent = titles[policyType] || 'Concierge Information';
      bodyEl.textContent = state.config.policies?.[policyType] || 'Information unavailable.';
    } catch (e) {
      bodyEl.textContent = 'Could not load policy at this moment. Please reach our concierge directly.';
    }
  }

  function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    state.sessionId = getOrCreateSessionId();
    loadCart();

    // Track page view
    trackEvent('page_view');

    // Cart trigger listener
    document.querySelectorAll('.cart-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openCartDrawer();
      });
    });

    // Close drawer buttons
    document.getElementById('cart-drawer-close')?.addEventListener('click', closeCartDrawer);
    document.getElementById('drawer-backdrop')?.addEventListener('click', closeCartDrawer);

    // Mobile nav trigger
    document.querySelector('.mobile-menu-btn')?.addEventListener('click', toggleMobileNav);
    document.getElementById('mobile-nav-close')?.addEventListener('click', toggleMobileNav);
    document.getElementById('mobile-nav-drawer')?.addEventListener('click', (e) => {
      if (e.target.id === 'mobile-nav-drawer') toggleMobileNav();
    });

    // Modal Close
    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });

    // Escape Key listener for accessible closing
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCartDrawer();
        closeModal();
        const mobileNav = document.getElementById('mobile-nav-drawer');
        if (mobileNav && mobileNav.classList.contains('open')) toggleMobileNav();
      }
    });

    // Policy Links Trigger
    document.querySelectorAll('[data-policy]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openPolicyModal(link.getAttribute('data-policy'));
      });
    });
  });

  // Expose API globally for inline actions
  window.Delice = {
    addToBag,
    updateQuantity,
    removeFromBag,
    openCartDrawer,
    closeCartDrawer,
    openPolicyModal,
    formatBDT,
    showToast,
    trackEvent,
    getCart: () => state.cart
  };
})();
