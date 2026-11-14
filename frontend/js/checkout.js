/**
 * DÉLICE — Streamlined Easy Checkout Flow (Mobile & Non-tech Friendly)
 * 1. Recipient Details (Name & Phone)
 * 2. District (Auto Inside Dhaka City ৳60 / Dropdown for others ৳120) & Detailed Address
 * 3. Order Summary (Items, Delivery ৳60/৳120, Prominent ৳51 Savings Highlight, Total)
 * 4. Payment (Send Money Note to 01731101780, Side-by-side bKash & Nagad with official themes, Sender Number & TrxID)
 */

document.addEventListener('DOMContentLoaded', async () => {
  let deliveryRates = { insideDhaka: 60, outsideDhaka: 120 };
  let bkashNagadNumber = '01731101780';
  let checkoutItems = [];
  let selectedDeliveryArea = 'insideDhaka'; // Default Inside Dhaka City
  let selectedProvider = 'bkash'; // Default bKash

  // 1. Fetch system delivery settings & payment number
  try {
    const res = await fetch('/api/settings/public');
    if (res.ok) {
      const data = await res.json();
      if (data.deliveryChargeInsideDhaka !== undefined) {
        deliveryRates.insideDhaka = Number(data.deliveryChargeInsideDhaka);
      }
      if (data.deliveryChargeOutsideDhaka !== undefined) {
        deliveryRates.outsideDhaka = Number(data.deliveryChargeOutsideDhaka);
      }
      if (data.bkashNagadNumber) {
        bkashNagadNumber = data.bkashNagadNumber;
      }
    }
  } catch (err) {
    console.warn('Could not load custom settings, using defaults.', err);
  }

  // Update wallet display number
  const displayWalletEl = document.getElementById('displayWalletNumber');
  if (displayWalletEl) displayWalletEl.textContent = bkashNagadNumber;

  // 2. Check if this is a Direct Buy Now
  const urlParams = new URLSearchParams(window.location.search);
  const buyNowId = urlParams.get('buyNow');

  if (buyNowId) {
    let matched = null;
    try {
      const pRes = await fetch(`/api/products/${buyNowId}?t=${Date.now()}`);
      if (pRes.ok) {
        matched = await pRes.json();
      }
    } catch (e) {
      console.warn('Direct product fetch failed, trying fallback:', e);
    }

    if (!matched && typeof DEFAULT_PRODUCTS !== 'undefined') {
      matched = DEFAULT_PRODUCTS.find(p => p.id === buyNowId);
    }

    if (matched) {
      const primaryImg = (matched.images && matched.images.length > 0) ? matched.images[0] : (matched.image || '/assets/images/bloom.svg');
      checkoutItems = [{
        id: matched.id,
        name: matched.name,
        price: Number(matched.price) || 799,
        originalPrice: Number(matched.originalPrice) || 850,
        volume: matched.volume || '30ml',
        image: primaryImg,
        images: matched.images || [primaryImg],
        quantity: 1
      }];
    }
  } else {
    checkoutItems = (typeof DeliceCart !== 'undefined') ? DeliceCart.getItems() : [];
  }

  // 3. District selector listener — Auto Delivery Charge calculation
  const districtSelect = document.getElementById('districtSelect');
  if (districtSelect) {
    // Initial sync
    syncDeliveryAreaFromDistrict(districtSelect.value);

    districtSelect.addEventListener('change', (e) => {
      syncDeliveryAreaFromDistrict(e.target.value);
    });
  }

  function syncDeliveryAreaFromDistrict(districtVal) {
    const isDhaka = (districtVal || '').trim().toLowerCase() === 'dhaka';
    selectedDeliveryArea = isDhaka ? 'insideDhaka' : 'outsideDhaka';

    const areaNameEl = document.getElementById('summaryDeliveryAreaName');
    if (areaNameEl) {
      areaNameEl.textContent = isDhaka ? 'Inside Dhaka City' : 'Outside Dhaka';
    }

    renderOrderSummary();
  }

  // 4. Provider Selection (bKash vs Nagad side-by-side)
  window.selectProvider = function(provider) {
    selectedProvider = provider;
    const btnBkash = document.getElementById('btnChooseBkash');
    const btnNagad = document.getElementById('btnChooseNagad');

    if (btnBkash) btnBkash.classList.toggle('active', provider === 'bkash');
    if (btnNagad) btnNagad.classList.toggle('active', provider === 'nagad');
  };

  // 5. One-Click Copy Wallet Number
  window.copyPaymentNumber = function(btn) {
    const textToCopy = bkashNagadNumber;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showCopiedFeedback(btn);
      }).catch(() => {
        fallbackCopy(textToCopy, btn);
      });
    } else {
      fallbackCopy(textToCopy, btn);
    }
  };

  function fallbackCopy(text, btn) {
    try {
      const tempInput = document.createElement('input');
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showCopiedFeedback(btn);
    } catch (e) {
      prompt('Copy wallet number:', text);
    }
  }

  function showCopiedFeedback(btn) {
    const origHtml = btn.innerHTML;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>কপি হয়েছে!</span>
    `;
    btn.style.backgroundColor = '#15803D';
    btn.style.color = '#FFFFFF';
    btn.style.borderColor = '#15803D';

    setTimeout(() => {
      btn.innerHTML = origHtml;
      btn.style.backgroundColor = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2200);
  }

  // 6. Render Order Summary & Dynamic Figures
  function renderOrderSummary() {
    const summaryContainer = document.getElementById('checkoutSummaryItems');
    const subtotalEl = document.getElementById('summarySubtotal');
    const deliveryEl = document.getElementById('summaryDelivery');
    const totalEl = document.getElementById('summaryTotal');
    const payableAmountEl = document.getElementById('displayPayableAmount');
    const savingsAmountEl = document.getElementById('savingsAmountText');
    const savingsBox = document.getElementById('savingsHighlightBox');
    const payBtn = document.getElementById('paySubmitBtn');

    if (!summaryContainer) return;

    if (!checkoutItems || checkoutItems.length === 0) {
      summaryContainer.innerHTML = `
        <div style="text-align:center; padding:1.5rem 0; color:#59555B;">
          <p style="margin-bottom:0.75rem;">আপনার শপিং ব্যাগটি খালি রয়েছে।</p>
          <a href="/index.html#collection" class="btn btn-secondary btn-sm">প্রোডাক্ট কালেকশন দেখুন &rarr;</a>
        </div>
      `;
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = 'শপিং ব্যাগ খালি';
      }
      if (subtotalEl) subtotalEl.textContent = '৳0';
      if (deliveryEl) deliveryEl.textContent = '৳0';
      if (totalEl) totalEl.textContent = '৳0';
      if (payableAmountEl) payableAmountEl.textContent = '৳0';
      if (savingsBox) savingsBox.style.display = 'none';
      return;
    }

    if (payBtn) payBtn.disabled = false;

    let subtotal = 0;
    let savings = 0;

    summaryContainer.innerHTML = checkoutItems.map(item => {
      const price = Number(item.price) || 799;
      const orig = Number(item.originalPrice) || 850;
      const itemSub = price * item.quantity;
      const itemSav = (orig - price) * item.quantity;

      subtotal += itemSub;
      savings += itemSav;

      return `
        <div class="summary-item-row">
          <div class="summary-item-left">
            <img src="${item.image}" alt="${item.name}" class="summary-item-thumb">
            <div>
              <div class="summary-item-name">${item.name}</div>
              <div class="summary-item-meta">${item.volume || '30ml'} Eau De Parfum &bull; Qty: ${item.quantity}</div>
            </div>
          </div>
          <div class="summary-item-price">৳${itemSub}</div>
        </div>
      `;
    }).join('');

    const deliveryFee = deliveryRates[selectedDeliveryArea] || (selectedDeliveryArea === 'insideDhaka' ? 60 : 120);
    const total = subtotal + deliveryFee;

    if (subtotalEl) subtotalEl.textContent = `৳${subtotal}`;
    if (deliveryEl) deliveryEl.textContent = `৳${deliveryFee}`;
    if (totalEl) totalEl.textContent = `৳${total}`;
    if (payableAmountEl) payableAmountEl.textContent = `৳${total}`;

    // Highlight that ৳51 is saved (or ৳51 * qty)
    if (savingsBox) {
      savingsBox.style.display = 'flex';
      if (savingsAmountEl) {
        savingsAmountEl.textContent = `৳${savings > 0 ? savings : 51}`;
      }
    }

    if (payBtn) {
      payBtn.textContent = `অর্ডার কনফার্ম করুন • ৳${total}`;
    }
  }

  // Initial order summary render
  renderOrderSummary();

  // 7. Form Submission & Order Placement
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!checkoutItems || checkoutItems.length === 0) {
        alert('আপনার শপিং ব্যাগটি খালি রয়েছে। অনুগ্রহ করে প্রোডাক্ট নির্বাচন করুন।');
        return;
      }

      const fullName = document.getElementById('fullName').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const district = document.getElementById('districtSelect').value.trim();
      const address = document.getElementById('deliveryAddress').value.trim();
      const senderNumber = document.getElementById('senderNumber').value.trim();
      const transactionId = document.getElementById('transactionId').value.trim();

      // Validation with friendly Bengali error messages
      if (!fullName) {
        alert('অনুগ্রহ করে আপনার পুরো নাম লিখুন।');
        document.getElementById('fullName').focus();
        return;
      }

      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      const cleanedPhone = phone.replace(/[\s-]/g, '');
      if (!bdPhoneRegex.test(cleanedPhone)) {
        alert('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)।');
        document.getElementById('phone').focus();
        return;
      }

      if (!district) {
        alert('অনুগ্রহ করে আপনার ডেলিভারি জেলা সিলেক্ট করুন।');
        document.getElementById('districtSelect').focus();
        return;
      }

      if (!address || address.length < 5) {
        alert('অনুগ্রহ করে আপনার পূর্ণাঙ্গ ডেলিভারি ঠিকানা লিখুন (বাসা/রোড নং, এলাকা, থানা)।');
        document.getElementById('deliveryAddress').focus();
        return;
      }

      const cleanedSender = senderNumber.replace(/[\s-]/g, '');
      if (!bdPhoneRegex.test(cleanedSender)) {
        alert('যে বিকাশ বা নগদ নাম্বার থেকে Send Money করেছেন, সেই ১১ ডিজিটের নাম্বারটি দিন।');
        document.getElementById('senderNumber').focus();
        return;
      }

      if (!transactionId || transactionId.length < 4) {
        alert('অনুগ্রহ করে Send Money করার পর প্রাপ্ত Transaction ID (TrxID) দিন।');
        document.getElementById('transactionId').focus();
        return;
      }

      const submitBtn = document.getElementById('paySubmitBtn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        অর্ডার কনফার্ম করা হচ্ছে...
      `;

      try {
        const payload = {
          customer: {
            fullName,
            phone: cleanedPhone,
            email: '',
            district,
            address,
            orderNotes: ''
          },
          deliveryArea: selectedDeliveryArea,
          items: checkoutItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity
          })),
          paymentMethod: 'full_online',
          paymentProvider: selectedProvider,
          senderNumber: cleanedSender,
          transactionId: transactionId.toUpperCase().trim()
        };

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Clear shopping bag
          if (typeof DeliceCart !== 'undefined') {
            DeliceCart.clearCart();
          }
          // Redirect to payment success receipt page
          window.location.href = result.redirectUrl || `/payment-success.html?orderId=${result.order?.orderNumber}&tranId=${result.order?.transactionId}`;
        } else {
          throw new Error(result.error || 'অর্ডার সাবমিট করতে সমস্যা হয়েছে।');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        alert(`অর্ডার ত্রুটি: ${err.message || 'অনুগ্রহ করে পুনরায় চেষ্টা করুন।'}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
});
