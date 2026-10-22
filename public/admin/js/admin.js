/**
 * DÉLICE — Luxury Concierge Administration Panel
 * Vanilla JavaScript SPA Engine (No external frameworks)
 */

(function () {
  'use strict';

  let currentAdmin = null;
  let csrfToken = null;
  let activeTab = 'dashboard';
  let cachedHomepage = null;
  let cachedProducts = [];
  let cachedMedia = [];

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
    return new Date(d).toLocaleString('en-US', {
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
    toast.style.cssText = `background:#222;color:#FFF;padding:12px 20px;border-radius:4px;font-size:0.875rem;border-left:4px solid ${isError ? '#C53030' : '#C5A880'};box-shadow:0 8px 24px rgba(0,0,0,0.5);`;
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
      case 'homepage': loadHomepageEditor(); break;
      case 'products': loadProducts(); break;
      case 'media': loadMediaLibrary(); break;
      case 'orders': loadOrders(); break;
      case 'analytics': loadAnalytics(); break;
      case 'referrals': loadReferrals(); break;
      case 'settings': loadSettings(); break;
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

      document.getElementById('metric-total-orders').textContent = metrics.totalOrders;
      document.getElementById('metric-net-sales').textContent = formatBDT(metrics.deliveredNetSales);
      document.getElementById('metric-pending-orders').textContent = metrics.pendingOrdersCount;
      document.getElementById('metric-low-stock').textContent = metrics.lowStockCount;

      document.getElementById('metric-visitors').textContent = metrics.analytics.visitors;
      document.getElementById('metric-pageviews').textContent = metrics.analytics.pageviews;

      // Render recent orders
      const tbody = document.getElementById('dashboard-recent-orders-tbody');
      if (recentOrders && recentOrders.length > 0) {
        tbody.innerHTML = recentOrders.map(o => `
          <tr>
            <td><strong>${o.orderReference}</strong></td>
            <td>${o.customer.name}<br><small style="color:var(--admin-text-muted);">${o.customer.district}</small></td>
            <td>${formatBDT(o.pricing.total)}</td>
            <td><span class="badge badge-${o.payment.status}">${o.payment.status}</span></td>
            <td><span class="badge badge-${o.fulfillment.status}">${o.fulfillment.status}</span></td>
            <td>${formatDate(o.createdAt)}</td>
            <td>
              <button onclick="window.DeliceAdmin.openOrderModal('${o.orderReference}')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.75rem;">View</button>
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
          <strong style="color:#F6AD55;">Low Stock Notice:</strong> ${metrics.lowStockItems.map(i => `${i.productName} (${i.size}): ${i.stock} left`).join(' • ')}
        `;
      } else {
        lowStockBox.style.display = 'none';
      }

    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }

  // ==========================================
  // 3. HOMEPAGE EDITOR VIEW
  // ==========================================
  async function loadHomepageEditor() {
    try {
      const res = await adminFetch('/api/admin/homepage');
      const { published, draft, revisions, products } = await res.json();
      cachedHomepage = draft || published;
      cachedProducts = products;

      // Populate Inputs with Draft/Published Data
      const hp = cachedHomepage;

      // Announcement Bar
      document.getElementById('edit-announcement-enabled').checked = hp.announcementBar?.enabled ?? true;
      document.getElementById('edit-announcement-text').value = hp.announcementBar?.text || '';
      document.getElementById('edit-announcement-link').value = hp.announcementBar?.linkUrl || '#collection';

      // Hero
      document.getElementById('edit-hero-headline').value = hp.hero?.headline || '';
      document.getElementById('edit-hero-desc').value = hp.hero?.description || '';
      document.getElementById('edit-hero-cta-text').value = hp.hero?.ctaText || '';
      document.getElementById('edit-hero-cta-link').value = hp.hero?.ctaLink || '';
      document.getElementById('edit-hero-desktop-img').value = hp.hero?.desktopImageUrl || '';
      document.getElementById('edit-hero-mobile-img').value = hp.hero?.mobileImageUrl || '';
      document.getElementById('edit-hero-focal-x').value = hp.hero?.focalPoint?.x ?? 50;
      document.getElementById('edit-hero-focal-y').value = hp.hero?.focalPoint?.y ?? 50;
      document.getElementById('focal-x-val').textContent = (hp.hero?.focalPoint?.x ?? 50) + '%';
      document.getElementById('focal-y-val').textContent = (hp.hero?.focalPoint?.y ?? 50) + '%';

      // Brand Story
      document.getElementById('edit-story-title').value = hp.brandStory?.title || '';
      document.getElementById('edit-story-subtitle').value = hp.brandStory?.subtitle || '';
      document.getElementById('edit-story-p1').value = hp.brandStory?.paragraph1 || '';
      document.getElementById('edit-story-p2').value = hp.brandStory?.paragraph2 || '';
      document.getElementById('edit-story-img').value = hp.brandStory?.imageUrl || '';

      // Customer Experiences
      document.getElementById('edit-exp-enabled').checked = hp.customerExperiences?.enabled ?? false;
      renderExperiencesList(hp.customerExperiences?.items || []);

      // Section Visibility
      document.getElementById('vis-hero').checked = hp.sectionVisibility?.hero ?? true;
      document.getElementById('vis-collection').checked = hp.sectionVisibility?.collection ?? true;
      document.getElementById('vis-story').checked = hp.sectionVisibility?.story ?? true;
      document.getElementById('vis-experiences').checked = hp.sectionVisibility?.experiences ?? false;

      // Revisions History
      const revContainer = document.getElementById('homepage-revisions-list');
      if (revisions && revisions.length > 0) {
        revContainer.innerHTML = revisions.map(r => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--admin-border);">
            <div>
              <strong>${formatDateTime(r.createdAt)}</strong>
              <div style="font-size:0.8rem; color:var(--admin-text-muted);">${r.note || 'Published version'} (by ${r.adminUsername})</div>
            </div>
            <button onclick="window.DeliceAdmin.restoreRevision('${r.revisionId}')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.75rem;">Restore</button>
          </div>
        `).join('');
      } else {
        revContainer.innerHTML = `<p style="color:var(--admin-text-muted); font-size:0.85rem; padding:12px;">No archived revisions recorded yet.</p>`;
      }

    } catch (err) {
      console.error('Failed to load homepage editor:', err);
    }
  }

  function renderExperiencesList(items) {
    const container = document.getElementById('experiences-admin-items');
    if (!items || items.length === 0) {
      container.innerHTML = `<p style="font-size:0.85rem; color:var(--admin-text-muted); padding:10px 0;">No patron quotes added. (Section hidden on storefront until genuine reviews are approved).</p>`;
      return;
    }

    container.innerHTML = items.map((item, idx) => `
      <div style="background:#242424; padding:16px; border-radius:4px; margin-bottom:12px; border:1px solid var(--admin-border);">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <strong>${item.customerName} (${item.location || 'Bangladesh'})</strong>
          <label style="font-size:0.75rem; color:var(--admin-gold);">
            <input type="checkbox" ${item.approved ? 'checked' : ''} onchange="window.DeliceAdmin.toggleReviewApproval(${idx}, this.checked)"> Approved
          </label>
        </div>
        <p style="font-size:0.875rem; font-style:italic; color:#CCC;">“${item.quote}”</p>
      </div>
    `).join('');
  }

  // ==========================================
  // 4. PRODUCTS & STOCK
  // ==========================================
  async function loadProducts() {
    try {
      const res = await adminFetch('/api/admin/products');
      const products = await res.json();
      cachedProducts = products;

      const tbody = document.getElementById('products-table-tbody');
      if (products && products.length > 0) {
        tbody.innerHTML = products.map(p => {
          const v = (p.variants || [])[0] || { price: 0, stock: 0, size: '50ml' };
          const totalStock = (p.variants || []).reduce((sum, item) => sum + item.stock, 0);
          const isDraft = p.status === 'draft';

          return `
            <tr>
              <td>
                <div style="display:flex; gap:12px; align-items:center;">
                  <img src="${(p.images && p.images[0]) ? p.images[0].url : '/images/delice-01.jpg'}" style="width:48px;height:48px;border-radius:3px;object-fit:cover;">
                  <div>
                    <strong>${p.name}</strong>
                    <div style="font-size:0.75rem; color:var(--admin-text-muted);">${p.scentFamily} • SKU: ${p.sku}</div>
                  </div>
                </div>
              </td>
              <td>
                ${(p.variants || []).map(varItem => `
                  <div style="font-size:0.8rem;">${varItem.size}: ${formatBDT(varItem.price)} (${varItem.stock} in stock)</div>
                `).join('')}
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
                  ${isDraft ? `
                    <button onclick="window.DeliceAdmin.quickPublishProduct('${p._id}')" class="btn btn-gold" style="padding:6px 10px; font-size:0.75rem;">
                      Publish Live
                    </button>
                  ` : ''}
                  <button onclick="window.DeliceAdmin.openStockModal('${p._id}')" class="btn btn-secondary" style="padding:6px 10px; font-size:0.75rem;">
                    Adjust Stock
                  </button>
                  <button onclick="window.DeliceAdmin.openEditProductModal('${p._id}')" class="btn btn-secondary" style="padding:6px 10px; font-size:0.75rem;">
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px;">No products found.</td></tr>`;
      }
    } catch (err) {
      console.error('Products load error:', err);
    }
  }

  // ==========================================
  // 5. MEDIA LIBRARY
  // ==========================================
  async function loadMediaLibrary() {
    try {
      const res = await adminFetch('/api/admin/media');
      const media = await res.json();
      cachedMedia = media;

      const grid = document.getElementById('media-library-grid');
      if (media && media.length > 0) {
        grid.innerHTML = media.map(m => `
          <div style="background:#242424; border:1px solid var(--admin-border); border-radius:4px; overflow:hidden;">
            <div style="aspect-ratio:1/1; overflow:hidden; background:#111;">
              <img src="${m.thumbnailUrl || m.url}" alt="${m.altText || m.filename}" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div style="padding:12px;">
              <strong style="display:block; font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.originalName}</strong>
              <div style="font-size:0.75rem; color:var(--admin-text-muted); margin-top:2px;">
                ${m.dimensions?.width || '—'}×${m.dimensions?.height || '—'} • ${(m.sizeBytes / 1024).toFixed(0)} KB
              </div>
              <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                <button onclick="navigator.clipboard.writeText('${m.url}'); window.DeliceAdmin.showToast('Image URL copied to clipboard');" class="btn btn-secondary" style="padding:4px 8px; font-size:0.7rem;">Copy URL</button>
                <button onclick="window.DeliceAdmin.deleteMediaAsset('${m.filename}')" class="btn-text" style="color:var(--status-cancelled); font-size:0.75rem;">Delete</button>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        grid.innerHTML = `<p style="color:var(--admin-text-muted); padding:32px; grid-column:1/-1; text-align:center;">No media assets uploaded yet.</p>`;
      }
    } catch (err) {
      console.error('Media load error:', err);
    }
  }

  // ==========================================
  // 6. ORDERS VIEW
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
              ${o.items.map(i => `<div style="font-size:0.8rem;">${i.name} (${i.size}) × ${i.quantity}</div>`).join('')}
            </td>
            <td>
              <strong>${formatBDT(o.pricing.total)}</strong>
              ${o.referral?.code ? `<div style="font-size:0.7rem; color:var(--admin-gold);">Ref: ${o.referral.code}</div>` : ''}
            </td>
            <td>
              <span class="badge badge-${o.payment.status}">${o.payment.status}</span>
              <div style="font-size:0.75rem; color:var(--admin-text-muted); margin-top:2px;">
                ${o.payment.method === 'bkash_manual' ? 'bKash Trx: ' + (o.payment.bkashTrxId || 'None') : 'COD'}
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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--admin-text-muted);">No orders match the current filters.</td></tr>`;
      }
    } catch (err) {
      console.error('Orders load error:', err);
    }
  }

  // ==========================================
  // 7. ANALYTICS & VISITOR MAP
  // ==========================================
  async function loadAnalytics() {
    const days = document.getElementById('analytics-days-filter')?.value || 7;
    try {
      const res = await adminFetch(`/api/admin/analytics?days=${days}`);
      const data = await res.json();

      document.getElementById('analytics-visitors').textContent = data.visitors;
      document.getElementById('analytics-pageviews').textContent = data.pageviews;
      document.getElementById('analytics-conv-rate').textContent = data.funnel.overallConversionRate + '%';

      // Devices
      const dev = data.devices || {};
      document.getElementById('analytics-devices').textContent = `Mobile: ${dev.mobile || 0} • Desktop: ${dev.desktop || 0} • Tablet: ${dev.tablet || 0}`;

      // Funnel
      document.getElementById('funnel-p-views').textContent = data.funnel.productViews;
      document.getElementById('funnel-add-bag').textContent = data.funnel.addToBags;
      document.getElementById('funnel-checkout').textContent = data.funnel.checkoutStarts;
      document.getElementById('funnel-purchase').textContent = data.funnel.purchases;

      document.getElementById('funnel-cart-rate').textContent = `${data.funnel.cartRate}% rate`;
      document.getElementById('funnel-chk-rate').textContent = `${data.funnel.checkoutRate}% rate`;
      document.getElementById('funnel-buy-rate').textContent = `${data.funnel.purchaseRate}% rate`;

      // Top Products
      const prodList = document.getElementById('analytics-top-products');
      if (data.topProducts && data.topProducts.length > 0) {
        prodList.innerHTML = data.topProducts.map(p => `
          <li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--admin-border); font-size:0.875rem;">
            <span>${p.name}</span>
            <strong>${p.count} views</strong>
          </li>
        `).join('');
      } else {
        prodList.innerHTML = `<li style="color:var(--admin-text-muted); font-size:0.85rem; padding:8px 0;">No product telemetry yet.</li>`;
      }

      // District Map / Table
      const locContainer = document.getElementById('analytics-district-breakdown');
      if (data.locations && data.locations.length > 0) {
        locContainer.innerHTML = data.locations.map(loc => `
          <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--admin-border); font-size:0.875rem;">
            <span>📍 ${loc.district}</span>
            <strong>${loc.visitors} sessions</strong>
          </div>
        `).join('');
      } else {
        locContainer.innerHTML = `<p style="color:var(--admin-text-muted); font-size:0.85rem; padding:12px;">Real-time visitor telemetry active. No district clusters recorded in selected range.</p>`;
      }

    } catch (err) {
      console.error('Analytics load error:', err);
    }
  }

  // ==========================================
  // 8. REFERRALS & CUSTOMERS
  // ==========================================
  async function loadReferrals() {
    try {
      const res = await adminFetch('/api/admin/referrals');
      const { codes, payouts } = await res.json();

      const tbody = document.getElementById('referrals-table-tbody');
      if (codes && codes.length > 0) {
        tbody.innerHTML = codes.map(r => `
          <tr>
            <td><strong style="color:var(--admin-gold);">${r.code}</strong></td>
            <td>${r.ownerName}<br><small style="color:var(--admin-text-muted);">${r.ownerPhone}</small></td>
            <td>${r.commissionPercent}% / ${r.refereeDiscountPercent}%</td>
            <td>${r.stats?.totalUses || 0}</td>
            <td>${formatBDT(r.stats?.totalRevenueGenerated || 0)}</td>
            <td>
              <span style="color:#F6AD55;">${formatBDT(r.stats?.pendingCommission || 0)}</span>
            </td>
            <td>
              <span style="color:#68D391;">${formatBDT(r.stats?.paidCommission || 0)}</span>
            </td>
            <td>
              <button onclick="window.DeliceAdmin.toggleReferral('${r.code}', ${!r.isActive})" class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem;">
                ${r.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--admin-text-muted);">No referral programs active.</td></tr>`;
      }

      // Payouts Ledger
      const ledgerTbody = document.getElementById('payouts-table-tbody');
      if (payouts && payouts.length > 0) {
        ledgerTbody.innerHTML = payouts.map(p => `
          <tr>
            <td><strong>${p.payoutReference}</strong></td>
            <td>${p.referralCode} (${p.recipientName})</td>
            <td>${p.payoutMethod.toUpperCase()} (${p.accountNumber})</td>
            <td><strong>${formatBDT(p.amount)}</strong></td>
            <td>${formatDate(p.createdAt)} by ${p.processedByAdmin}</td>
          </tr>
        `).join('');
      } else {
        ledgerTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--admin-text-muted);">No payouts recorded.</td></tr>`;
      }

      // Also load customers
      const custRes = await adminFetch('/api/admin/customers');
      const { customers } = await custRes.json();
      const custTbody = document.getElementById('customers-table-tbody');
      if (customers && customers.length > 0) {
        custTbody.innerHTML = customers.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.phone}</td>
            <td>${c.defaultAddress?.district || '—'}</td>
            <td>${c.totalOrdersCount} orders</td>
            <td><strong>${formatBDT(c.totalSpentAmount)}</strong></td>
          </tr>
        `).join('');
      } else {
        custTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--admin-text-muted);">No patrons registered yet.</td></tr>`;
      }

    } catch (err) {
      console.error('Referrals load error:', err);
    }
  }

  // ==========================================
  // 9. SETTINGS & SECURITY
  // ==========================================
  async function loadSettings() {
    try {
      const res = await adminFetch('/api/admin/settings');
      const settings = await res.json();

      document.getElementById('sett-store-name').value = settings.storeName || 'DÉLICE';
      document.getElementById('sett-tagline').value = settings.tagline || '';
      document.getElementById('sett-email').value = settings.contact?.email || '';
      document.getElementById('sett-phone').value = settings.contact?.phone || '';
      document.getElementById('sett-whatsapp').value = settings.contact?.whatsapp || '';
      document.getElementById('sett-address').value = settings.contact?.address || '';

      document.getElementById('sett-dhaka-charge').value = settings.deliveryZones?.[0]?.charge ?? 80;
      document.getElementById('sett-outside-charge').value = settings.deliveryZones?.[1]?.charge ?? 150;
      document.getElementById('sett-free-threshold').value = settings.freeDeliveryThreshold ?? 5000;

      document.getElementById('sett-cod-enabled').checked = settings.paymentMethods?.cod?.enabled ?? true;
      document.getElementById('sett-bkash-enabled').checked = settings.paymentMethods?.bkashManual?.enabled ?? true;
      document.getElementById('sett-bkash-num').value = settings.paymentMethods?.bkashManual?.number || '';
      document.getElementById('sett-bkash-instruct').value = settings.paymentMethods?.bkashManual?.instructions || '';

      document.getElementById('sett-policy-delivery').value = settings.policies?.delivery || '';
      document.getElementById('sett-policy-returns').value = settings.policies?.returns || '';
      document.getElementById('sett-policy-privacy').value = settings.policies?.privacy || '';
      document.getElementById('sett-policy-terms').value = settings.policies?.terms || '';

      // Audit logs
      const auditRes = await adminFetch('/api/admin/audit-logs');
      const logs = await auditRes.json();
      const auditContainer = document.getElementById('admin-audit-logs-list');
      if (logs && logs.length > 0) {
        auditContainer.innerHTML = logs.map(l => `
          <div style="padding:10px 0; border-bottom:1px solid var(--admin-border); font-size:0.8rem; display:flex; justify-content:space-between;">
            <div>
              <strong style="color:var(--admin-gold);">${l.action}</strong>
              <span style="color:var(--admin-text-muted);"> (${l.targetType}${l.targetId ? ': ' + l.targetId : ''})</span>
            </div>
            <div style="color:var(--admin-text-dim);">${formatDateTime(l.createdAt)} by ${l.adminUsername}</div>
          </div>
        `).join('');
      } else {
        auditContainer.innerHTML = `<p style="color:var(--admin-text-muted); font-size:0.85rem;">No administrative audit entries yet.</p>`;
      }

    } catch (err) {
      console.error('Settings load error:', err);
    }
  }

  // ==========================================
  // EXPOSE GLOBAL ACTIONS FOR ADMIN UI
  // ==========================================
  window.DeliceAdmin = {
    showToast: showAdminToast,

    // Quick Publish Demo Product
    quickPublishProduct: async (id) => {
      try {
        await adminFetch(`/api/admin/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'published', isFeatured: true })
        });
        showAdminToast('Product published to storefront live!');
        loadProducts();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Save Homepage Draft
    saveDraft: async () => {
      const data = {
        announcementBar: {
          enabled: document.getElementById('edit-announcement-enabled').checked,
          text: document.getElementById('edit-announcement-text').value.trim(),
          linkUrl: document.getElementById('edit-announcement-link').value.trim()
        },
        hero: {
          headline: document.getElementById('edit-hero-headline').value.trim(),
          description: document.getElementById('edit-hero-desc').value.trim(),
          ctaText: document.getElementById('edit-hero-cta-text').value.trim(),
          ctaLink: document.getElementById('edit-hero-cta-link').value.trim(),
          desktopImageUrl: document.getElementById('edit-hero-desktop-img').value.trim(),
          mobileImageUrl: document.getElementById('edit-hero-mobile-img').value.trim(),
          focalPoint: {
            x: parseInt(document.getElementById('edit-hero-focal-x').value, 10),
            y: parseInt(document.getElementById('edit-hero-focal-y').value, 10)
          }
        },
        brandStory: {
          enabled: true,
          title: document.getElementById('edit-story-title').value.trim(),
          subtitle: document.getElementById('edit-story-subtitle').value.trim(),
          paragraph1: document.getElementById('edit-story-p1').value.trim(),
          paragraph2: document.getElementById('edit-story-p2').value.trim(),
          imageUrl: document.getElementById('edit-story-img').value.trim()
        },
        customerExperiences: {
          enabled: document.getElementById('edit-exp-enabled').checked,
          items: cachedHomepage?.customerExperiences?.items || []
        },
        sectionVisibility: {
          hero: document.getElementById('vis-hero').checked,
          collection: document.getElementById('vis-collection').checked,
          story: document.getElementById('vis-story').checked,
          experiences: document.getElementById('vis-experiences').checked
        }
      };

      try {
        await adminFetch('/api/admin/homepage/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        showAdminToast('Homepage draft saved (not yet published).');
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Publish Homepage
    publishHomepage: async () => {
      const note = prompt('Enter a short change note for this revision snapshot:', 'Updated storefront presentation');
      if (note === null) return;

      try {
        await window.DeliceAdmin.saveDraft();
        const res = await adminFetch('/api/admin/homepage/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note })
        });
        showAdminToast('Homepage successfully published to live storefront!');
        loadHomepageEditor();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Restore Revision
    restoreRevision: async (revId) => {
      if (!confirm('Restore this revision snapshot and make it live on the storefront?')) return;
      try {
        await adminFetch(`/api/admin/homepage/restore/${revId}`, { method: 'POST' });
        showAdminToast('Revision restored successfully!');
        loadHomepageEditor();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Preview Mode (Desktop / Mobile)
    togglePreview: (mode) => {
      const modal = document.getElementById('preview-modal');
      const iframe = document.getElementById('preview-iframe');
      modal.classList.add('active');
      iframe.style.width = mode === 'mobile' ? '390px' : '100%';
      iframe.src = '/';
    },

    closePreview: () => {
      document.getElementById('preview-modal').classList.remove('active');
    },

    // Media Upload
    uploadMediaFile: async (fileInput) => {
      const file = fileInput.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);
      formData.append('altText', file.name);

      try {
        showAdminToast('Uploading and optimizing image with Sharp...');
        const res = await adminFetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) throw new Error('Failed to upload file');
        showAdminToast('Image processed into optimized WebP and stored.');
        fileInput.value = '';
        loadMediaLibrary();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Delete Media with Safety Check
    deleteMediaAsset: async (filename) => {
      const checkRes = await adminFetch(`/api/admin/media/usage?url=/uploads/${filename}`);
      const checkData = await checkRes.json();

      if (!checkData.canDeleteSafely) {
        if (!confirm(`Warning: This image is used in ${checkData.usedIn.join(', ')}.\nAre you sure you want to delete it anyway?`)) {
          return;
        }
      } else {
        if (!confirm('Are you sure you want to remove this media asset?')) return;
      }

      try {
        await adminFetch(`/api/admin/media/${filename}?force=true`, { method: 'DELETE' });
        showAdminToast('Media asset removed.');
        loadMediaLibrary();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Stock Adjustment Modal
    openStockModal: (productId) => {
      const p = cachedProducts.find(i => i._id === productId);
      if (!p) return;

      document.getElementById('stock-modal-title').textContent = `Adjust Stock — ${p.name}`;
      document.getElementById('stock-modal-product-id').value = p._id;

      const select = document.getElementById('stock-modal-variant-select');
      select.innerHTML = (p.variants || []).map(v => `
        <option value="${v.size}" data-stock="${v.stock}">${v.size} (Current: ${v.stock})</option>
      `).join('');

      document.getElementById('stock-modal-new-qty').value = (p.variants && p.variants[0]) ? p.variants[0].stock : 0;
      document.getElementById('stock-modal-reason').value = '';
      document.getElementById('stock-modal').classList.add('active');
    },

    saveStockAdjustment: async () => {
      const pId = document.getElementById('stock-modal-product-id').value;
      const size = document.getElementById('stock-modal-variant-select').value;
      const newStock = parseInt(document.getElementById('stock-modal-new-qty').value, 10);
      const reason = document.getElementById('stock-modal-reason').value.trim();

      if (!reason) {
        showAdminToast('Please provide an administrative reason for the stock adjustment.', true);
        return;
      }

      try {
        await adminFetch(`/api/admin/products/${pId}/adjust-stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantSize: size, newStock, reason })
        });
        showAdminToast('Stock updated and recorded in inventory ledger.');
        document.getElementById('stock-modal').classList.remove('active');
        loadProducts();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Manage Order Modal
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
          Address: ${order.customer.fullAddress}, ${order.customer.area}, ${order.customer.district}
        `;

        document.getElementById('order-modal-items').innerHTML = order.items.map(i => `
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.875rem;">
            <span>${i.name} (${i.size}) × ${i.quantity}</span>
            <span>${formatBDT(i.subtotal)}</span>
          </div>
        `).join('');

        document.getElementById('order-modal-total').textContent = formatBDT(order.pricing.total);

        // Status Selectors
        document.getElementById('order-fulfillment-select').value = order.fulfillment.status;
        document.getElementById('order-courier-name').value = order.fulfillment.courierName || '';
        document.getElementById('order-tracking-num').value = order.fulfillment.trackingNumber || '';

        document.getElementById('order-payment-select').value = order.payment.status;
        document.getElementById('order-payment-method-desc').textContent = `Method: ${order.payment.method === 'bkash_manual' ? 'Manual bKash (Sender: ' + (order.payment.bkashSenderNumber || 'None') + ', TrxID: ' + (order.payment.bkashTrxId || 'None') + ')' : 'Cash on Delivery'}`;

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
        // Update fulfillment
        await adminFetch(`/api/admin/orders/${ref}/fulfillment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: fulfillmentStatus, courierName, trackingNumber })
        });

        // Update payment
        await adminFetch(`/api/admin/orders/${ref}/payment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: paymentStatus })
        });

        // Add note if modified
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

    // Referrals
    createReferralCode: async () => {
      const code = prompt('Enter new Referral Code (e.g. VIP10):');
      if (!code) return;
      const ownerName = prompt('Enter Ambassador / Patron Name:');
      if (!ownerName) return;
      const ownerPhone = prompt('Enter Ambassador Phone Number:');
      if (!ownerPhone) return;

      try {
        await adminFetch('/api/admin/referrals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.toUpperCase(),
            ownerName,
            ownerPhone,
            commissionPercent: 5,
            refereeDiscountPercent: 10
          })
        });
        showAdminToast(`Referral code ${code.toUpperCase()} activated.`);
        loadReferrals();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    toggleReferral: async (code, isActive) => {
      try {
        await adminFetch(`/api/admin/referrals/${code}/toggle`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive })
        });
        showAdminToast(`Referral code ${code} is now ${isActive ? 'active' : 'inactive'}.`);
        loadReferrals();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Save Settings
    saveStoreSettings: async () => {
      const data = {
        storeName: document.getElementById('sett-store-name').value.trim(),
        tagline: document.getElementById('sett-tagline').value.trim(),
        contact: {
          email: document.getElementById('sett-email').value.trim(),
          phone: document.getElementById('sett-phone').value.trim(),
          whatsapp: document.getElementById('sett-whatsapp').value.trim(),
          address: document.getElementById('sett-address').value.trim()
        },
        deliveryZones: [
          { id: 'dhaka_metro', name: 'Inside Dhaka Metropolitan Area', charge: parseInt(document.getElementById('sett-dhaka-charge').value, 10) || 80 },
          { id: 'outside_dhaka', name: 'Outside Dhaka (All Bangladesh Districts)', charge: parseInt(document.getElementById('sett-outside-charge').value, 10) || 150 }
        ],
        freeDeliveryThreshold: parseInt(document.getElementById('sett-free-threshold').value, 10) || 5000,
        paymentMethods: {
          cod: { enabled: document.getElementById('sett-cod-enabled').checked },
          bkashManual: {
            enabled: document.getElementById('sett-bkash-enabled').checked,
            number: document.getElementById('sett-bkash-num').value.trim(),
            instructions: document.getElementById('sett-bkash-instruct').value.trim()
          }
        },
        policies: {
          delivery: document.getElementById('sett-policy-delivery').value.trim(),
          returns: document.getElementById('sett-policy-returns').value.trim(),
          privacy: document.getElementById('sett-policy-privacy').value.trim(),
          terms: document.getElementById('sett-policy-terms').value.trim()
        }
      };

      try {
        await adminFetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        showAdminToast('Store configuration saved.');
        loadSettings();
      } catch (err) {
        showAdminToast(err.message, true);
      }
    },

    // Admin Password Change
    changeAdminPassword: async () => {
      const curr = document.getElementById('pw-curr').value;
      const next = document.getElementById('pw-next').value;

      if (!curr || !next) {
        showAdminToast('Please fill in both current and new passwords.', true);
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
    }
  };

  // Launch on DOM Ready
  document.addEventListener('DOMContentLoaded', initAdmin);
})();
