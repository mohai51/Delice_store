/**
 * DÉLICE — Luxury Administration Workspace Engine
 * Vanilla JavaScript Single-Page Application
 */

(function () {
  'use strict';

  let currentAdmin = null;
  let csrfToken = null;
  let activeTab = 'dashboard';
  let cachedHomepage = null;
  let cachedProducts = [];
  let currentModalProductImages = [];

  // Helper: Format BDT Currency
  function formatBDT(amount) {
    const num = Math.round(Number(amount) || 0);
    return '৳' + num.toLocaleString('en-US');
  }

  // Helper: Format Date
  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Helper: Format Date & Time
  function formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Toast Notification
  function showAdminToast(message, isError = false) {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `background:#222;color:#FFF;padding:12px 20px;border-radius:4px;font-size:0.875rem;border-left:4px solid ${isError ? '#E53E3E' : '#C5A880'};box-shadow:0 8px 24px rgba(0,0,0,0.5);`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Authenticated Fetch Wrapper with CSRF Header
  async function adminFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (csrfToken) {
      options.headers['x-csrf-token'] = csrfToken;
    }

    const res = await fetch(url, options);

    if (res.status === 401) {
      window.location.href = '/admin/login';
      throw new Error('Session expired');
    }

    return res;
  }

  // ==========================================
  // 1. INITIALIZATION & AUTH CHECK
  // ==========================================
  async function initAdmin() {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (!res.ok) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await res.json();
      currentAdmin = data.admin;
      csrfToken = data.csrfToken || sessionStorage.getItem('delice_csrf');

      document.getElementById('admin-username-display').textContent = currentAdmin.username;

      // Handle navigation tab switching
      document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          switchTab(btn.getAttribute('data-tab'));
        });
      });

      // Logout handler
      document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/admin/auth/logout', { method: 'POST' });
        window.location.href = '/admin/login';
      });

      // Load initial tab
      switchTab('dashboard');

    } catch (err) {
      console.error('Admin initialization error:', err);
      window.location.href = '/admin/login';
    }
  }

  function switchTab(tabId) {
    activeTab = tabId;

    // Update sidebar navigation active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabId);
    });

    // Hide all view panels
    document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');

    // Show active view
    const view = document.getElementById(`view-${tabId}`);
    if (view) {
      view.style.display = 'block';
    }

    // Trigger tab-specific loader
    switch (tabId) {
      case 'dashboard': loadDashboard(); break;
      case 'hero': loadHeroEditor(); break;
      case 'products': loadProducts(); break;
      case 'orders': loadOrders(); break;
      case 'analytics': loadAnalytics(); break;
      case 'profit': loadProfitCalculator(); break;
    }
  }

  // ==========================================
  // 2. DASHBOARD VIEW
  // ==========================================
  async function loadDashboard() {
    const days = document.getElementById('dashboard-days-filter')?.value || 30;
    try {
      const res = await adminFetch(`/api/admin/dashboard?days=${days}`);
      const { metrics, recentOrders } = await res.json();

      document.getElementById('metric-total-orders').textContent = metrics.totalOrders || 0;
      document.getElementById('metric-net-sales').textContent = formatBDT(metrics.deliveredNetSales || 0);
      document.getElementById('metric-pending-orders').textContent = metrics.pendingOrdersCount || 0;
      document.getElementById('metric-low-stock').textContent = metrics.lowStockCount || 0;

      // Render recent orders
      const tbody = document.getElementById('dashboard-recent-orders-tbody');
      if (recentOrders && recentOrders.length > 0) {
        tbody.innerHTML = recentOrders.map(o => `
          <tr>
            <td><strong>${o.orderReference}</strong></td>
            <td>${o.customer.name}<br><small style="color:var(--admin-text-muted);">${o.customer.phone} • ${o.customer.district}</small></td>
            <td><strong>${formatBDT(o.pricing.total)}</strong></td>
            <td><span class="badge badge-${o.payment.status}">${o.payment.status}</span></td>
            <td><span class="badge badge-${o.fulfillment.status}">${o.fulfillment.status}</span></td>
            <td>${formatDate(o.createdAt)}</td>
            <td>
              <button onclick="window.DeliceAdmin.openOrderModal('${o.orderReference}')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.75rem;">Manage</button>
            </td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--admin-text-muted);">No orders recorded in this period.</td></tr>`;
      }

      // Low stock warnings
      const lowStockBox = document.getElementById('low-stock-warnings');
      if (metrics.lowStockItems && metrics.lowStockItems.length > 0) {
        lowStockBox.style.display = 'block';
        lowStockBox.innerHTML = `
          <strong style="color:#F6AD55;">Low Stock Notice:</strong> ${metrics.lowStockItems.map(i => `${i.productName} (${i.size}): ${i.stock} bottles left`).join(' • ')}
        `;
      } else {
        lowStockBox.style.display = 'none';
      }

    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }

  // ==========================================
  // 3. HERO SLIDER EDITOR VIEW
  // ==========================================
  async function loadHeroEditor() {
    try {
      const res = await adminFetch('/api/admin/homepage');
      const { published, draft } = await res.json();
      cachedHomepage = draft || published;

      const hp = cachedHomepage;
      if (!hp.hero) hp.hero = {};
      if (!hp.hero.slides) {
        hp.hero.slides = [
          { id: 'slide-1', imageUrl: hp.hero.desktopImageUrl || '/images/hero-desktop.jpg', title: hp.hero.headline || 'A Signature, Remembered.', subtitle: hp.hero.description || 'Haute Parfumerie Bangladesh', link: '#collection' }
        ];
      }

      // Populate text inputs
      document.getElementById('edit-hero-headline').value = hp.hero.headline || '';
      document.getElementById('edit-hero-desc').value = hp.hero.description || '';
      document.getElementById('edit-hero-cta-text').value = hp.hero.ctaText || 'Discover DÉLICE';
      document.getElementById('edit-hero-cta-link').value = hp.hero.ctaLink || '#collection';

      renderHeroSlides();
    } catch (err) {
      console.error('Failed to load hero editor:', err);
    }
  }

  function renderHeroSlides() {
    const list = document.getElementById('hero-slides-list');
    const badge = document.getElementById('hero-slides-count-badge');
    const slides = cachedHomepage?.hero?.slides || [];

    badge.textContent = `${slides.length} Slide(s)`;

    if (slides.length === 0) {
      list.innerHTML = `<div style="padding:24px; text-align:center; color:var(--admin-text-muted); background:#1e1e1e; border-radius:6px;">No slideshow images added yet. Add an image below.</div>`;
      return;
    }

    list.innerHTML = slides.map((s, idx) => `
      <div class="slide-item-card">
        <img src="${s.imageUrl}" class="slide-item-thumb" alt="Slide ${idx + 1}" onerror="this.src='/images/hero-desktop.jpg'">
        <div style="flex-grow:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:var(--admin-gold); font-size:0.9rem;">Slide #${idx + 1}</strong>
            <button type="button" onclick="window.DeliceAdmin.deleteHeroSlide(${idx})" class="btn-text" style="color:var(--status-cancelled); font-size:0.8rem; cursor:pointer;">
              Remove Slide
            </button>
          </div>
          <div style="font-size:0.85rem; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${s.title || '(No title)'}</div>
          <div style="font-size:0.75rem; color:var(--admin-text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${s.imageUrl}</div>
        </div>
      </div>
    `).join('');
  }

  // ==========================================
  // 4. PRODUCTS & MULTI-IMAGE MANAGEMENT
  // ==========================================
  async function loadProducts() {
    try {
      const res = await adminFetch('/api/admin/products');
      const products = await res.json();
      cachedProducts = products;

      const tbody = document.getElementById('products-table-tbody');
      if (products && products.length > 0) {
        tbody.innerHTML = products.map(p => {
          const v = (p.variants || [])[0] || { price: 0, salePrice: null, stock: 0, size: '50ml' };
          const totalStock = (p.variants || []).reduce((sum, item) => sum + (item.stock || 0), 0);
          const hasDiscount = Boolean(v.salePrice && v.salePrice < v.price);
          const primaryImg = (p.images && p.images.find(i => i.isPrimary)) || (p.images && p.images[0]) || { url: '/images/delice-01.jpg' };
          const imgCount = (p.images || []).length;

          return `
            <tr>
              <td>
                <div style="display:flex; gap:12px; align-items:center;">
                  <img src="${primaryImg.url}" style="width:48px;height:48px;border-radius:4px;object-fit:cover;background:#222;" onerror="this.src='/images/delice-01.jpg'">
                  <div>
                    <strong style="font-size:0.95rem;">${p.name}</strong>
                    <div style="font-size:0.75rem; color:var(--admin-text-muted);">${p.scentFamily} • SKU: ${p.sku} • <span style="color:var(--admin-gold);">${imgCount} image(s)</span></div>
                  </div>
                </div>
              </td>
              <td>
                <div>
                  <strong style="color:#fff; font-size:1rem;">${formatBDT(v.salePrice || v.price)}</strong>
                  ${hasDiscount ? `<span style="font-size:0.8rem; color:var(--admin-text-muted); text-decoration:line-through; margin-left:6px;">${formatBDT(v.price)}</span> <span class="badge badge-confirmed" style="font-size:0.7rem; background:rgba(229,62,62,0.2); color:#FC8181;">৳${(v.price - v.salePrice).toLocaleString()} OFF</span>` : ''}
                </div>
                <div style="font-size:0.75rem; color:var(--admin-text-muted);">${v.size || '100ml'}</div>
              </td>
              <td>
                <span style="font-weight:600; color:${totalStock < 5 ? '#FC8181' : '#68D391'};">
                  ${totalStock} bottles
                </span>
              </td>
              <td>
                <span class="badge ${p.status === 'published' ? 'badge-delivered' : 'badge-pending'}">
                  ${p.status.toUpperCase()}
                </span>
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button onclick="window.DeliceAdmin.openEditProductModal('${p._id || p.id}')" class="btn btn-gold" style="padding:6px 12px; font-size:0.75rem;">
                    Edit
                  </button>
                  <button onclick="window.DeliceAdmin.openStockModal('${p._id || p.id}')" class="btn btn-secondary" style="padding:6px 10px; font-size:0.75rem;">
                    Stock
                  </button>
                  <button onclick="window.DeliceAdmin.quickDeleteProduct('${p._id || p.id}', '${p.name.replace(/'/g, "\\'")}')" class="btn-text" style="color:var(--status-cancelled); font-size:0.75rem; padding:4px 6px;">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--admin-text-muted);">No products found in catalog.</td></tr>`;
      }
    } catch (err) {
      console.error('Products load error:', err);
    }
  }

  function renderProductModalImages() {
    const grid = document.getElementById('product-modal-images-grid');
    const badge = document.getElementById('prod-images-count-badge');
    badge.textContent = `${currentModalProductImages.length} / 5 Images`;

    if (currentModalProductImages.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; color:var(--admin-text-muted); font-size:0.8rem; text-align:center; padding:16px;">No photos uploaded yet. Upload 4-5 images for this perfume.</div>`;
      return;
    }

    grid.innerHTML = currentModalProductImages.map((img, idx) => `
      <div class="product-img-card" style="${img.isPrimary ? 'border-color:var(--admin-gold);' : ''}">
        <img src="${img.url}" alt="${img.altText || 'Fragrance photo'}" onerror="this.src='/images/delice-01.jpg'">
        <div class="img-actions">
          <label style="font-size:0.7rem; color:${img.isPrimary ? 'var(--admin-gold)' : 'var(--admin-text-muted)'}; cursor:pointer; display:flex; align-items:center; gap:4px;">
            <input type="radio" name="primary_product_img" ${img.isPrimary ? 'checked' : ''} onchange="window.DeliceAdmin.setPrimaryProductImage(${idx})">
            ${img.isPrimary ? 'Primary' : 'Set Main'}
          </label>
          <button type="button" onclick="window.DeliceAdmin.deleteProductImage(${idx})" class="btn-text" style="color:var(--status-cancelled); font-size:0.75rem; padding:0 4px;" title="Remove image">&times; Delete</button>
        </div>
      </div>
    `).join('');
  }

  // ==========================================
  // 5. ORDERS VIEW
  // ==========================================
  async function loadOrders() {
    const search = document.getElementById('order-search-input')?.value || '';
    const status = document.getElementById('order-status-filter')?.value || '';
    const paymentStatus = document.getElementById('order-payment-filter')?.value || '';

    try {
      const res = await adminFetch(`/api/admin/orders?search=${encodeURIComponent(search)}&status=${status}&paymentStatus=${paymentStatus}`);
      const { orders, total } = await res.json();

      document.getElementById('orders-total-count').textContent = `${total} order(s) found`;

      const tbody = document.getElementById('orders-table-tbody');
      if (orders && orders.length > 0) {
        tbody.innerHTML = orders.map(o => `
          <tr>
            <td>
              <strong>${o.orderReference}</strong>
              <div style="font-size:0.75rem; color:var(--admin-text-muted);">${formatDateTime(o.createdAt)}</div>
            </td>
            <td>
              <strong>${o.customer.name}</strong>
              <div style="font-size:0.75rem; color:var(--admin-text-muted);">${o.customer.phone} • ${o.customer.district}</div>
            </td>
            <td>
              ${(o.items || []).map(i => `<div style="font-size:0.8rem;">${i.name} (${i.size}) × ${i.quantity}</div>`).join('')}
            </td>
            <td>
              <strong style="color:#fff;">${formatBDT(o.pricing.total)}</strong>
            </td>
            <td>
              <span class="badge badge-${o.payment.status}">${o.payment.status}</span>
              <div style="font-size:0.75rem; color:var(--admin-text-muted); margin-top:2px;">
                ${o.payment.method === 'bkash_manual' ? 'bKash Trx: ' + (o.payment.bkashTrxId || 'Pending') : 'Cash on Delivery'}
              </div>
            </td>
            <td>
              <span class="badge badge-${o.fulfillment.status}">${o.fulfillment.status}</span>
            </td>
            <td>
              <button onclick="window.DeliceAdmin.openOrderModal('${o.orderReference}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.75rem;">
                Manage Order
              </button>
            </td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--admin-text-muted);">No orders match the current criteria.</td></tr>`;
      }
    } catch (err) {
      console.error('Orders load error:', err);
    }
  }

  // ==========================================
  // 6. ANALYTICS & PRODUCT-WISE CONVERSION
  // ==========================================
  async function loadAnalytics() {
    const days = document.getElementById('analytics-days-filter')?.value || 7;
    try {
      const res = await adminFetch(`/api/admin/analytics?days=${days}`);
      const data = await res.json();

      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setTxt('analytics-visitors', data.visitors || 0);
      setTxt('analytics-pageviews', data.pageviews || 0);
      setTxt('analytics-total-addtocart', data.funnel?.addToBags || 0);
      setTxt('analytics-conv-rate', (data.funnel?.overallConversionRate || '0.0') + '%');

      // Funnel Details
      setTxt('funnel-p-views', data.funnel?.productViews || 0);
      setTxt('funnel-add-bag', data.funnel?.addToBags || 0);
      setTxt('funnel-checkout', data.funnel?.checkoutStarts || 0);
      setTxt('funnel-purchase', data.funnel?.purchases || 0);

      setTxt('funnel-cart-rate', `(${data.funnel?.cartRate || 0}% of views)`);
      setTxt('funnel-chk-rate', `(${data.funnel?.checkoutRate || 0}% of carts)`);
      setTxt('funnel-buy-rate', `(${data.funnel?.purchaseRate || 0}% of checkouts)`);

      // Product-wise Performance Table
      const perfTbody = document.getElementById('analytics-product-performance-tbody');
      const products = data.productPerformance || [];

      if (perfTbody) {
        if (products.length > 0) {
          perfTbody.innerHTML = products.map(p => `
            <tr>
              <td>
                <div style="display:flex; gap:10px; align-items:center;">
                  <img src="${p.image}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;background:#222;" onerror="this.src='/images/delice-01.jpg'">
                  <div>
                    <strong>${p.name}</strong>
                    <div style="font-size:0.75rem; color:var(--admin-text-muted);">${formatBDT(p.salePrice || p.price)}</div>
                  </div>
                </div>
              </td>
              <td><strong>${p.views}</strong> views</td>
              <td><strong style="color:var(--admin-gold);">${p.addToBag}</strong> adds</td>
              <td><strong>${p.unitsSold}</strong> bottles (${p.ordersCount} orders)</td>
              <td><strong style="color:#68D391;">${formatBDT(p.revenue)}</strong></td>
              <td>
                <span class="badge ${parseFloat(p.cartToBuyRate) > 15 ? 'badge-delivered' : 'badge-pending'}" style="font-size:0.8rem;">
                  ${p.cartToBuyRate}%
                </span>
              </td>
              <td>
                <span style="font-size:0.85rem; color:var(--admin-text-main);">
                  ${p.viewToBuyRate}%
                </span>
              </td>
            </tr>
          `).join('');
        } else {
          perfTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--admin-text-muted);">No product event telemetry recorded yet.</td></tr>`;
        }
      }

      // Districts
      const locContainer = document.getElementById('analytics-district-breakdown');
      if (locContainer) {
        if (data.locations && data.locations.length > 0) {
          locContainer.innerHTML = data.locations.map(loc => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--admin-border); font-size:0.85rem;">
              <span>📍 ${loc.district}</span>
              <strong>${loc.visitors} sessions</strong>
            </div>
          `).join('');
        } else {
          locContainer.innerHTML = `<p style="color:var(--admin-text-muted); font-size:0.85rem;">No district data yet.</p>`;
        }
      }

    } catch (err) {
      console.error('Analytics load error:', err);
    }
  }

  // ==========================================
  // 7. AUTO LAV GENERATOR (PROFIT ENGINE)
  // ==========================================
  function loadProfitCalculator() {
    // Populate product selector
    const sel = document.getElementById('profit-product-select');
    if (sel) {
      sel.innerHTML = `<option value="">-- Custom Calculation (or Select Product) --</option>` +
        cachedProducts.map(p => {
          const v = (p.variants && p.variants[0]) || { price: 500 };
          return `<option value="${p._id || p.id}" data-price="${v.salePrice || v.price}">${p.name} (${formatBDT(v.salePrice || v.price)})</option>`;
        }).join('');
    }

    calculateProfit();
    renderCatalogProfitMatrix();
  }

  function calculateProfit() {
    const P = parseFloat(document.getElementById('profit-price')?.value) || 0;
    const M = parseFloat(document.getElementById('profit-making')?.value) || 0;
    const S = parseFloat(document.getElementById('profit-savings')?.value) || 0;
    const C = parseFloat(document.getElementById('profit-charity')?.value) || 0;
    const EmpSal = parseFloat(document.getElementById('profit-emp-salary')?.value) || 0;
    const EmpCount = parseFloat(document.getElementById('profit-emp-count')?.value) || 0;
    const Pkg = parseFloat(document.getElementById('profit-packaging')?.value) || 0;

    const EmpTotal = EmpSal * EmpCount;
    document.getElementById('profit-emp-total-preview').textContent = `৳${EmpTotal.toLocaleString()} (${EmpCount} জন × ৳${EmpSal})`;

    const TotalDeductions = M + S + C + EmpTotal + Pkg;
    const NetProfit = P - TotalDeductions;
    const ProfitMargin = P > 0 ? ((NetProfit / P) * 100).toFixed(1) : '0.0';

    // Update KPI results
    const netEl = document.getElementById('profit-result-net');
    netEl.textContent = formatBDT(NetProfit);
    netEl.style.color = NetProfit >= 0 ? '#68D391' : '#FC8181';

    document.getElementById('profit-result-margin').textContent = `Margin: ${ProfitMargin}%`;
    document.getElementById('profit-result-deductions').textContent = formatBDT(TotalDeductions);

    // Update Visual Breakdown Bar & Legend
    if (P > 0) {
      const pM = Math.max(1, ((M / P) * 100));
      const pS = Math.max(1, ((S / P) * 100));
      const pC = Math.max(0.5, ((C / P) * 100));
      const pStaff = Math.max(1, ((EmpTotal / P) * 100));
      const pProf = Math.max(0, ((Math.max(0, NetProfit) / P) * 100));

      document.getElementById('bar-making').style.width = `${pM}%`;
      document.getElementById('bar-making').textContent = `${pM.toFixed(0)}%`;

      document.getElementById('bar-savings').style.width = `${pS}%`;
      document.getElementById('bar-savings').textContent = `${pS.toFixed(0)}%`;

      document.getElementById('bar-charity').style.width = `${pC}%`;
      document.getElementById('bar-charity').textContent = `${pC.toFixed(0)}%`;

      document.getElementById('bar-staff').style.width = `${pStaff}%`;
      document.getElementById('bar-staff').textContent = `${pStaff.toFixed(0)}%`;

      document.getElementById('bar-profit').style.width = `${pProf}%`;
      document.getElementById('bar-profit').textContent = `${pProf.toFixed(0)}%`;
    }

    document.getElementById('legend-making').textContent = formatBDT(M);
    document.getElementById('legend-savings').textContent = formatBDT(S);
    document.getElementById('legend-charity').textContent = formatBDT(C);
    document.getElementById('legend-staff').textContent = formatBDT(EmpTotal);
    document.getElementById('legend-profit').textContent = formatBDT(NetProfit);

    // Update Monthly Volume Simulator
    const volume = parseInt(document.getElementById('sim-volume-range')?.value || 100, 10);
    updateMonthlySim(volume, { P, M, S, C, EmpTotal, NetProfit, EmpCount });
  }

  function updateMonthlySim(volume, overrides = null) {
    const P = overrides ? overrides.P : (parseFloat(document.getElementById('profit-price')?.value) || 0);
    const M = overrides ? overrides.M : (parseFloat(document.getElementById('profit-making')?.value) || 0);
    const S = overrides ? overrides.S : (parseFloat(document.getElementById('profit-savings')?.value) || 0);
    const C = overrides ? overrides.C : (parseFloat(document.getElementById('profit-charity')?.value) || 0);
    const EmpSal = parseFloat(document.getElementById('profit-emp-salary')?.value) || 0;
    const EmpCount = parseFloat(document.getElementById('profit-emp-count')?.value) || 0;
    const EmpTotal = EmpSal * EmpCount;
    const NetProfit = P - (M + S + C + EmpTotal);

    document.getElementById('sim-volume-badge').textContent = volume;

    document.getElementById('sim-total-turnover').textContent = formatBDT(P * volume);
    document.getElementById('sim-total-making').textContent = formatBDT(M * volume);
    document.getElementById('sim-total-savings').textContent = formatBDT(S * volume);
    document.getElementById('sim-total-charity').textContent = formatBDT(C * volume);
    document.getElementById('sim-total-staff').textContent = `${formatBDT(EmpTotal * volume)} (প্রতিজন ${formatBDT((EmpTotal * volume) / (EmpCount || 1))})`;
    document.getElementById('sim-total-profit').textContent = formatBDT(NetProfit * volume);
  }

  function renderCatalogProfitMatrix() {
    const tbody = document.getElementById('profit-catalog-matrix-tbody');
    if (!tbody) return;

    if (!cachedProducts || cachedProducts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--admin-text-muted);">No products in catalog.</td></tr>`;
      return;
    }

    tbody.innerHTML = cachedProducts.map(p => {
      const v = (p.variants && p.variants[0]) || { price: 500, salePrice: null };
      const selling = v.salePrice || v.price;
      // Formula based on 50% making, 10% emergency, 1% charity, 16% staff payroll (80 / 500)
      const estMaking = Math.round(selling * 0.50);
      const estSavings = Math.round(selling * 0.10);
      const estCharity = Math.round(selling * 0.01);
      const estStaff = Math.round(selling * 0.16);
      const estDeductions = estMaking + estSavings + estCharity + estStaff;
      const estNetProfit = selling - estDeductions;
      const margin = ((estNetProfit / selling) * 100).toFixed(1);

      return `
        <tr>
          <td>
            <strong>${p.name}</strong>
            <div style="font-size:0.75rem; color:var(--admin-text-muted);">${v.size || '100ml'}</div>
          </td>
          <td><strong style="color:#fff;">${formatBDT(selling)}</strong></td>
          <td>${formatBDT(estMaking)}</td>
          <td>${formatBDT(estSavings + estCharity + estStaff)}</td>
          <td><strong style="color:#68D391;">${formatBDT(estNetProfit)}</strong></td>
          <td><span class="badge badge-delivered">${margin}%</span></td>
          <td>
            <button onclick="window.DeliceAdmin.loadProductIntoCalculator('${p._id || p.id}')" class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem;">
              Calculate &rarr;
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // EXPOSE GLOBAL ACTIONS FOR UI
  // ==========================================
  window.DeliceAdmin = {
    showToast: showAdminToast,
    switchTab,

    // Hero Section Actions
    addNewHeroSlide: async () => {
      const fileInput = document.getElementById('hero-slide-file-input');
      const urlInput = document.getElementById('hero-slide-url-input');
      const titleInput = document.getElementById('hero-slide-title-input');
      const linkInput = document.getElementById('hero-slide-link-input');

      let imageUrl = urlInput.value.trim();

      if (fileInput.files && fileInput.files[0]) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('altText', titleInput.value.trim() || 'Hero Slide');

        try {
          showAdminToast('Uploading slide image...');
          const uploadRes = await adminFetch('/api/admin/media/upload', {
            method: 'POST',
            body: formData
          });
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } catch (e) {
          showAdminToast('Could not upload image: ' + e.message, true);
          return;
        }
      }

      if (!imageUrl) {
        showAdminToast('Please upload an image file or enter an image URL.', true);
        return;
      }

      if (!cachedHomepage.hero.slides) cachedHomepage.hero.slides = [];

      cachedHomepage.hero.slides.push({
        id: 'slide_' + Date.now(),
        imageUrl,
        title: titleInput.value.trim(),
        subtitle: document.getElementById('edit-hero-desc')?.value.trim() || '',
        link: linkInput.value.trim() || '#collection'
      });

      renderHeroSlides();
      fileInput.value = '';
      urlInput.value = '';
      titleInput.value = '';
      linkInput.value = '';
      showAdminToast('New slide added. Click "Publish Live" to show on the main page.');
    },

    deleteHeroSlide: (idx) => {
      if (!confirm('Remove this slide from the slideshow?')) return;
      cachedHomepage.hero.slides.splice(idx, 1);
      renderHeroSlides();
      showAdminToast('Slide removed.');
    },

    saveHeroDraft: async () => {
      const draftData = Object.assign({}, cachedHomepage, {
        hero: {
          ...(cachedHomepage?.hero || {}),
          headline: document.getElementById('edit-hero-headline').value.trim(),
          description: document.getElementById('edit-hero-desc').value.trim(),
          ctaText: document.getElementById('edit-hero-cta-text').value.trim(),
          ctaLink: document.getElementById('edit-hero-cta-link').value.trim(),
          slides: cachedHomepage?.hero?.slides || []
        }
      });
      delete draftData._id;
      delete draftData.__v;

      try {
        await adminFetch('/api/admin/homepage/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draftData)
        });
        showAdminToast('Hero slideshow draft saved successfully.');
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    publishHeroLive: async () => {
      try {
        await window.DeliceAdmin.saveHeroDraft();
        await adminFetch('/api/admin/homepage/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: 'Updated Hero Slideshow' })
        });
        showAdminToast('Hero section & slideshow published live to the main page!');
        loadHeroEditor();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Product Modal & Multi-Image Manager
    openCreateProductModal: () => {
      document.getElementById('product-modal-title').textContent = '+ Add New Fragrance Edition';
      document.getElementById('edit-prod-id').value = '';
      document.getElementById('edit-prod-name').value = '';
      document.getElementById('edit-prod-sku').value = '';
      document.getElementById('edit-prod-family').value = 'Fresh Woody';
      document.getElementById('edit-prod-status').value = 'published';
      document.getElementById('edit-prod-size').value = '100ml';
      document.getElementById('edit-prod-price').value = '12500';
      document.getElementById('edit-prod-sale-price').value = '';
      document.getElementById('edit-prod-stock').value = '15';
      document.getElementById('edit-prod-short-desc').value = '';
      document.getElementById('edit-prod-full-desc').value = '';
      document.getElementById('edit-prod-notes-top').value = 'Bergamot, Coriander';
      document.getElementById('edit-prod-notes-heart').value = 'Atlas Cedarwood, Lavender';
      document.getElementById('edit-prod-notes-base').value = 'Vetiver, White Musk';
      document.getElementById('delete-product-btn').style.display = 'none';

      currentModalProductImages = [];
      renderProductModalImages();
      document.getElementById('product-modal').classList.add('active');
    },

    openEditProductModal: (id) => {
      const p = cachedProducts.find(item => (item._id || item.id) === id || String(item._id) === String(id));
      if (!p) return;

      document.getElementById('product-modal-title').textContent = `Edit — ${p.name}`;
      document.getElementById('edit-prod-id').value = p._id || p.id;
      document.getElementById('edit-prod-name').value = p.name || '';
      document.getElementById('edit-prod-sku').value = p.sku || '';
      document.getElementById('edit-prod-family').value = p.scentFamily || '';
      document.getElementById('edit-prod-status').value = p.status || 'published';

      const v = (p.variants && p.variants[0]) || {};
      document.getElementById('edit-prod-size').value = v.size || '100ml';
      document.getElementById('edit-prod-price').value = v.price || '';
      document.getElementById('edit-prod-sale-price').value = v.salePrice || '';
      document.getElementById('edit-prod-stock').value = (typeof v.stock === 'number') ? v.stock : 15;

      document.getElementById('edit-prod-short-desc').value = p.shortDescription || '';
      document.getElementById('edit-prod-full-desc').value = p.fullDescription || '';

      const notes = p.scentNotes || {};
      document.getElementById('edit-prod-notes-top').value = (notes.top || []).join(', ');
      document.getElementById('edit-prod-notes-heart').value = (notes.heart || []).join(', ');
      document.getElementById('edit-prod-notes-base').value = (notes.base || []).join(', ');

      document.getElementById('delete-product-btn').style.display = 'block';

      currentModalProductImages = (p.images && p.images.length > 0)
        ? JSON.parse(JSON.stringify(p.images))
        : [];

      renderProductModalImages();
      document.getElementById('product-modal').classList.add('active');
    },

    handleProductFilesUpload: async (fileInput) => {
      const files = Array.from(fileInput.files || []);
      if (files.length === 0) return;

      if (currentModalProductImages.length + files.length > 6) {
        showAdminToast('You can upload up to 5 images per product.', true);
      }

      for (const file of files.slice(0, 5 - currentModalProductImages.length)) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('altText', file.name);

        try {
          showAdminToast(`Uploading ${file.name}...`);
          const res = await adminFetch('/api/admin/media/upload', {
            method: 'POST',
            body: formData
          });
          const media = await res.json();
          currentModalProductImages.push({
            id: 'img_' + Date.now() + Math.random().toString(36).substr(2, 5),
            url: media.url,
            thumbnailUrl: media.thumbnailUrl || media.url,
            altText: file.name,
            isPrimary: currentModalProductImages.length === 0
          });
        } catch (e) {
          showAdminToast('Upload failed: ' + e.message, true);
        }
      }

      fileInput.value = '';
      renderProductModalImages();
      showAdminToast('Images uploaded to product gallery.');
    },

    addProductImageByUrl: () => {
      const urlInput = document.getElementById('edit-prod-image-url-input');
      const url = urlInput.value.trim();
      if (!url) return;

      if (currentModalProductImages.length >= 5) {
        showAdminToast('Maximum 5 images allowed per product.', true);
        return;
      }

      currentModalProductImages.push({
        id: 'img_' + Date.now(),
        url,
        altText: 'Product photo',
        isPrimary: currentModalProductImages.length === 0
      });

      urlInput.value = '';
      renderProductModalImages();
    },

    setPrimaryProductImage: (index) => {
      currentModalProductImages.forEach((img, idx) => {
        img.isPrimary = (idx === index);
      });
      renderProductModalImages();
    },

    deleteProductImage: (index) => {
      currentModalProductImages.splice(index, 1);
      if (currentModalProductImages.length > 0 && !currentModalProductImages.some(i => i.isPrimary)) {
        currentModalProductImages[0].isPrimary = true;
      }
      renderProductModalImages();
    },

    saveProduct: async () => {
      const pId = document.getElementById('edit-prod-id').value;
      const name = document.getElementById('edit-prod-name').value.trim();
      const sku = document.getElementById('edit-prod-sku').value.trim();
      const scentFamily = document.getElementById('edit-prod-family').value.trim();
      const status = document.getElementById('edit-prod-status').value;
      const size = document.getElementById('edit-prod-size').value.trim() || '100ml';
      const price = parseFloat(document.getElementById('edit-prod-price').value);
      const salePriceRaw = document.getElementById('edit-prod-sale-price').value.trim();
      const salePrice = salePriceRaw ? parseFloat(salePriceRaw) : null;
      const stock = parseInt(document.getElementById('edit-prod-stock').value, 10) || 0;
      const shortDesc = document.getElementById('edit-prod-short-desc').value.trim();
      const fullDesc = document.getElementById('edit-prod-full-desc').value.trim() || shortDesc;

      if (!name || !sku || !scentFamily || isNaN(price)) {
        showAdminToast('Please fill in Name, SKU, Scent Family, and Regular Price.', true);
        return;
      }

      const topNotes = document.getElementById('edit-prod-notes-top').value.split(',').map(s => s.trim()).filter(Boolean);
      const heartNotes = document.getElementById('edit-prod-notes-heart').value.split(',').map(s => s.trim()).filter(Boolean);
      const baseNotes = document.getElementById('edit-prod-notes-base').value.split(',').map(s => s.trim()).filter(Boolean);

      const cleanedImages = (currentModalProductImages.length > 0 ? currentModalProductImages : [{
        id: 'img_' + Date.now(),
        url: '/images/delice-01.jpg',
        altText: name,
        isPrimary: true
      }]).map((img, i) => ({
        id: String(img.id || ('img_' + Date.now() + '_' + i)),
        url: String(img.url || '/images/delice-01.jpg'),
        thumbnailUrl: img.thumbnailUrl || img.url || '/images/delice-01.jpg',
        altText: img.altText || name,
        isPrimary: Boolean(img.isPrimary !== undefined ? img.isPrimary : i === 0),
        order: typeof img.order === 'number' ? img.order : i
      }));

      if (!cleanedImages.some(img => img.isPrimary)) {
        cleanedImages[0].isPrimary = true;
      }

      let productVariants = [
        {
          size,
          volumeMl: parseInt(size, 10) || 100,
          price,
          salePrice,
          stock,
          sku: `${sku}-${size}`.toUpperCase()
        }
      ];

      if (pId) {
        const existingProduct = cachedProducts.find(item => (item._id || item.id) === pId || String(item._id) === String(pId));
        if (existingProduct && Array.isArray(existingProduct.variants) && existingProduct.variants.length > 1) {
          const otherVariants = existingProduct.variants.filter(v => v.size !== size);
          productVariants = [productVariants[0], ...otherVariants];
        }
      }

      const productPayload = {
        name,
        sku,
        scentFamily,
        status,
        shortDescription: shortDesc,
        fullDescription: fullDesc,
        scentNotes: {
          top: topNotes,
          heart: heartNotes,
          base: baseNotes
        },
        images: cleanedImages,
        variants: productVariants
      };

      try {
        if (pId) {
          // Update product
          await adminFetch(`/api/admin/products/${pId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productPayload)
          });
          showAdminToast(`"${name}" updated successfully.`);
        } else {
          // Create product
          await adminFetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productPayload)
          });
          showAdminToast(`New fragrance "${name}" added to catalog.`);
        }

        document.getElementById('product-modal').classList.remove('active');
        loadProducts();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    deleteCurrentProduct: async () => {
      const pId = document.getElementById('edit-prod-id').value;
      const name = document.getElementById('edit-prod-name').value;
      if (!pId) return;

      if (!confirm(`Are you sure you want to delete "${name}" permanently? This cannot be undone.`)) {
        return;
      }

      try {
        await adminFetch(`/api/admin/products/${pId}`, { method: 'DELETE' });
        showAdminToast(`"${name}" has been deleted.`);
        document.getElementById('product-modal').classList.remove('active');
        loadProducts();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    quickDeleteProduct: async (id, name) => {
      if (!confirm(`Delete fragrance "${name}" permanently?`)) return;
      try {
        await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
        showAdminToast(`"${name}" deleted.`);
        loadProducts();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Stock Adjustment Modal
    openStockModal: (productId) => {
      const p = cachedProducts.find(i => (i._id || i.id) === productId || String(i._id) === String(productId));
      if (!p) return;

      document.getElementById('stock-modal-title').textContent = `Adjust Stock — ${p.name}`;
      document.getElementById('stock-modal-product-id').value = p._id || p.id;

      const select = document.getElementById('stock-modal-variant-select');
      select.innerHTML = (p.variants || []).map(v => `
        <option value="${v.size}" data-stock="${v.stock}">${v.size} (Current: ${v.stock})</option>
      `).join('');

      const updateQtyInput = () => {
        const selectedOpt = select.options[select.selectedIndex];
        const stock = selectedOpt ? selectedOpt.getAttribute('data-stock') : (p.variants && p.variants[0] ? p.variants[0].stock : 0);
        document.getElementById('stock-modal-new-qty').value = stock;
      };

      select.onchange = updateQtyInput;
      updateQtyInput();

      document.getElementById('stock-modal-reason').value = '';
      document.getElementById('stock-modal').classList.add('active');
    },

    saveStockAdjustment: async () => {
      const pId = document.getElementById('stock-modal-product-id').value;
      const size = document.getElementById('stock-modal-variant-select').value;
      const newStock = parseInt(document.getElementById('stock-modal-new-qty').value, 10);
      let reason = document.getElementById('stock-modal-reason').value.trim();

      if (isNaN(newStock) || newStock < 0) {
        showAdminToast('Please provide a valid stock quantity.', true);
        return;
      }

      if (!reason) {
        reason = 'Admin stock adjustment';
      }

      try {
        await adminFetch(`/api/admin/products/${pId}/adjust-stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantSize: size, newStock, reason })
        });
        showAdminToast('Stock updated successfully.');
        document.getElementById('stock-modal').classList.remove('active');
        loadProducts();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Orders Modal
    openOrderModal: async (orderReference) => {
      try {
        const res = await adminFetch(`/api/admin/orders/${orderReference}`);
        const order = await res.json();

        document.getElementById('order-modal-title').textContent = `Order ${order.orderReference}`;
        document.getElementById('order-modal-ref').value = order.orderReference;

        document.getElementById('order-modal-customer').innerHTML = `
          <strong>${order.customer.name}</strong><br>
          Phone: ${order.customer.phone}<br>
          Email: ${order.customer.email || 'None'}<br>
          Delivery Address: ${order.customer.fullAddress}, ${order.customer.area || ''}, ${order.customer.district}
        `;

        document.getElementById('order-modal-items').innerHTML = (order.items || []).map(i => `
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.875rem;">
            <span>${i.name} (${i.size}) × ${i.quantity}</span>
            <span>${formatBDT(i.subtotal)}</span>
          </div>
        `).join('');

        document.getElementById('order-modal-total').textContent = formatBDT(order.pricing.total);

        document.getElementById('order-fulfillment-select').value = order.fulfillment.status;
        document.getElementById('order-courier-name').value = order.fulfillment.courierName || '';
        document.getElementById('order-tracking-num').value = order.fulfillment.trackingNumber || '';

        document.getElementById('order-payment-select').value = order.payment.status;
        document.getElementById('order-payment-method-desc').textContent = `Payment Method: ${order.payment.method === 'bkash_manual' ? 'Manual bKash (Sender: ' + (order.payment.bkashSenderNumber || 'None') + ', TrxID: ' + (order.payment.bkashTrxId || 'None') + ')' : 'Cash on Delivery'}`;

        document.getElementById('order-modal-notes').value = order.internalNotes || '';
        document.getElementById('order-modal').classList.add('active');
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    saveOrderChanges: async () => {
      const ref = document.getElementById('order-modal-ref').value;
      const fulfillmentStatus = document.getElementById('order-fulfillment-select').value;
      const courierName = document.getElementById('order-courier-name').value.trim();
      const trackingNumber = document.getElementById('order-tracking-num').value.trim();
      const paymentStatus = document.getElementById('order-payment-select').value;
      const internalNote = document.getElementById('order-modal-notes').value.trim();

      try {
        await adminFetch(`/api/admin/orders/${ref}/fulfillment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: fulfillmentStatus, courierName, trackingNumber })
        });

        await adminFetch(`/api/admin/orders/${ref}/payment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: paymentStatus })
        });

        if (internalNote) {
          await adminFetch(`/api/admin/orders/${ref}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: internalNote })
          });
        }

        showAdminToast('Order records updated successfully.');
        document.getElementById('order-modal').classList.remove('active');
        loadOrders();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Profit Calculator Actions
    calculateProfit,
    updateMonthlySim,

    onProfitProductSelect: (prodId) => {
      if (!prodId) {
        window.DeliceAdmin.resetProfitDefaults();
        return;
      }
      const p = cachedProducts.find(i => (i._id || i.id) === prodId);
      if (!p) return;

      const v = (p.variants && p.variants[0]) || { price: 500 };
      const price = v.salePrice || v.price;

      document.getElementById('profit-price').value = price;
      // Proportional production cost (approx 50% for perfume crafting)
      document.getElementById('profit-making').value = Math.round(price * 0.5);
      document.getElementById('profit-savings').value = Math.round(price * 0.1);
      document.getElementById('profit-charity').value = Math.max(5, Math.round(price * 0.01));
      calculateProfit();
    },

    loadProductIntoCalculator: (prodId) => {
      document.getElementById('profit-product-select').value = prodId;
      window.DeliceAdmin.onProfitProductSelect(prodId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    resetProfitDefaults: () => {
      document.getElementById('profit-price').value = 500;
      document.getElementById('profit-making').value = 250;
      document.getElementById('profit-savings').value = 50;
      document.getElementById('profit-charity').value = 5;
      document.getElementById('profit-emp-salary').value = 20;
      document.getElementById('profit-emp-count').value = 4;
      document.getElementById('profit-packaging').value = 0;
      document.getElementById('profit-product-select').value = '';
      calculateProfit();
    },

    // Settings Modal
    openSettingsModal: () => {
      document.getElementById('settings-modal').classList.add('active');
    },

    changeAdminPassword: async () => {
      const curr = document.getElementById('pw-curr').value;
      const next = document.getElementById('pw-next').value;

      if (!curr || !next) {
        showAdminToast('Please fill in current and new password.', true);
        return;
      }

      try {
        const res = await adminFetch('/api/admin/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: curr, newPassword: next })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAdminToast('Admin password updated successfully.');
        document.getElementById('pw-curr').value = '';
        document.getElementById('pw-next').value = '';
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Navigation and Tab View Loaders
    switchTab,
    loadDashboard,
    loadHeroEditor,
    loadProducts,
    loadOrders,
    loadAnalytics,
    loadProfitCalculator
  };

  // Global aliases for legacy/inline event triggers
  window.loadOrders = loadOrders;
  window.loadAnalytics = loadAnalytics;
  window.loadDashboard = loadDashboard;
  window.loadProducts = loadProducts;

  // Launch on DOM Ready
  document.addEventListener('DOMContentLoaded', initAdmin);
})();
