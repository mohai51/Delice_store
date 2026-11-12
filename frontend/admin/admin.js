/**
 * DÉLICE — Executive Admin Portal Script
 * Full Implementation of 9 Functional Views & Authentication.
 */

let authToken = localStorage.getItem('delice_admin_token') || null;
let currentOrders = [];
let currentProducts = [];
let currentSlides = [];

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNav();
  initModals();
});

/* ==========================================================================
   AUTHENTICATION
   ========================================================================== */
function initAuth() {
  const overlay = document.getElementById('authOverlay');
  const loginForm = document.getElementById('adminLoginForm');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  if (!authToken) {
    if (overlay) overlay.style.display = 'flex';
  } else {
    if (overlay) overlay.style.display = 'none';
    verifyTokenAndLoad();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUser').value.trim();
      const password = document.getElementById('loginPass').value.trim();
      const alertEl = document.getElementById('loginAlert');
      const submitBtn = document.getElementById('loginSubmitBtn');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.token) {
          authToken = data.token;
          localStorage.setItem('delice_admin_token', authToken);
          overlay.style.display = 'none';
          document.getElementById('adminUserName').textContent = data.user.username;
          loadOverview();
        } else {
          alertEl.style.display = 'block';
          alertEl.textContent = data.error || 'Login failed. Check credentials.';
        }
      } catch (err) {
        alertEl.style.display = 'block';
        alertEl.textContent = 'Server connection error. Please try again.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In Securely';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('delice_admin_token');
      authToken = null;
      window.location.reload();
    });
  }
}

async function verifyTokenAndLoad() {
  try {
    const res = await fetchWithAuth('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('adminUserName').textContent = data.user.username;
      loadOverview();
    } else {
      localStorage.removeItem('delice_admin_token');
      authToken = null;
      document.getElementById('authOverlay').style.display = 'flex';
    }
  } catch (err) {
    loadOverview();
  }
}

async function fetchWithAuth(url, options = {}) {
  options.headers = options.headers || {};
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }
  return fetch(url, options);
}

/* ==========================================================================
   NAVIGATION
   ========================================================================== */
const viewTitles = {
  overview: '1. Executive Overview',
  orders: '2. Orders Management',
  products: '3. Shop Catalog & Products',
  'delice-profit': '4. DÉLICE Profit Calculation & Capital Recovery',
  'hero-slides': '5. Hero Slides Management',
  settings: '6. System & Financial Settings'
};

function initNav() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      const view = link.getAttribute('data-view');
      switchTab(view);
    });
  });
}

function switchTab(viewId) {
  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('data-view') === viewId);
  });

  document.querySelectorAll('.dashboard-view').forEach(v => {
    v.classList.remove('active');
  });

  const activeView = document.getElementById(`view-${viewId}`);
  if (activeView) activeView.classList.add('active');

  const titleEl = document.getElementById('viewTitle');
  if (titleEl) titleEl.textContent = viewTitles[viewId] || viewId;

  // Trigger data loader for view
  if (viewId === 'overview') loadOverview();
  else if (viewId === 'orders') loadOrders();
  else if (viewId === 'products') loadProducts();
  else if (viewId === 'delice-profit') loadDeliceProfit();
  else if (viewId === 'hero-slides') loadHeroSlidesAdmin();
  else if (viewId === 'settings') loadSettings();
}

/* ==========================================================================
   1. OVERVIEW
   ========================================================================== */
async function loadOverview() {
  try {
    const res = await fetchWithAuth('/api/admin/overview');
    if (!res.ok) return;
    const data = await res.json();
    const stats = data.stats;

    document.getElementById('statTotalOrders').textContent = stats.totalOrdersCount || 0;
    document.getElementById('statPendingOrders').textContent = `${stats.pendingOrdersCount || 0} Pending Payment`;
    document.getElementById('statUnitsSold').textContent = stats.totalUnitsSold || 0;
    document.getElementById('statGrossRevenue').textContent = `৳${stats.totalGrossRevenue || 0}`;
    document.getElementById('statProductRevenue').textContent = `Product: ৳${stats.totalProductRevenue || 0}`;
    document.getElementById('statDeliveryCollected').textContent = `৳${stats.totalDeliveryCollected || 0}`;
    document.getElementById('statTotalExpenses').textContent = `৳${stats.totalAllExpenses || 0}`;
    document.getElementById('statNetProfit').textContent = `৳${stats.netProfit || 0}`;

    // Connect with DÉLICE Capital Recovery & Profit Engine
    const dp = data.deliceProfit;
    if (dp && dp.summary) {
      const s = dp.summary;
      const elRepaid = document.getElementById('overviewRepaidVal');
      const elOut = document.getElementById('overviewOutstandingVal');
      const elProg = document.getElementById('overviewProgressPercent');
      const elBar = document.getElementById('overviewProgressFill');
      const elBadge = document.getElementById('overviewRepaymentBadge');
      const elProfit = document.getElementById('overviewProfitVal');
      const elSalary = document.getElementById('overviewSalaryVal');

      if (elRepaid) elRepaid.textContent = `৳${s.totalPrincipalRepaid.toFixed(2)}`;
      if (elOut) elOut.textContent = `৳${s.outstandingPrincipal.toFixed(2)}`;
      if (elProg) elProg.textContent = `${s.repaymentProgress}%`;
      if (elBar) elBar.style.width = `${s.repaymentProgress}%`;
      if (elBadge) elBadge.style.display = s.isFullyRepaid ? 'inline-flex' : 'none';
      if (elProfit) elProfit.textContent = `৳${s.totalDistributableProfit.toFixed(2)}`;
      if (elSalary) elSalary.textContent = `৳${s.totalEmployeeSalary.toFixed(2)}`;
    }

    // Render recent orders table
    const tbody = document.getElementById('overviewRecentOrdersBody');
    if (tbody && data.recentOrders) {
      if (data.recentOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#87828A;">No orders recorded yet.</td></tr>`;
      } else {
        tbody.innerHTML = data.recentOrders.map(o => {
          const isPaid = o.paymentStatus === 'paid' || o.orderStatus === 'delivered';
          const bottles = (o.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
          const crStatus = isPaid
            ? `<span style="color:#C5A46D; font-weight:700; font-size:0.75rem;">৳${(732.60 * bottles).toFixed(2)} Repaid</span><br><span style="color:#15803D; font-weight:700; font-size:0.75rem;">+৳${(66.40 * bottles).toFixed(2)} Profit</span>`
            : '<span style="color:#6B7280; font-size:0.75rem;">Pending</span>';

          return `
            <tr>
              <td><strong>#${o.orderNumber}</strong></td>
              <td>${o.customer.fullName}</td>
              <td>${o.customer.phone}</td>
              <td>${(o.items || []).map(i => `${i.productName} (×${i.quantity})`).join(', ')}</td>
              <td><strong>৳${o.totalPaid || o.totalPayable}</strong></td>
              <td>${crStatus}</td>
              <td><span class="badge-status ${o.paymentStatus}">${o.paymentStatus}</span></td>
              <td><span class="badge-status ${o.orderStatus}">${o.orderStatus}</span></td>
              <td>${new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Error loading overview:', err);
  }
}

/* ==========================================================================
   2. ORDERS MANAGEMENT
   ========================================================================== */
async function loadOrders() {
  const status = document.getElementById('orderStatusFilter')?.value || 'all';
  const search = document.getElementById('orderSearchInput')?.value || '';

  try {
    const res = await fetchWithAuth(`/api/orders?status=${status}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    currentOrders = data.orders || [];

    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (currentOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:2rem; color:#87828A;">No matching orders found.</td></tr>`;
      return;
    }

    tbody.innerHTML = currentOrders.map(o => {
      const isCOD = o.paymentMethod === 'cod_advance';
      const provider = (o.paymentProvider || 'bkash').toUpperCase();
      const methodLabel = isCOD ? 'COD (Adv Fee)' : '100% Online';
      const advancePaid = o.advancePaid !== undefined ? o.advancePaid : (o.totalPaid || 0);
      const cashDue = isCOD ? (o.cashDueOnDelivery || o.productSubtotal || 0) : 0;
      const isPaid = o.paymentStatus === 'paid' || o.orderStatus === 'delivered';
      const bottles = (o.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

      const crDisplay = isPaid
        ? `<span style="color:#C5A46D; font-weight:700; font-size:0.8rem;">৳${(732.60 * bottles).toFixed(2)} Repaid</span><br><span style="color:#15803D; font-weight:700; font-size:0.75rem;">+৳${(66.40 * bottles).toFixed(2)} Profit</span>`
        : '<span style="color:#6B7280; font-size:0.75rem;">Pending</span>';

      return `
        <tr>
          <td><strong>#${o.orderNumber}</strong></td>
          <td>
            <code style="font-weight:700; color:#4A102A;">${o.transactionId}</code><br>
            <small style="color:#6B7280;">Sender: ${o.senderNumber || o.customer?.phone}</small>
          </td>
          <td>
            <strong>${o.customer.fullName}</strong><br>
            <small style="color:#6B7280;">${o.customer.phone} &bull; ${o.customer.district}</small>
          </td>
          <td>${(o.items || []).map(i => `${i.productName} × ${i.quantity}`).join('<br>')}</td>
          <td>
            <span class="badge-status ${isCOD ? 'shipped' : 'delivered'}" style="font-size:0.7rem; font-weight:700;">
              ${provider} &bull; ${methodLabel}
            </span>
          </td>
          <td style="color:#15803D; font-weight:700;">৳${advancePaid}</td>
          <td style="color:${cashDue > 0 ? '#B91C1C' : '#6B7280'}; font-weight:700;">৳${cashDue}</td>
          <td style="color:${(o.netProfit || 0) >= 0 ? '#15803D' : '#B91C1C'}; font-weight:700;">৳${o.netProfit || 0}</td>
          <td>${crDisplay}</td>
          <td><span class="badge-status ${o.paymentStatus}">${(o.paymentStatus || 'pending').replace('_', ' ')}</span></td>
          <td><span class="badge-status ${o.orderStatus}">${(o.orderStatus || 'processing').replace('_', ' ')}</span></td>
          <td>
            <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.6rem;" onclick="viewOrderModal('${o._id}')">
              Manage
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading orders:', err);
  }
}

function exportCourierCSV() {
  if (!currentOrders || currentOrders.length === 0) {
    alert('No orders available to export.');
    return;
  }
  const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'District', 'Delivery Area', 'Full Address', 'Items', 'Product Subtotal', 'Delivery Fee', 'Advance Paid', 'Cash Due (COD)', 'Total Order Value', 'Payment Method', 'Provider', 'Sender Phone', 'TrxID', 'Payment Status', 'Order Status'];
  const rows = currentOrders.map(o => [
    `"${o.orderNumber || ''}"`,
    `"${new Date(o.createdAt).toLocaleDateString('en-GB')}"`,
    `"${(o.customer?.fullName || '').replace(/"/g, '""')}"`,
    `"${o.customer?.phone || ''}"`,
    `"${o.customer?.district || ''}"`,
    `"${o.deliveryArea || ''}"`,
    `"${(o.customer?.address || '').replace(/"/g, '""')}"`,
    `"${(o.items || []).map(i => `${i.productName} (x${i.quantity})`).join('; ')}"`,
    o.productSubtotal || 0,
    o.deliveryCharge || 0,
    o.advancePaid || o.totalPaid || 0,
    o.cashDueOnDelivery || 0,
    o.totalPayable || 0,
    `"${o.paymentMethod || 'full_online'}"`,
    `"${(o.paymentProvider || 'bkash').toUpperCase()}"`,
    `"${o.senderNumber || ''}"`,
    `"${o.transactionId || ''}"`,
    `"${o.paymentStatus || ''}"`,
    `"${o.orderStatus || ''}"`
  ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `delice_orders_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function viewOrderModal(orderId) {
  const order = currentOrders.find(o => o._id === orderId);
  if (!order) return;

  const content = document.getElementById('modalOrderContent');
  document.getElementById('modalOrderTitle').textContent = `Order #${order.orderNumber}`;

  const isCOD = order.paymentMethod === 'cod_advance';
  const provider = (order.paymentProvider || 'bkash').toUpperCase();
  const advancePaid = order.advancePaid !== undefined ? order.advancePaid : (order.totalPaid || 0);
  const cashDue = isCOD ? (order.cashDueOnDelivery || order.productSubtotal || 0) : 0;

  content.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
      <div>
        <h4 style="font-size:0.85rem; text-transform:uppercase; color:#4A102A; margin-bottom:0.5rem;">Recipient &amp; Delivery</h4>
        <p style="margin:0; font-size:0.9rem;"><strong>Name:</strong> ${order.customer.fullName}</p>
        <p style="margin:0.25rem 0; font-size:0.9rem;"><strong>Phone:</strong> ${order.customer.phone}</p>
        <p style="margin:0.25rem 0; font-size:0.9rem;"><strong>District:</strong> ${order.customer.district} (${order.deliveryArea === 'insideDhaka' ? 'Inside Dhaka City' : 'Outside Dhaka'})</p>
        <p style="margin:0.25rem 0; font-size:0.9rem;"><strong>Address:</strong> ${order.customer.address}</p>
        ${order.customer.orderNotes ? `<p style="margin:0.25rem 0; font-size:0.85rem; color:#6B7280;"><em>Note: ${order.customer.orderNotes}</em></p>` : ''}
      </div>

      <div>
        <h4 style="font-size:0.85rem; text-transform:uppercase; color:#4A102A; margin-bottom:0.5rem;">Payment Verification Details</h4>
        <p style="margin:0; font-size:0.9rem;"><strong>Method:</strong> <span class="badge-status ${isCOD ? 'shipped' : 'delivered'}">${isCOD ? 'COD (Advance Delivery Fee)' : '100% Online Payment'}</span></p>
        <p style="margin:0.25rem 0; font-size:0.9rem;"><strong>Provider:</strong> <strong>${provider} (Send Money)</strong></p>
        <p style="margin:0.25rem 0; font-size:0.9rem;"><strong>Receiver:</strong> <code>01731101780</code> (Personal)</p>
        <p style="margin:0.25rem 0; font-size:0.9rem;"><strong>Customer Sender Mobile:</strong> <strong style="color:#4A102A;">${order.senderNumber || order.customer.phone}</strong></p>
        <p style="margin:0.25rem 0; font-size:0.9rem;"><strong>Transaction ID (TrxID):</strong> <code style="font-size:1.05rem; font-weight:800; color:#4A102A; background:#FFF; border:1px solid #E0D4C3; padding:2px 6px; border-radius:3px;">${order.transactionId}</code></p>
        <p style="margin:0.25rem 0; font-size:0.9rem;"><strong>Payment Status:</strong> <span class="badge-status ${order.paymentStatus}">${(order.paymentStatus || 'pending').toUpperCase().replace('_', ' ')}</span></p>
        <p style="margin:0.25rem 0; font-size:0.85rem; color:#6B7280;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('en-GB')}</p>
      </div>
    </div>

    <!-- ADVANCE VS CASH DUE HIGHLIGHT -->
    <div style="background:#FAF6F0; border-radius:6px; padding:1.15rem; margin-bottom:1.5rem; border:1.5px solid #C5A46D;">
      <h4 style="font-size:0.85rem; text-transform:uppercase; color:#4A102A; margin-bottom:0.75rem;">Payment Collection Breakdown</h4>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem; font-size:0.85rem;">
        <span>Product Subtotal:</span><strong>৳${order.productSubtotal}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem; font-size:0.85rem;">
        <span>Delivery Fee (${order.deliveryArea === 'insideDhaka' ? 'Inside Dhaka ৳60' : 'Outside Dhaka ৳120'}):</span><strong>৳${order.deliveryCharge}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem; font-size:0.9rem; font-weight:700;">
        <span>Total Order Value:</span><strong>৳${order.totalPayable}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed #E0D4C3; font-size:0.9rem;">
        <span style="font-weight:700; color:#15803D;">Advance Paid via ${provider}:</span>
        <strong style="color:#15803D; font-size:1rem;">৳${advancePaid}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:0.25rem; font-size:0.9rem;">
        <span style="font-weight:700; color:${cashDue > 0 ? '#B91C1C' : '#59555B'};">Cash Due from Courier Rider:</span>
        <strong style="color:${cashDue > 0 ? '#B91C1C' : '#15803D'}; font-size:1.05rem;">৳${cashDue}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid #E0D4C3; font-weight:700; font-size:0.95rem; color:#4A102A;">
        <span>Realized Net Profit:</span><span style="color:${(order.netProfit || 0) >= 0 ? '#15803D' : '#B91C1C'};">৳${order.netProfit || 0}</span>
      </div>
    </div>

    <!-- DÉLICE CAPITAL RECOVERY & PROFIT ENGINE SNAPSHOT (CONNECTED TO TAB 11) -->
    <div style="background:#FAF6F0; border-radius:6px; padding:1.15rem; margin-bottom:1.5rem; border:1.5px solid #4A102A; box-shadow:0 2px 6px rgba(74, 16, 42, 0.05);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
        <div>
          <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:#C5A46D; font-weight:700;">DÉLICE Profit Engine Connection</span>
          <h4 style="margin:0.15rem 0 0; font-size:0.95rem; color:#4A102A; font-weight:700;">Capital Recovery &amp; Fund-Based Profit Allocation</h4>
        </div>
        <span class="badge-status ${order.paymentStatus === 'paid' || order.orderStatus === 'delivered' ? 'paid' : 'pending'}">
          ${order.paymentStatus === 'paid' || order.orderStatus === 'delivered' ? 'ALLOCATED (CONFIRMED)' : 'AWAITING CONFIRMATION'}
        </span>
      </div>

      ${(() => {
        const bottles = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
        const repaid = (732.60 * bottles).toFixed(2);
        const profit = (66.40 * bottles).toFixed(2);
        const isPaid = order.paymentStatus === 'paid' || order.orderStatus === 'delivered';

        if (isPaid) {
          return `
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.75rem; margin-bottom:0.85rem; text-align:center;">
              <div style="background:#FFF; padding:0.6rem; border-radius:4px; border:1px solid #E5E7EB;">
                <div style="font-size:0.7rem; color:#6B7280; text-transform:uppercase;">Bottles Sold</div>
                <div style="font-size:1.15rem; font-weight:700; color:#4A102A;">${bottles}</div>
              </div>
              <div style="background:#FFF; padding:0.6rem; border-radius:4px; border:1px solid #E5E7EB;">
                <div style="font-size:0.7rem; color:#6B7280; text-transform:uppercase;">Principal Repaid</div>
                <div style="font-size:1.15rem; font-weight:700; color:#C5A46D;">৳${repaid}</div>
              </div>
              <div style="background:#FFF; padding:0.6rem; border-radius:4px; border:1px solid #E5E7EB;">
                <div style="font-size:0.7rem; color:#6B7280; text-transform:uppercase;">Distributable Profit</div>
                <div style="font-size:1.15rem; font-weight:700; color:#15803D;">৳${profit}</div>
              </div>
            </div>

            <div style="font-size:0.8rem; color:#181619; line-height:1.5; margin-bottom:0.75rem; background:#FFF; padding:0.6rem 0.85rem; border-radius:4px; border:1px solid #E5E7EB;">
              <strong>Exact Fund Distribution:</strong><br>
              &bull; NirmAN Finance (10%): <strong>৳${(bottles * 6.64).toFixed(2)}</strong><br>
              &bull; DÉLICE Development Fund (20%): <strong>৳${(bottles * 13.28).toFixed(2)}</strong><br>
              &bull; Employee Salary Fund (60%): <strong>৳${(bottles * 39.84).toFixed(2)}</strong> (4 employees &times; ৳${(bottles * 9.96).toFixed(2)})<br>
              &bull; Charity (3%): <strong>৳${(bottles * 1.99).toFixed(2)}</strong> | Marketing (5%): <strong>৳${(bottles * 3.32).toFixed(2)}</strong> | Reserve (2%): <strong>৳${(bottles * 1.33).toFixed(2)}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <small style="color:#6B7280;">100% exact penny balance reconciled</small>
              <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.35rem 0.75rem;" onclick="openDeliceSaleBreakdown('${order.orderNumber}')">
                Inspect Math Breakdown &rarr;
              </button>
            </div>
          `;
        } else {
          return `
            <p style="font-size:0.85rem; color:#6B7280; margin:0.25rem 0 0;">
              This order has not reached verified paid or delivered status. Once payment is confirmed, <strong>৳732.60 per bottle</strong> will automatically recover capital and <strong>৳66.40 per bottle</strong> will be allocated to the 6 DÉLICE funds.
            </p>
          `;
        }
      })()}
    </div>

    <form id="orderManageForm" onsubmit="handleOrderStatusUpdate(event, '${order._id}')">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Payment Verification Status</label>
          <select id="modalPaymentStatus" class="form-control">
            <option value="awaiting_verification" ${order.paymentStatus === 'awaiting_verification' ? 'selected' : ''}>Awaiting TrxID Verification</option>
            <option value="paid" ${order.paymentStatus === 'paid' ? 'selected' : ''}>Paid &amp; Verified</option>
            <option value="failed" ${order.paymentStatus === 'failed' ? 'selected' : ''}>Failed / Invalid TrxID</option>
            <option value="refunded" ${order.paymentStatus === 'refunded' ? 'selected' : ''}>Refunded</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fulfillment Status</label>
          <select id="modalOrderStatus" class="form-control">
            <option value="processing" ${order.orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="shipped" ${order.orderStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${order.orderStatus === 'delivered' ? 'selected' : ''}>Delivered (Cash Collected)</option>
            <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Actual Courier Expense (৳)</label>
        <input type="number" id="modalCourierCost" class="form-control" value="${order.actualCourierCost || (order.deliveryArea === 'insideDhaka' ? 60 : 120)}">
        <small style="color:#6B7280; font-size:0.75rem;">Actual settlement amount paid to Steadfast / Pathao courier</small>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Update Status &amp; Recalculate Profit</button>
    </form>
  `;

  openModal('orderModal');
}

async function handleOrderStatusUpdate(e, orderId) {
  e.preventDefault();
  const orderStatus = document.getElementById('modalOrderStatus').value;
  const paymentStatus = document.getElementById('modalPaymentStatus').value;
  const actualCourierCost = Number(document.getElementById('modalCourierCost').value);

  try {
    const res = await fetchWithAuth(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderStatus, paymentStatus, actualCourierCost })
    });

    if (res.ok) {
      alert('Order status successfully updated!');
      closeModal('orderModal');
      loadOrders();
    } else {
      alert('Failed to update order.');
    }
  } catch (err) {
    alert('Error updating order: ' + err.message);
  }
}

/* ==========================================================================
   3. PRODUCTS (SHOP MANAGEMENT)
   ========================================================================== */
async function loadProducts() {
  try {
    const res = await fetchWithAuth('/api/products/admin');
    let products = [];
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) products = data;
    }
    // Fallback if auth check failed or empty array
    if (!products || products.length === 0) {
      const fallbackRes = await fetch('/api/products');
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData)) products = fallbackData;
      }
    }

    currentProducts = products;

    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    tbody.innerHTML = products.map(p => {
      const prodId = p.id || p._id;
      const imgs = (p.images && p.images.length) ? p.images : [p.image || '/assets/images/bloom.svg'];
      return `
        <tr>
          <td>
            <div style="display:flex; gap:4px; align-items:center;">
              ${imgs.slice(0, 4).map(img => `
                <img src="${img}" alt="${p.name}" style="width:30px; height:38px; object-fit:contain; background:#FAF6F0; border-radius:3px; border:1px solid #E0D4C3;">
              `).join('')}
            </div>
          </td>
          <td><strong>${p.name}</strong></td>
          <td><code>${prodId}</code></td>
          <td style="max-width:200px; font-size:0.8rem; color:#4B5563;">${(p.occasions || []).join(', ') || 'N/A'}</td>
          <td><strong>৳${p.price}</strong></td>
          <td style="color:#6B7280; text-decoration:line-through;">৳${p.originalPrice}</td>
          <td style="font-size:0.8rem;"><span style="color:#C5A46D; font-weight:700;">৳732.60</span> / <span style="color:#15803D; font-weight:700;">৳66.40</span></td>
          <td>৳${p.cogs || 320}</td>
          <td><strong>${p.stock}</strong></td>
          <td><span class="badge-status ${p.isActive !== false ? 'delivered' : 'cancelled'}">${p.isActive !== false ? 'Active' : 'Inactive'}</span></td>
          <td>
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.35rem 0.7rem; cursor:pointer;" data-action="edit-product" data-id="${prodId}" onclick="editProduct('${prodId}')">
                Edit
              </button>
              <button type="button" class="btn btn-outline" style="font-size:0.75rem; padding:0.35rem 0.5rem; color:#B91C1C; border-color:#FCA5A5; cursor:pointer;" data-action="delete-product" data-id="${prodId}" onclick="deleteProduct('${prodId}')">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach Event Delegation on productsTableBody
    if (!tbody.dataset.listenerAttached) {
      tbody.dataset.listenerAttached = 'true';
      tbody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-action="edit-product"]');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          if (id) editProduct(id);
          return;
        }
        const delBtn = e.target.closest('[data-action="delete-product"]');
        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          if (id) deleteProduct(id);
          return;
        }
      });
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function updateProductDiscountPreview() {
  const origEl = document.getElementById('prodOrigPrice');
  const priceEl = document.getElementById('prodPrice');
  const textEl = document.getElementById('prodDiscountText');
  if (!origEl || !priceEl || !textEl) return;

  const orig = Number(origEl.value) || 0;
  const offer = Number(priceEl.value) || 0;

  if (orig <= 0) {
    textEl.textContent = 'Enter regular price';
    textEl.style.color = '#87828A';
    return;
  }

  const savings = orig - offer;
  const pct = Math.round((savings / orig) * 100);

  if (savings > 0) {
    textEl.textContent = `Save ৳${savings} (${pct}% OFF)`;
    textEl.style.color = '#FF665C';
  } else if (savings === 0) {
    textEl.textContent = 'No Discount (0% OFF)';
    textEl.style.color = '#4A102A';
  } else {
    textEl.textContent = 'Offer price exceeds regular price';
    textEl.style.color = '#B91C1C';
  }
}

function openProductModal() {
  const form = document.getElementById('productForm');
  if (form) form.reset();

  const editIdEl = document.getElementById('prodEditId');
  const idEl = document.getElementById('prodId');
  const nameEl = document.getElementById('prodName');
  const descEl = document.getElementById('prodDesc');
  const occasionsEl = document.getElementById('prodOccasions');
  const origPriceEl = document.getElementById('prodOrigPrice');
  const priceEl = document.getElementById('prodPrice');
  const cogsEl = document.getElementById('prodCOGS');
  const stockEl = document.getElementById('prodStock');

  if (editIdEl) editIdEl.value = '';
  if (idEl) {
    idEl.value = '';
    idEl.readOnly = false;
  }
  if (nameEl) nameEl.value = '';
  if (descEl) descEl.value = '';
  if (occasionsEl) occasionsEl.value = '';
  if (origPriceEl) origPriceEl.value = '850';
  if (priceEl) priceEl.value = '799';
  if (cogsEl) cogsEl.value = '320';
  if (stockEl) stockEl.value = '100';

  // 4 Default Image Slots
  if (document.getElementById('prodImage1')) {
    document.getElementById('prodImage1').value = '/assets/images/uploads/delice_Bottle-1_1794420148574.png';
    document.getElementById('prodFilePreview1').src = '/assets/images/uploads/delice_Bottle-1_1794420148574.png';
  }
  if (document.getElementById('prodImage2')) {
    document.getElementById('prodImage2').value = '/assets/images/bloom-box.svg';
    document.getElementById('prodFilePreview2').src = '/assets/images/bloom-box.svg';
  }
  if (document.getElementById('prodImage3')) {
    document.getElementById('prodImage3').value = '/assets/images/hero-slide-1.svg';
    document.getElementById('prodFilePreview3').src = '/assets/images/hero-slide-1.svg';
  }
  if (document.getElementById('prodImage4')) {
    document.getElementById('prodImage4').value = '/assets/images/brand-story.svg';
    document.getElementById('prodFilePreview4').src = '/assets/images/brand-story.svg';
  }

  updateProductDiscountPreview();
  const titleEl = document.getElementById('modalProductTitle');
  if (titleEl) titleEl.textContent = 'Add Fragrance Edition (Shop)';
  openModal('productModal');
}

async function editProduct(productId) {
  try {
    let p = null;
    if (currentProducts && currentProducts.length) {
      p = currentProducts.find(prod => 
        (prod.id && prod.id.toLowerCase() === String(productId).toLowerCase()) || 
        prod._id === productId || 
        String(prod._id) === String(productId)
      );
    }

    // Fallback: If not found in currentProducts array, fetch directly from server API
    if (!p) {
      try {
        const res = await fetch(`/api/products/${productId}`);
        if (res.ok) {
          p = await res.json();
        }
      } catch (err) {
        console.warn('Direct fetch for product failed:', err);
      }
    }

    if (!p) {
      alert(`Could not find fragrance details for "${productId}". Please try again.`);
      return;
    }

    const prodId = p.id || p._id;

    const editIdEl = document.getElementById('prodEditId');
    const idEl = document.getElementById('prodId');
    const nameEl = document.getElementById('prodName');
    const priceEl = document.getElementById('prodPrice');
    const origPriceEl = document.getElementById('prodOrigPrice');
    const cogsEl = document.getElementById('prodCOGS');
    const stockEl = document.getElementById('prodStock');
    const descEl = document.getElementById('prodDesc');
    const occasionsEl = document.getElementById('prodOccasions');

    if (editIdEl) editIdEl.value = prodId;
    if (idEl) {
      idEl.value = prodId;
      idEl.readOnly = true;
    }
    if (nameEl) nameEl.value = p.name || '';
    if (priceEl) priceEl.value = p.price || 799;
    if (origPriceEl) origPriceEl.value = p.originalPrice || 850;
    if (cogsEl) cogsEl.value = p.cogs || 320;
    if (stockEl) stockEl.value = p.stock || 100;
    if (descEl) descEl.value = p.description || '';
    if (occasionsEl) occasionsEl.value = (p.occasions || []).join(', ');

    // 4 Images populate
    const imgs = (p.images && p.images.length) ? p.images : [p.image || '/assets/images/bloom.svg'];
    for (let i = 1; i <= 4; i++) {
      const imgInput = document.getElementById(`prodImage${i}`);
      const imgPreview = document.getElementById(`prodFilePreview${i}`);
      const val = imgs[i - 1] || '';
      if (imgInput) imgInput.value = val;
      if (imgPreview) {
        imgPreview.src = val || '/assets/images/bloom.svg';
        imgPreview.style.opacity = val ? '1' : '0.4';
      }
    }

    updateProductDiscountPreview();

    const titleEl = document.getElementById('modalProductTitle');
    if (titleEl) titleEl.textContent = `Edit ${p.name} (Shop)`;

    openModal('productModal');
  } catch (err) {
    console.error('Error in editProduct:', err);
    alert('Error opening edit window: ' + err.message);
  }
}

async function deleteProduct(productId) {
  if (!confirm(`Are you sure you want to delete or deactivate product "${productId}"?`)) return;
  try {
    const res = await fetchWithAuth(`/api/products/${productId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      alert('Product deleted successfully from Shop.');
      loadProducts();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed to delete product.');
    }
  } catch (err) {
    alert('Error deleting product: ' + err.message);
  }
}

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.openProductModal = openProductModal;

// Product Form Submit & 4 File Inputs Listeners
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('productForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('prodEditId').value;
      const id = document.getElementById('prodId').value.trim();
      const name = document.getElementById('prodName').value.trim();
      const price = Number(document.getElementById('prodPrice').value);
      const originalPrice = Number(document.getElementById('prodOrigPrice').value);
      const cogs = Number(document.getElementById('prodCOGS').value);
      const stock = Number(document.getElementById('prodStock').value);
      const description = document.getElementById('prodDesc').value.trim();
      const occasions = document.getElementById('prodOccasions').value.trim();

      // Collect up to 4 images
      const img1 = document.getElementById('prodImage1') ? document.getElementById('prodImage1').value.trim() : '';
      const img2 = document.getElementById('prodImage2') ? document.getElementById('prodImage2').value.trim() : '';
      const img3 = document.getElementById('prodImage3') ? document.getElementById('prodImage3').value.trim() : '';
      const img4 = document.getElementById('prodImage4') ? document.getElementById('prodImage4').value.trim() : '';
      const images = [img1, img2, img3, img4].filter(Boolean);

      const payload = {
        id,
        name,
        price,
        originalPrice,
        cogs,
        stock,
        description,
        occasions,
        tags: occasions,
        images,
        image: images[0] || img1 || '/assets/images/bloom.svg'
      };

      const url = editId ? `/api/products/${editId}` : '/api/products';
      const method = editId ? 'PUT' : 'POST';

      const saveBtn = document.getElementById('saveProdBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      try {
        const res = await fetchWithAuth(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert(editId ? 'Product updated successfully in Shop!' : 'New Product added successfully to Shop!');
          closeModal('productModal');
          loadProducts();
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Failed to save product.');
        }
      } catch (err) {
        alert('Server error saving product: ' + err.message);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Fragrance Edition';
        }
      }
    });

    const origInput = document.getElementById('prodOrigPrice');
    const priceInput = document.getElementById('prodPrice');
    if (origInput) origInput.addEventListener('input', updateProductDiscountPreview);
    if (priceInput) priceInput.addEventListener('input', updateProductDiscountPreview);

    // Setup file upload & text input listeners for each of the 4 picture slots
    for (let i = 1; i <= 4; i++) {
      const fileInput = document.getElementById(`prodFileInput${i}`);
      if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          await handleFileUpload(file, `prodImage${i}`, `prodFilePreview${i}`);
        });
      }
      const textInput = document.getElementById(`prodImage${i}`);
      if (textInput) {
        textInput.addEventListener('input', (e) => {
          const preview = document.getElementById(`prodFilePreview${i}`);
          const val = e.target.value.trim();
          if (preview) {
            preview.src = val || '/assets/images/bloom.svg';
            preview.style.opacity = val ? '1' : '0.4';
          }
        });
      }
    }
  }
});

/* ==========================================================================
   6. SETTINGS
   ========================================================================== */
async function loadSettings() {
  try {
    const res = await fetchWithAuth('/api/settings');
    const data = await res.json();
    const settings = data.settings || [];

    settings.forEach(s => {
      if (s.key === 'bkashNagadNumber' && document.getElementById('setBkashNagad')) document.getElementById('setBkashNagad').value = s.value;
      if (s.key === 'deliveryChargeInsideDhaka') document.getElementById('setDhaka').value = s.value;
      if (s.key === 'deliveryChargeOutsideDhaka') document.getElementById('setOutside').value = s.value;
      if (s.key === 'defaultProductCOGS') document.getElementById('setCOGS').value = s.value;
      if (s.key === 'gatewayFeePercentage') document.getElementById('setFee').value = s.value;
      if (s.key === 'storePhone') document.getElementById('setPhone').value = s.value;
      if (s.key === 'storeEmail') document.getElementById('setEmail').value = s.value;
      if (s.key === 'facebookUrl') document.getElementById('setFb').value = s.value;
    });

    // Connect with DÉLICE Capital Recovery Settings
    try {
      const dpRes = await fetchWithAuth('/api/admin/delice-profit/settings');
      if (dpRes.ok) {
        const dpData = await dpRes.json();
        const s = dpData.settings;
        if (s) {
          if (document.getElementById('setInitialPrincipal')) document.getElementById('setInitialPrincipal').value = s.initialPrincipal;
          if (document.getElementById('setInitialStock')) document.getElementById('setInitialStock').value = s.totalInitialStock;
          if (document.getElementById('setUnitCost')) document.getElementById('setUnitCost').value = s.unitCost;
          if (document.getElementById('setSellingPrice')) document.getElementById('setSellingPrice').value = s.defaultSellingPrice;
          if (document.getElementById('setProfitPerBottle')) document.getElementById('setProfitPerBottle').value = (s.defaultSellingPrice - s.unitCost).toFixed(2);
        }
      }
    } catch (e) {}
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settingsForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        bkashNagadNumber: document.getElementById('setBkashNagad') ? document.getElementById('setBkashNagad').value.trim() : '01731101780',
        deliveryChargeInsideDhaka: Number(document.getElementById('setDhaka').value),
        deliveryChargeOutsideDhaka: Number(document.getElementById('setOutside').value),
        defaultProductCOGS: Number(document.getElementById('setCOGS').value),
        gatewayFeePercentage: Number(document.getElementById('setFee').value),
        storePhone: document.getElementById('setPhone').value.trim(),
        storeEmail: document.getElementById('setEmail').value.trim(),
        facebookUrl: document.getElementById('setFb').value.trim()
      };

      const btn = document.getElementById('saveSettingsBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await fetchWithAuth('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Also sync DÉLICE Capital Recovery Baseline
        const dpPrincipal = parseFloat(document.getElementById('setInitialPrincipal')?.value);
        const dpStock = parseInt(document.getElementById('setInitialStock')?.value, 10);
        const dpUnitCost = parseFloat(document.getElementById('setUnitCost')?.value);
        const dpPrice = parseFloat(document.getElementById('setSellingPrice')?.value);
        const dpProfit = parseFloat((dpPrice - dpUnitCost).toFixed(2));

        if (!isNaN(dpPrincipal) && !isNaN(dpUnitCost)) {
          try {
            await fetchWithAuth('/api/admin/delice-profit/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                initialPrincipal: dpPrincipal,
                totalInitialStock: dpStock,
                unitCost: dpUnitCost,
                defaultSellingPrice: dpPrice,
                profitPerBottle: dpProfit
              })
            });
          } catch (e) {}
        }

        if (res.ok) {
          alert('All system & DÉLICE Capital Recovery settings successfully updated!');
        } else {
          alert('Failed to update settings.');
        }
      } catch (e) {
        alert('Error connecting to server.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Settings';
      }
    });
  }
});

/* ==========================================================================
   5. HERO SLIDES MANAGEMENT
   ========================================================================== */
async function loadHeroSlidesAdmin() {
  try {
    const res = await fetchWithAuth('/api/slides/admin');
    if (!res.ok) {
      console.error('Failed to load slides from API, status:', res.status);
      return;
    }
    const slides = await res.json();
    currentSlides = Array.isArray(slides) ? slides : [];

    const tbody = document.getElementById('heroSlidesTableBody');
    if (!tbody) return;

    if (currentSlides.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:2rem; color:#87828A;">No hero slides found. Click "+ Add New Hero Slide" to create one.</td></tr>`;
      return;
    }

    tbody.innerHTML = currentSlides.map(s => {
      const slideId = s._id || s.id || '';
      const isActive = s.isActive !== false;
      return `
        <tr data-slide-row="${slideId}">
          <td>
            <img src="${s.image}" alt="${s.title}" style="width:70px; height:44px; object-fit:cover; border-radius:4px; border:1px solid #E0D4C3; background:#181619;">
          </td>
          <td>
            <strong>${s.title}</strong>
            ${s.titleHighlight ? `<span style="color:#C5A46D; font-style:italic;"> ${s.titleHighlight}</span>` : ''}
          </td>
          <td style="max-width:240px; font-size:0.85rem; color:#4B5563; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.subtitle || ''}</td>
          <td><small style="background:#FAF6F0; padding:2px 6px; border-radius:3px; border:1px solid #E0D4C3;">${s.badge || '30ml Edition'}</small></td>
          <td><code>${s.productId || 'delice-bloom'}</code></td>
          <td>
            <strong>৳${s.offerPrice || 799}</strong>
            ${s.originalPrice ? `<br><small style="text-decoration:line-through; color:#87828A;">৳${s.originalPrice}</small>` : ''}
          </td>
          <td><strong>${s.order || 1}</strong></td>
          <td>
            <span class="badge-status ${isActive ? 'delivered' : 'cancelled'}">
              ${isActive ? 'Active' : 'Hidden'}
            </span>
          </td>
          <td style="white-space:nowrap;">
            <button type="button" class="btn btn-primary" style="font-size:0.75rem; padding:0.35rem 0.65rem; margin-right:4px;" data-action="edit-slide" data-id="${slideId}" onclick="editSlide('${slideId}')">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.35rem 0.65rem; margin-right:4px;" data-action="toggle-slide" data-id="${slideId}" data-active="${isActive}" onclick="toggleSlideActive('${slideId}', ${isActive})">
              ${isActive ? 'Hide' : 'Show'}
            </button>
            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; padding:0.35rem 0.65rem; color:#B91C1C; border-color:#B91C1C;" data-action="delete-slide" data-id="${slideId}" onclick="deleteSlide('${slideId}')">
              🗑️ Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading hero slides:', err);
  }
}

function openSlideModal() {
  const form = document.getElementById('slideForm');
  if (form) form.reset();
  document.getElementById('slideEditId').value = '';
  document.getElementById('slideBadge').value = '30ml Edition';
  document.getElementById('slideTitle').value = 'Make It';
  document.getElementById('slideHighlight').value = 'Yours.';
  document.getElementById('slideSubtitle').value = '';
  document.getElementById('slideImage').value = '/assets/images/hero-slide-1.svg';
  const preview = document.getElementById('slideFilePreview');
  if (preview) preview.src = '/assets/images/hero-slide-1.svg';
  document.getElementById('slideProductId').value = 'delice-bloom';
  document.getElementById('slideOfferPrice').value = '799';
  document.getElementById('slideOrigPrice').value = '850';
  document.getElementById('slideOrder').value = (currentSlides.length + 1).toString();
  document.getElementById('modalSlideTitle').textContent = 'Add Hero Slide Banner';
  openModal('slideModal');
}

function editSlide(slideId) {
  if (!slideId) {
    alert('Slide ID is missing.');
    return;
  }
  const s = currentSlides.find(sl => String(sl._id) === String(slideId) || String(sl.id) === String(slideId));
  if (!s) {
    alert('Slide data not found in local memory. Reloading slides...');
    loadHeroSlidesAdmin().then(() => {
      const retryS = currentSlides.find(sl => String(sl._id) === String(slideId) || String(sl.id) === String(slideId));
      if (retryS) fillSlideForm(retryS);
      else alert('Slide not found.');
    });
    return;
  }
  fillSlideForm(s);
}

function fillSlideForm(s) {
  const editId = s._id || s.id;
  document.getElementById('slideEditId').value = editId;
  document.getElementById('slideBadge').value = s.badge || '';
  document.getElementById('slideTitle').value = s.title || '';
  document.getElementById('slideHighlight').value = s.titleHighlight || '';
  document.getElementById('slideSubtitle').value = s.subtitle || '';
  document.getElementById('slideImage').value = s.image || '';
  const preview = document.getElementById('slideFilePreview');
  if (preview) preview.src = s.image || '/assets/images/hero-slide-1.svg';
  document.getElementById('slideProductId').value = s.productId || 'delice-bloom';
  document.getElementById('slideOfferPrice').value = s.offerPrice || 799;
  document.getElementById('slideOrigPrice').value = s.originalPrice || 850;
  document.getElementById('slideOrder').value = s.order || 1;
  document.getElementById('modalSlideTitle').textContent = `Edit Hero Slide: ${s.title}`;
  openModal('slideModal');
}

async function toggleSlideActive(slideId, currentActive) {
  if (!slideId) return;
  try {
    const res = await fetchWithAuth(`/api/slides/${slideId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentActive })
    });
    if (res.ok) {
      await loadHeroSlidesAdmin();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed to update slide status.');
    }
  } catch (err) {
    alert('Error toggling slide status: ' + err.message);
  }
}

async function deleteSlide(slideId) {
  if (!slideId) {
    alert('Slide ID is missing.');
    return;
  }
  if (!confirm('Are you sure you want to permanently delete this hero slide?')) return;

  try {
    const res = await fetchWithAuth(`/api/slides/${slideId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert('Hero slide deleted successfully!');
      await loadHeroSlidesAdmin();
    } else {
      alert(data.error || 'Failed to delete slide (HTTP ' + res.status + ')');
    }
  } catch (err) {
    alert('Error connecting to server while deleting slide: ' + err.message);
  }
}

/* Expose to global window so inline onclick always resolves */
window.loadHeroSlidesAdmin = loadHeroSlidesAdmin;
window.openSlideModal = openSlideModal;
window.editSlide = editSlide;
window.toggleSlideActive = toggleSlideActive;
window.deleteSlide = deleteSlide;

/* ==========================================================================
   IMAGE UPLOAD HELPER
   ========================================================================== */
async function handleFileUpload(file, targetInputId, previewImgId) {
  const previewEl = document.getElementById(previewImgId);
  const inputEl = document.getElementById(targetInputId);

  if (previewEl) previewEl.style.opacity = '0.35';

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      if (inputEl) inputEl.value = data.url;
      if (previewEl) {
        previewEl.src = data.url;
        previewEl.style.opacity = '1';
      }
    } else {
      alert(data.error || 'Image upload failed.');
      if (previewEl) previewEl.style.opacity = '1';
    }
  } catch (err) {
    alert('Error connecting to image upload service: ' + err.message);
    if (previewEl) previewEl.style.opacity = '1';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Global Event Delegation for Hero Slides Actions (Guaranteed click handling)
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-slide"]');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      if (id) editSlide(id);
      return;
    }
    const delBtn = e.target.closest('[data-action="delete-slide"]');
    if (delBtn) {
      const id = delBtn.getAttribute('data-id');
      if (id) deleteSlide(id);
      return;
    }
    const toggleBtn = e.target.closest('[data-action="toggle-slide"]');
    if (toggleBtn) {
      const id = toggleBtn.getAttribute('data-id');
      const active = toggleBtn.getAttribute('data-active') === 'true';
      if (id) toggleSlideActive(id, active);
      return;
    }
  });

  // Slide Form Submission Listener
  const slideForm = document.getElementById('slideForm');
  if (slideForm) {
    slideForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('slideEditId').value.trim();
      const badge = document.getElementById('slideBadge').value.trim();
      const title = document.getElementById('slideTitle').value.trim();
      const titleHighlight = document.getElementById('slideHighlight').value.trim();
      const subtitle = document.getElementById('slideSubtitle').value.trim();
      const image = document.getElementById('slideImage').value.trim();
      const productId = document.getElementById('slideProductId').value;
      const offerPrice = Number(document.getElementById('slideOfferPrice').value) || 799;
      const originalPrice = Number(document.getElementById('slideOrigPrice').value) || 850;
      const order = Number(document.getElementById('slideOrder').value) || 1;

      if (!image) {
        alert('Please upload or enter a Slide Image.');
        return;
      }

      const finalTitle = title || 'Hero Slide';
      const payload = { badge, title: finalTitle, titleHighlight, subtitle, image, productId, offerPrice, originalPrice, order };
      const url = editId ? `/api/slides/${editId}` : '/api/slides';
      const method = editId ? 'PUT' : 'POST';

      const saveBtn = document.getElementById('saveSlideBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Slide...';
      }

      try {
        const res = await fetchWithAuth(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          alert(editId ? 'Hero slide updated successfully!' : 'Hero slide added successfully!');
          closeModal('slideModal');
          await loadHeroSlidesAdmin();
        } else {
          alert(data.error || 'Failed to save slide.');
        }
      } catch (err) {
        alert('Network error saving hero slide: ' + err.message);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Hero Slide';
        }
      }
    });
  }

  // Slide File Input Listener
  const slideFileInput = document.getElementById('slideFileInput');
  if (slideFileInput) {
    slideFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await handleFileUpload(file, 'slideImage', 'slideFilePreview');
    });
  }
});

/* ==========================================================================
   MODAL UTILITIES
   ========================================================================== */
function initModals() {
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
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

function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('active');
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } else {
    console.error('Modal element not found with id:', id);
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('active');
    m.style.display = '';
    document.body.style.overflow = '';
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

/* ==========================================================================
   4. DÉLICE PROFIT CALCULATION & CAPITAL RECOVERY ENGINE
   ========================================================================== */
let currentDeliceProfitData = null;
let currentDeliceAllocations = [];
let currentDeliceReport = null;

async function loadDeliceProfit() {
  try {
    const res = await fetchWithAuth('/api/admin/delice-profit/dashboard');
    if (!res.ok) {
      console.error('Failed to fetch delice profit dashboard');
      return;
    }
    const result = await res.json();
    if (!result.success || !result.data) return;

    currentDeliceProfitData = result.data;
    const { summary, fundsOverview, employeesSummary, settings } = result.data;

    // 1. Overview KPI Cards (8 Cards)
    const elBottles = document.getElementById('dpStatBottles');
    const elRevenue = document.getElementById('dpStatRevenue');
    const elRepaid = document.getElementById('dpStatRepaid');
    const elOutstanding = document.getElementById('dpStatOutstanding');
    const elProfit = document.getElementById('dpStatProfit');
    const elEmployeeSalary = document.getElementById('dpStatEmployeeSalary');
    const elDevFund = document.getElementById('dpStatDevFund');
    const elReserveFund = document.getElementById('dpStatReserveFund');

    if (elBottles) elBottles.textContent = summary.totalBottlesSold;
    if (elRevenue) elRevenue.textContent = `৳${summary.totalSalesRevenue.toFixed(2)}`;
    if (elRepaid) elRepaid.textContent = `৳${summary.totalPrincipalRepaid.toFixed(2)}`;
    if (elOutstanding) elOutstanding.textContent = `৳${summary.outstandingPrincipal.toFixed(2)}`;
    if (elProfit) elProfit.textContent = `৳${summary.totalDistributableProfit.toFixed(2)}`;
    if (elEmployeeSalary) elEmployeeSalary.textContent = `৳${summary.totalEmployeeSalary.toFixed(2)}`;
    if (elDevFund) elDevFund.textContent = `৳${summary.totalDevelopmentFund.toFixed(2)}`;
    if (elReserveFund) elReserveFund.textContent = `৳${summary.totalReserveFund.toFixed(2)}`;

    // 2. Investment Repayment Progress Bar
    const progressFill = document.getElementById('dpProgressFill');
    const progressPercentLabel = document.getElementById('dpProgressPercentLabel');
    const initialInvestmentLabel = document.getElementById('dpInitialInvestmentLabel');
    const repaidLabel = document.getElementById('dpRepaidLabel');
    const remainingLabel = document.getElementById('dpRemainingLabel');
    const repaymentBadge = document.getElementById('dpRepaymentBadge');

    if (progressFill) progressFill.style.width = `${summary.repaymentProgress}%`;
    if (progressPercentLabel) progressPercentLabel.textContent = `${summary.repaymentProgress}%`;
    if (initialInvestmentLabel) initialInvestmentLabel.textContent = `৳${summary.initialPrincipal.toLocaleString()}`;
    if (repaidLabel) repaidLabel.textContent = `৳${summary.totalPrincipalRepaid.toFixed(2)}`;
    if (remainingLabel) remainingLabel.textContent = `৳${summary.outstandingPrincipal.toFixed(2)}`;

    if (repaymentBadge) {
      repaymentBadge.style.display = summary.isFullyRepaid ? 'inline-flex' : 'none';
    }

    // 3. Fund-Wise Financial Breakdown (6 Funds)
    const fundsGrid = document.getElementById('dpFundsGrid');
    if (fundsGrid && Array.isArray(fundsOverview)) {
      fundsGrid.innerHTML = fundsOverview.map(fund => `
        <div class="delice-fund-card" style="border-top: 4px solid ${fund.color || '#4A102A'};">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
              <h4 style="font-size:1.05rem; color:#4A102A; margin:0; font-weight:700;">${fund.name}</h4>
              <span style="background:#FAF6F0; border:1px solid #E0D4C3; color:#4A102A; padding:0.2rem 0.55rem; border-radius:9999px; font-size:0.75rem; font-weight:700;">
                ${fund.percentage}%
              </span>
            </div>
            <div style="font-size:0.8rem; color:#6B7280; margin-bottom:1rem;">
              Earns: <strong style="color:#181619;">৳${fund.amountPerBottle.toFixed(2)}</strong> per bottle
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:1rem; font-size:0.85rem;">
              <div style="background:#F9FAFB; padding:0.5rem 0.65rem; border-radius:4px;">
                <div style="font-size:0.7rem; color:#6B7280; text-transform:uppercase;">Accumulated</div>
                <div style="font-weight:700; color:#15803D;">৳${fund.totalAccumulated.toFixed(2)}</div>
              </div>
              <div style="background:#F9FAFB; padding:0.5rem 0.65rem; border-radius:4px;">
                <div style="font-size:0.7rem; color:#6B7280; text-transform:uppercase;">Debited (Exp.)</div>
                <div style="font-weight:700; color:#B91C1C;">৳${fund.totalExpenses.toFixed(2)}</div>
              </div>
            </div>
            <div style="background:#FAF6F0; border:1px solid #E0D4C3; border-radius:6px; padding:0.65rem 0.85rem; margin-bottom:1rem;">
              <div style="font-size:0.7rem; text-transform:uppercase; color:#6B7280; font-weight:600;">Net Available Balance</div>
              <div style="font-size:1.25rem; font-weight:700; color:#4A102A;">৳${fund.availableBalance.toFixed(2)}</div>
            </div>
            <div style="font-size:0.75rem; color:#6B7280; margin-bottom:0.75rem;">
              Contributing Bottles: <strong>${fund.bottlesContributing}</strong>
            </div>
          </div>
          <button class="btn btn-secondary btn-block" style="font-size:0.75rem; padding:0.4rem;" onclick="openDeliceFundLedger('${fund.key}', '${fund.name.replace(/'/g, "\\'")}')">
            View Ledger &rarr;
          </button>
        </div>
      `).join('');
    }

    // 4. Employee Salary Breakdown (4 Employees)
    const employeesGrid = document.getElementById('dpEmployeesGrid');
    if (employeesGrid && Array.isArray(employeesSummary)) {
      employeesGrid.innerHTML = employeesSummary.map(emp => `
        <div class="delice-employee-card">
          <div style="width:42px; height:42px; border-radius:50%; background:#4A102A; color:#F6F0E8; display:flex; align-items:center; justify-content:center; margin:0 auto 0.75rem; font-weight:700; font-size:1rem;">
            ${emp.slot}
          </div>
          <h4 style="font-size:1rem; color:#4A102A; margin:0 0 0.25rem;">${emp.name}</h4>
          <span style="display:inline-block; font-size:0.75rem; color:#C5A46D; font-weight:700; text-transform:uppercase; margin-bottom:0.75rem;">
            ${emp.percentage}% Profit Share
          </span>
          <div style="font-size:0.8rem; color:#6B7280; margin-bottom:0.75rem;">
            Per Bottle: <strong style="color:#181619;">৳${emp.earningsPerBottle.toFixed(2)}</strong>
          </div>
          <div style="background:#FFFFFF; border:1px solid #E0D4C3; border-radius:6px; padding:0.65rem; margin-bottom:0.5rem;">
            <div style="font-size:0.7rem; color:#6B7280; text-transform:uppercase;">Accumulated Salary</div>
            <div style="font-size:1.2rem; font-weight:700; color:#15803D;">৳${emp.totalAccumulated.toFixed(2)}</div>
          </div>
          <div style="font-size:0.75rem; color:#6B7280;">
            Bottles Sold: <strong>${emp.bottlesSold}</strong>
          </div>
        </div>
      `).join('');
    }

    // 5. Load Allocations Table
    await loadDeliceAllocations();
  } catch (err) {
    console.error('Error loading DÉLICE profit dashboard:', err);
  }
}

async function loadDeliceAllocations() {
  try {
    const dateRange = document.getElementById('dpFilterDateRange')?.value || 'all';
    const prodFilter = document.getElementById('dpFilterProduct')?.value || 'all';
    const searchVal = document.getElementById('dpFilterSearch')?.value.trim() || '';

    let startDate = '';
    let endDate = '';

    const now = new Date();
    if (dateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    } else if (dateRange === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString();
    } else if (dateRange === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString();
    } else if (dateRange === 'custom') {
      const s = document.getElementById('dpFilterStartDate')?.value;
      const e = document.getElementById('dpFilterEndDate')?.value;
      if (s) startDate = s;
      if (e) endDate = e;
    }

    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (prodFilter && prodFilter !== 'all') params.append('productId', prodFilter);
    if (searchVal) params.append('search', searchVal);

    const res = await fetchWithAuth(`/api/admin/delice-profit/allocations?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    currentDeliceAllocations = data.allocations || [];

    const tbody = document.getElementById('dpAllocationsTableBody');
    if (!tbody) return;

    if (currentDeliceAllocations.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align:center; padding:2.5rem; color:#6B7280;">
            No sale allocations recorded yet for this criteria. Allocations appear automatically as soon as an order is marked paid or delivered.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = currentDeliceAllocations.map(alloc => {
      const dateStr = new Date(alloc.createdAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const isRev = alloc.isReversal;
      const rowStyle = isRev ? 'background:#FFF5F5;' : '';
      const statusBadge = isRev
        ? '<span class="badge-status reversal">Reversal</span>'
        : '<span class="badge-status paid">Confirmed</span>';

      return `
        <tr style="${rowStyle}">
          <td style="font-size:0.8rem; color:#6B7280;">${dateStr}</td>
          <td>
            <strong style="color:#4A102A;">#${alloc.orderNumber}</strong>
          </td>
          <td>
            <div style="font-weight:600;">${alloc.customerName}</div>
            <small style="color:#6B7280;">${alloc.customerPhone || ''}</small>
          </td>
          <td>
            <div style="font-weight:600; color:#181619;">${alloc.productName}</div>
            <small style="color:#6B7280;">ID: ${alloc.productId}</small>
          </td>
          <td style="text-align:center; font-weight:700;">
            ${isRev ? `-${alloc.bottlesSold}` : alloc.bottlesSold}
          </td>
          <td>৳${alloc.unitSellingPrice.toFixed(2)}</td>
          <td style="font-weight:700;">
            ${isRev ? `-৳${alloc.totalRevenue.toFixed(2)}` : `৳${alloc.totalRevenue.toFixed(2)}`}
          </td>
          <td style="color:#C5A46D; font-weight:700;">
            ${isRev ? `-৳${alloc.totalPrincipalRepaid.toFixed(2)}` : `৳${alloc.totalPrincipalRepaid.toFixed(2)}`}
          </td>
          <td style="color:#15803D; font-weight:700;">
            ${isRev ? `-৳${alloc.totalDistributableProfit.toFixed(2)}` : `৳${alloc.totalDistributableProfit.toFixed(2)}`}
          </td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.6rem;" onclick="openDeliceSaleBreakdown('${alloc._id || alloc.idempotencyKey}')">
              Math Breakdown
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading allocations:', err);
  }
}

function handleDeliceFilterChange() {
  const dateRange = document.getElementById('dpFilterDateRange')?.value;
  const customContainer = document.getElementById('dpCustomDateContainer');
  if (customContainer) {
    customContainer.style.display = dateRange === 'custom' ? 'flex' : 'none';
  }
  loadDeliceAllocations();
}

/* --------------------------------------------------------------------------
   MODAL 1: FINANCIAL SETTINGS
   -------------------------------------------------------------------------- */
async function openDeliceSettingsModal() {
  try {
    const res = await fetchWithAuth('/api/admin/delice-profit/settings');
    if (res.ok) {
      const data = await res.json();
      const s = data.settings;
      if (s) {
        document.getElementById('dpSetPrincipal').value = s.initialPrincipal;
        document.getElementById('dpSetStock').value = s.totalInitialStock;
        document.getElementById('dpSetPrice').value = s.defaultSellingPrice;
        document.getElementById('dpSetUnitCost').value = s.unitCost;
        document.getElementById('dpSetProfit').value = (s.defaultSellingPrice - s.unitCost).toFixed(2);
        document.getElementById('dpSetPolicy').value = s.postRepaymentPolicy || 'full_revenue_as_profit';
      }
    }
  } catch (e) {}

  openModal('deliceSettingsModal');
}

// Live calculation in Settings Modal & Tab 9 Settings
document.addEventListener('input', (e) => {
  if (e.target.id === 'dpSetPrice' || e.target.id === 'dpSetUnitCost') {
    const price = parseFloat(document.getElementById('dpSetPrice')?.value) || 0;
    const unitCost = parseFloat(document.getElementById('dpSetUnitCost')?.value) || 0;
    const profitEl = document.getElementById('dpSetProfit');
    if (profitEl) {
      profitEl.value = (price - unitCost).toFixed(2);
    }
  }
  if (e.target.id === 'setSellingPrice' || e.target.id === 'setUnitCost') {
    const price = parseFloat(document.getElementById('setSellingPrice')?.value) || 0;
    const unitCost = parseFloat(document.getElementById('setUnitCost')?.value) || 0;
    const profitEl = document.getElementById('setProfitPerBottle');
    if (profitEl) {
      profitEl.value = (price - unitCost).toFixed(2);
    }
  }
});

const deliceSettingsForm = document.getElementById('deliceSettingsForm');
if (deliceSettingsForm) {
  deliceSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const principal = parseFloat(document.getElementById('dpSetPrincipal').value);
    const stock = parseInt(document.getElementById('dpSetStock').value, 10);
    const price = parseFloat(document.getElementById('dpSetPrice').value);
    const unitCost = parseFloat(document.getElementById('dpSetUnitCost').value);
    const profit = parseFloat((price - unitCost).toFixed(2));
    const policy = document.getElementById('dpSetPolicy').value;

    try {
      const res = await fetchWithAuth('/api/admin/delice-profit/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialPrincipal: principal,
          totalInitialStock: stock,
          defaultSellingPrice: price,
          unitCost,
          profitPerBottle: profit,
          postRepaymentPolicy: policy
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Financial settings updated successfully! Past sales and historical records remain completely untouched.');
        closeModal('deliceSettingsModal');
        loadDeliceProfit();
      } else {
        alert(data.error || 'Failed to update settings');
      }
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    }
  });
}

/* --------------------------------------------------------------------------
   MODAL 2: EMPLOYEE SLOTS
   -------------------------------------------------------------------------- */
async function openDeliceEmployeesModal() {
  try {
    const res = await fetchWithAuth('/api/admin/delice-profit/settings');
    if (res.ok) {
      const data = await res.json();
      const emps = data.settings?.employees || [];
      if (emps[0]) document.getElementById('dpEmpName1').value = emps[0].name;
      if (emps[1]) document.getElementById('dpEmpName2').value = emps[1].name;
      if (emps[2]) document.getElementById('dpEmpName3').value = emps[2].name;
      if (emps[3]) document.getElementById('dpEmpName4').value = emps[3].name;
    }
  } catch (e) {}

  openModal('deliceEmployeesModal');
}

const deliceEmployeesForm = document.getElementById('deliceEmployeesForm');
if (deliceEmployeesForm) {
  deliceEmployeesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name1 = document.getElementById('dpEmpName1').value.trim();
    const name2 = document.getElementById('dpEmpName2').value.trim();
    const name3 = document.getElementById('dpEmpName3').value.trim();
    const name4 = document.getElementById('dpEmpName4').value.trim();

    try {
      const res = await fetchWithAuth('/api/admin/delice-profit/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: [
            { slot: 1, name: name1 },
            { slot: 2, name: name2 },
            { slot: 3, name: name3 },
            { slot: 4, name: name4 }
          ]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Employee slots updated successfully!');
        closeModal('deliceEmployeesModal');
        loadDeliceProfit();
      } else {
        alert(data.error || 'Failed to update employee slots');
      }
    } catch (err) {
      alert('Error updating employees: ' + err.message);
    }
  });
}

/* --------------------------------------------------------------------------
   MODAL 3: RECORD FUND EXPENSE
   -------------------------------------------------------------------------- */
function openDeliceExpenseModal() {
  const form = document.getElementById('deliceExpenseForm');
  if (form) form.reset();
  const dateInput = document.getElementById('dpExpDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  openModal('deliceExpenseModal');
}

const deliceExpenseForm = document.getElementById('deliceExpenseForm');
if (deliceExpenseForm) {
  deliceExpenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fundKey = document.getElementById('dpExpFundKey').value;
    const title = document.getElementById('dpExpTitle').value.trim();
    const amount = parseFloat(document.getElementById('dpExpAmount').value);
    const expenseDate = document.getElementById('dpExpDate').value;
    const category = document.getElementById('dpExpCategory').value.trim();
    const note = document.getElementById('dpExpNote').value.trim();

    try {
      const res = await fetchWithAuth(`/api/admin/delice-profit/funds/${fundKey}/expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, amount, expenseDate, category, note })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Expense of ৳${amount.toFixed(2)} recorded and debited from fund successfully!`);
        closeModal('deliceExpenseModal');
        loadDeliceProfit();
      } else {
        alert(data.error || 'Failed to record expense');
      }
    } catch (err) {
      alert('Error recording expense: ' + err.message);
    }
  });
}

/* --------------------------------------------------------------------------
   MODAL 4: FUND TRANSACTION LEDGER
   -------------------------------------------------------------------------- */
async function openDeliceFundLedger(fundKey, fundName) {
  try {
    const res = await fetchWithAuth(`/api/admin/delice-profit/funds/${fundKey}`);
    if (!res.ok) return;
    const data = await res.json();
    const ledger = data.ledger;

    document.getElementById('dpLedgerTitle').textContent = `${ledger.fundName || fundName} — Ledger`;
    document.getElementById('dpLedgerCredits').textContent = `৳${ledger.totalCredits.toFixed(2)}`;
    document.getElementById('dpLedgerDebits').textContent = `৳${ledger.totalDebits.toFixed(2)}`;
    document.getElementById('dpLedgerBalance').textContent = `৳${ledger.currentBalance.toFixed(2)}`;

    const tbody = document.getElementById('dpLedgerTableBody');
    if (tbody) {
      if (!ledger.transactions || ledger.transactions.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:2rem; color:#6B7280;">
              No transactions recorded for this fund yet.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = ledger.transactions.map(t => {
          const isCredit = t.type === 'CREDIT';
          const typeBadge = isCredit
            ? '<span class="badge-status paid">Credit (Sale)</span>'
            : '<span class="badge-status failed">Debit (Exp)</span>';
          const dateStr = new Date(t.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          });

          return `
            <tr>
              <td style="font-size:0.8rem; color:#6B7280;">${dateStr}</td>
              <td>${typeBadge}</td>
              <td>
                <div style="font-weight:600;">${t.description}</div>
                ${t.reference ? `<small style="color:#6B7280;">Ref: ${t.reference}</small>` : ''}
              </td>
              <td style="font-weight:700; color:${isCredit ? '#15803D' : '#B91C1C'};">
                ${isCredit ? '+' : '-'}৳${t.amount.toFixed(2)}
              </td>
              <td style="font-weight:700; color:#4A102A;">
                ৳${t.runningBalance.toFixed(2)}
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    openModal('deliceLedgerModal');
  } catch (err) {
    console.error('Error fetching fund ledger:', err);
  }
}

/* --------------------------------------------------------------------------
   MODAL 5: SALE CALCULATION BREAKDOWN
   -------------------------------------------------------------------------- */
function openDeliceSaleBreakdown(allocId) {
  const alloc = currentDeliceAllocations.find(a => (a._id === allocId || a.idempotencyKey === allocId));
  if (!alloc) return;

  const orderNumEl = document.getElementById('dpBreakdownOrderNum');
  if (orderNumEl) orderNumEl.textContent = `Order #${alloc.orderNumber} — Auditable Math`;

  const container = document.getElementById('dpBreakdownContent');
  if (!container) return;

  const f = alloc.fundAllocations || {};
  const e = alloc.employeeBreakdown || [];

  container.innerHTML = `
    <div style="background:#FAF6F0; border-radius:6px; padding:1rem; margin-bottom:1.25rem; font-size:0.85rem;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
        <div><strong>Order:</strong> #${alloc.orderNumber}</div>
        <div><strong>Date:</strong> ${new Date(alloc.createdAt).toLocaleString()}</div>
        <div><strong>Customer:</strong> ${alloc.customerName} (${alloc.customerPhone || 'N/A'})</div>
        <div><strong>Fragrance:</strong> ${alloc.productName}</div>
        <div><strong>Bottles Sold:</strong> ${alloc.bottlesSold} bottle(s)</div>
        <div><strong>Selling Price / Bottle:</strong> ৳${alloc.unitSellingPrice.toFixed(2)}</div>
      </div>
    </div>

    <!-- STEP 1: REVENUE -->
    <div class="delice-math-box">
      <strong>STEP 1: PRODUCT REVENUE</strong><br>
      Revenue = Bottles (${alloc.bottlesSold}) &times; Unit Price (৳${alloc.unitSellingPrice.toFixed(2)})<br>
      <strong>= ৳${alloc.totalRevenue.toFixed(2)}</strong> (Excludes courier delivery fees)
    </div>

    <!-- STEP 2: PRINCIPAL REPAYMENT -->
    <div class="delice-math-box" style="border-left-color:#C5A46D;">
      <strong>STEP 2: CAPITAL RECOVERY (PRINCIPAL REPAYMENT)</strong><br>
      Unit Principal Repayment = ৳${alloc.unitPrincipalRepaid.toFixed(2)} / bottle<br>
      Total Principal Repaid = Bottles (${alloc.bottlesSold}) &times; ৳${alloc.unitPrincipalRepaid.toFixed(2)}<br>
      <strong>= ৳${alloc.totalPrincipalRepaid.toFixed(2)}</strong> (Directly recovers initial ৳73,260 investment; capped at outstanding balance)
    </div>

    <!-- STEP 3: DISTRIBUTABLE PROFIT -->
    <div class="delice-math-box" style="border-left-color:#15803D;">
      <strong>STEP 3: DISTRIBUTABLE PROFIT</strong><br>
      Distributable Profit = Total Revenue (৳${alloc.totalRevenue.toFixed(2)}) - Principal Repayment (৳${alloc.totalPrincipalRepaid.toFixed(2)})<br>
      <strong>= ৳${alloc.totalDistributableProfit.toFixed(2)}</strong> (Per bottle: ৳${alloc.unitDistributableProfit.toFixed(2)})
    </div>

    <!-- STEP 4: FUND ALLOCATION BREAKDOWN -->
    <div style="margin-top:1.25rem;">
      <h4 style="font-size:0.95rem; color:#4A102A; margin:0 0 0.5rem;">STEP 4: EXACT 100% FUND ALLOCATION</h4>
      <table class="admin-table" style="font-size:0.8rem;">
        <thead>
          <tr>
            <th>Fund Name</th>
            <th>%</th>
            <th>Allocated Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>NirmAN Finance Member Profit</td>
            <td>10%</td>
            <td style="font-weight:700;">৳${(f.financeMember || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>DÉLICE Development Fund</td>
            <td>20%</td>
            <td style="font-weight:700;">৳${(f.developmentFund || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Employee Salary Fund</td>
            <td>60%</td>
            <td style="font-weight:700;">৳${(f.employeeSalaryFund || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Charity Fund</td>
            <td>3%</td>
            <td style="font-weight:700;">৳${(f.charityFund || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Marketing Fund</td>
            <td>5%</td>
            <td style="font-weight:700;">৳${(f.marketingFund || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Reserve &amp; Emergency Fund</td>
            <td>2%</td>
            <td style="font-weight:700;">৳${(f.reserveFund || 0).toFixed(2)}</td>
          </tr>
          <tr style="background:#FAF6F0; font-weight:700;">
            <td>TOTAL ALLOCATED</td>
            <td>100%</td>
            <td style="color:#15803D;">৳${alloc.totalDistributableProfit.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- STEP 5: 4 EMPLOYEES SALARY SPLIT -->
    <div style="margin-top:1.25rem;">
      <h4 style="font-size:0.95rem; color:#4A102A; margin:0 0 0.5rem;">STEP 5: 4 EMPLOYEES SALARY BREAKDOWN (15% EACH)</h4>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.5rem; text-align:center;">
        ${e.map(emp => `
          <div style="background:#FAF6F0; border:1px solid #E0D4C3; border-radius:6px; padding:0.5rem;">
            <div style="font-size:0.75rem; color:#4A102A; font-weight:700;">${emp.name}</div>
            <div style="font-size:0.7rem; color:#C5A46D;">15% Share</div>
            <div style="font-size:1rem; font-weight:700; color:#15803D; margin-top:0.25rem;">৳${emp.amount.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  openModal('deliceBreakdownModal');
}

/* --------------------------------------------------------------------------
   MODAL 6: FINANCIAL REPORT
   -------------------------------------------------------------------------- */
async function openDeliceReportModal() {
  await loadDeliceReport('overall');
  openModal('deliceReportModal');
}

async function loadDeliceReport(rangeType) {
  try {
    const res = await fetchWithAuth(`/api/admin/delice-profit/report?rangeType=${rangeType}`);
    if (!res.ok) return;
    const data = await res.json();
    currentDeliceReport = data.report;
    const r = data.report;

    const container = document.getElementById('dpReportContent');
    if (!container) return;

    container.innerHTML = `
      <div style="background:#FAF6F0; border-radius:8px; padding:1.25rem; margin-bottom:1.5rem; border:1px solid #E0D4C3;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:1rem;">
          <div>
            <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:#C5A46D; font-weight:700;">Selected Period</span>
            <h4 style="margin:0.15rem 0 0; color:#4A102A; font-size:1.15rem; text-transform:capitalize;">${r.rangeType} Statement</h4>
          </div>
          <div style="font-size:0.8rem; color:#6B7280;">
            ${r.startDate ? `From ${new Date(r.startDate).toLocaleDateString()} to ${new Date(r.endDate).toLocaleDateString()}` : 'All time inception to present'}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:0.75rem; text-align:center;">
          <div style="background:#FFF; padding:0.75rem; border-radius:6px; border:1px solid #E5E7EB;">
            <div style="font-size:0.7rem; color:#6B7280;">BOTTLES SOLD</div>
            <div style="font-size:1.25rem; font-weight:700; color:#4A102A;">${r.bottlesSold}</div>
          </div>
          <div style="background:#FFF; padding:0.75rem; border-radius:6px; border:1px solid #E5E7EB;">
            <div style="font-size:0.7rem; color:#6B7280;">SALES REVENUE</div>
            <div style="font-size:1.25rem; font-weight:700; color:#181619;">৳${r.salesRevenue.toFixed(2)}</div>
          </div>
          <div style="background:#FFF; padding:0.75rem; border-radius:6px; border:1px solid #E5E7EB;">
            <div style="font-size:0.7rem; color:#6B7280;">PRINCIPAL REPAID</div>
            <div style="font-size:1.25rem; font-weight:700; color:#C5A46D;">৳${r.principalRepaid.toFixed(2)}</div>
          </div>
          <div style="background:#FFF; padding:0.75rem; border-radius:6px; border:1px solid #E5E7EB;">
            <div style="font-size:0.7rem; color:#6B7280;">PROFIT ALLOCATED</div>
            <div style="font-size:1.25rem; font-weight:700; color:#15803D;">৳${r.distributableProfit.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <h4 style="font-size:0.95rem; color:#4A102A; margin-bottom:0.75rem;">Fund Allocations in this Period</h4>
      <table class="admin-table" style="font-size:0.85rem;">
        <thead>
          <tr>
            <th>Fund Name</th>
            <th>Share (%)</th>
            <th>Allocated in Period</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>NirmAN Finance Member Profit</td>
            <td>10%</td>
            <td style="font-weight:700;">৳${r.funds.financeMember.toFixed(2)}</td>
          </tr>
          <tr>
            <td>DÉLICE Development Fund</td>
            <td>20%</td>
            <td style="font-weight:700;">৳${r.funds.developmentFund.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Employee Salary Fund (All 4 Team Members)</td>
            <td>60%</td>
            <td style="font-weight:700;">৳${r.funds.employeeSalaryFund.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Charity Fund</td>
            <td>3%</td>
            <td style="font-weight:700;">৳${r.funds.charityFund.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Marketing Fund</td>
            <td>5%</td>
            <td style="font-weight:700;">৳${r.funds.marketingFund.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Reserve &amp; Emergency Fund</td>
            <td>2%</td>
            <td style="font-weight:700;">৳${r.funds.reserveFund.toFixed(2)}</td>
          </tr>
          <tr style="background:#FAF6F0; font-weight:700;">
            <td>TOTAL DISTRIBUTABLE PROFIT</td>
            <td>100%</td>
            <td style="color:#15803D;">৳${r.distributableProfit.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Error loading report:', err);
  }
}

/* --------------------------------------------------------------------------
   CSV EXPORTS
   -------------------------------------------------------------------------- */
function exportDeliceSalesCSV() {
  if (!currentDeliceAllocations || currentDeliceAllocations.length === 0) {
    alert('No sale allocations available to export.');
    return;
  }

  const headers = [
    'Date', 'OrderNumber', 'CustomerName', 'Phone', 'Product', 'BottlesSold',
    'UnitSellingPrice', 'TotalRevenue', 'PrincipalRepaid', 'DistributableProfit',
    'FinanceMember_10pct', 'DevelopmentFund_20pct', 'EmployeeSalaryFund_60pct',
    'CharityFund_3pct', 'MarketingFund_5pct', 'ReserveFund_2pct', 'Status'
  ];

  const rows = currentDeliceAllocations.map(a => {
    const f = a.fundAllocations || {};
    return [
      `"${new Date(a.createdAt).toISOString()}"`,
      `"${a.orderNumber}"`,
      `"${(a.customerName || '').replace(/"/g, '""')}"`,
      `"${a.customerPhone || ''}"`,
      `"${(a.productName || '').replace(/"/g, '""')}"`,
      a.bottlesSold,
      a.unitSellingPrice,
      a.totalRevenue,
      a.totalPrincipalRepaid,
      a.totalDistributableProfit,
      f.financeMember || 0,
      f.developmentFund || 0,
      f.employeeSalaryFund || 0,
      f.charityFund || 0,
      f.marketingFund || 0,
      f.reserveFund || 0,
      `"${a.isReversal ? 'REVERSAL' : 'CONFIRMED'}"`
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `delice_profit_allocations_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportDeliceReportCSV() {
  if (!currentDeliceReport) {
    alert('Please generate a report first.');
    return;
  }

  const r = currentDeliceReport;
  const rows = [
    ['Metric', 'Value'],
    ['Statement Type', r.rangeType],
    ['Bottles Sold', r.bottlesSold],
    ['Total Sales Revenue', r.salesRevenue],
    ['Principal Repaid', r.principalRepaid],
    ['Distributable Profit', r.distributableProfit],
    ['NirmAN Finance Member (10%)', r.funds.financeMember],
    ['DÉLICE Development Fund (20%)', r.funds.developmentFund],
    ['Employee Salary Fund (60%)', r.funds.employeeSalaryFund],
    ['Charity Fund (3%)', r.funds.charityFund],
    ['Marketing Fund (5%)', r.funds.marketingFund],
    ['Reserve & Emergency Fund (2%)', r.funds.reserveFund]
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `delice_financial_report_${r.rangeType}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Global modal triggers for inline onclicks
window.openDeliceSettingsModal = openDeliceSettingsModal;
window.openDeliceEmployeesModal = openDeliceEmployeesModal;
window.openDeliceExpenseModal = openDeliceExpenseModal;
window.openDeliceFundLedger = openDeliceFundLedger;
window.openDeliceSaleBreakdown = openDeliceSaleBreakdown;
window.openDeliceReportModal = openDeliceReportModal;
window.loadDeliceReport = loadDeliceReport;
window.handleDeliceFilterChange = handleDeliceFilterChange;
window.exportDeliceSalesCSV = exportDeliceSalesCSV;
window.exportDeliceReportCSV = exportDeliceReportCSV;
