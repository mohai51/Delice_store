/**
 * DÉLICE — Checkout & Order Flow
 * Handles customer details validation, automated district-to-delivery-zone mapping,
 * 2-tier Bangladesh Payment Architecture (100% Online Payment vs Cash on Delivery with Advance Delivery Fee),
 * bKash/Nagad Send Money instructions to 01731101780, and order placement.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let deliveryRates = { insideDhaka: 60, outsideDhaka: 120 };
  let bkashNagadNumber = '01731101780';
  let checkoutItems = [];
  let selectedDeliveryArea = 'insideDhaka'; // default inside Dhaka
  let selectedPaymentMethod = 'full_online'; // 'full_online' (100%) or 'cod_advance'
  let selectedProvider = 'bkash'; // 'bkash' or 'nagad'

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

  // Update rates in UI cards
  const insideRateEl = document.getElementById('rateInsideDhaka');
  const outsideRateEl = document.getElementById('rateOutsideDhaka');
  if (insideRateEl) insideRateEl.textContent = `৳${deliveryRates.insideDhaka}`;
  if (outsideRateEl) outsideRateEl.textContent = `৳${deliveryRates.outsideDhaka}`;

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
        price: matched.price,
        originalPrice: matched.originalPrice,
        volume: matched.volume || '30ml',
        image: primaryImg,
        images: matched.images || [primaryImg],
        quantity: 1
      }];
    }
  } else {
    checkoutItems = (typeof DeliceCart !== 'undefined') ? DeliceCart.getItems() : [];
  }

  // 3. District selector listener — Automatic Delivery Zone Selection
  // When user selects Dhaka -> defaults to Inside Dhaka (৳60)
  // When user selects any other district -> defaults to Outside Dhaka (৳120)
  const districtSelect = document.getElementById('districtSelect');
  const deliveryRadios = document.querySelectorAll('input[name="deliveryArea"]');

  if (districtSelect) {
    // Initial sync
    const initialDistrict = districtSelect.value.toLowerCase().trim();
    if (initialDistrict === 'dhaka') {
      setDeliveryArea('insideDhaka', false);
    } else if (initialDistrict) {
      setDeliveryArea('outsideDhaka', false);
    }

    districtSelect.addEventListener('change', (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (val === 'dhaka') {
        setDeliveryArea('insideDhaka', true);
      } else if (val) {
        setDeliveryArea('outsideDhaka', true);
      }
    });
  }

  deliveryRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      setDeliveryArea(e.target.value, false);
    });
  });

  function setDeliveryArea(area, isAutoFromDistrict = false) {
    selectedDeliveryArea = area;
    deliveryRadios.forEach(r => {
      r.checked = (r.value === area);
      const card = r.closest('.delivery-radio-card');
      if (card) {
        card.classList.toggle('active', r.value === area);
      }
    });

    const areaNameEl = document.getElementById('summaryDeliveryAreaName');
    if (areaNameEl) {
      areaNameEl.textContent = area === 'insideDhaka' ? 'Inside Dhaka City' : 'Outside Dhaka';
    }

    renderOrderSummary();
    renderPaymentInstructions();
  }

  // 4. Payment Method Selection (100% Online vs COD Advance)
  const radioOnline = document.getElementById('radioFullOnline');
  const radioCOD = document.getElementById('radioCOD');
  const payCardOnline = document.getElementById('payCardOnline');
  const payCardCOD = document.getElementById('payCardCOD');

  function setPaymentMethod(method) {
    selectedPaymentMethod = method;
    if (radioOnline) radioOnline.checked = (method === 'full_online');
    if (radioCOD) radioCOD.checked = (method === 'cod_advance');

    if (payCardOnline) {
      payCardOnline.style.borderColor = method === 'full_online' ? '#4A102A' : '#E0D4C3';
      payCardOnline.style.backgroundColor = method === 'full_online' ? '#FAF6F0' : '#FFFFFF';
    }
    if (payCardCOD) {
      payCardCOD.style.borderColor = method === 'cod_advance' ? '#4A102A' : '#E0D4C3';
      payCardCOD.style.backgroundColor = method === 'cod_advance' ? '#FAF6F0' : '#FFFFFF';
    }

    renderPaymentInstructions();
    renderOrderSummary();
  }

  if (payCardOnline) payCardOnline.addEventListener('click', () => setPaymentMethod('full_online'));
  if (payCardCOD) payCardCOD.addEventListener('click', () => setPaymentMethod('cod_advance'));
  if (radioOnline) radioOnline.addEventListener('change', () => setPaymentMethod('full_online'));
  if (radioCOD) radioCOD.addEventListener('change', () => setPaymentMethod('cod_advance'));

  // 5. Render Dynamic Payment Instructions & Copy Button
  function renderPaymentInstructions() {
    const box = document.getElementById('paymentInstructionBox');
    if (!box) return;

    let subtotal = 0;
    (checkoutItems || []).forEach(item => { subtotal += item.price * item.quantity; });
    const deliveryFee = deliveryRates[selectedDeliveryArea] || 60;
    const totalOrderValue = subtotal + deliveryFee;

    const isFullOnline = (selectedPaymentMethod === 'full_online');
    const amountToSend = isFullOnline ? totalOrderValue : deliveryFee;

    const titleText = isFullOnline
      ? '100% Online Payment Instructions'
      : 'Cash on Delivery (Advance Delivery Fee Instructions)';

    const amountLabel = isFullOnline
      ? `Full Order Amount: ৳${amountToSend} (100% অগ্রিম)`
      : `Advance Delivery Fee: ৳${amountToSend} (${selectedDeliveryArea === 'insideDhaka' ? 'Inside Dhaka ৳60' : 'Outside Dhaka ৳120'})`;

    const noteText = isFullOnline
      ? 'Send Money the full amount via bKash or Nagad. You will have 0 payment due when receiving the package from courier rider.'
      : `Send Money only the delivery charge (৳${amountToSend}) to confirm your order. You will pay the remaining perfume price (৳${subtotal}) in cash to the delivery rider upon unboxing.`;

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
        <strong style="color:#4A102A; font-size:1rem; text-transform:uppercase; letter-spacing:0.05em;">
          ${titleText}
        </strong>
        <span style="font-size:0.85rem; font-weight:700; color:#FF665C; background:#FFF; border:1px solid #FF665C; padding:0.2rem 0.6rem; border-radius:4px;">
          Payable Now: ৳${amountToSend}
        </span>
      </div>

      <!-- Select Provider: bKash vs Nagad -->
      <div style="display:flex; gap:0.75rem; margin-bottom:1rem; flex-wrap:wrap;">
        <button type="button" class="provider-pill-btn" id="btnChooseBkash" onclick="window.selectProvider('bkash')" style="flex:1; min-width:140px; padding:0.6rem; border-radius:6px; border:2px solid ${selectedProvider === 'bkash' ? '#D12053' : '#E0D4C3'}; background:${selectedProvider === 'bkash' ? '#FFF0F5' : '#FFF'}; cursor:pointer; font-weight:700; font-size:0.85rem; color:${selectedProvider === 'bkash' ? '#D12053' : '#59555B'}; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
          <span style="width:10px; height:10px; border-radius:50%; background:#D12053; display:inline-block;"></span>
          bKash (Send Money)
        </button>
        <button type="button" class="provider-pill-btn" id="btnChooseNagad" onclick="window.selectProvider('nagad')" style="flex:1; min-width:140px; padding:0.6rem; border-radius:6px; border:2px solid ${selectedProvider === 'nagad' ? '#F7941D' : '#E0D4C3'}; background:${selectedProvider === 'nagad' ? '#FFF8F0' : '#FFF'}; cursor:pointer; font-weight:700; font-size:0.85rem; color:${selectedProvider === 'nagad' ? '#D96E00' : '#59555B'}; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
          <span style="width:10px; height:10px; border-radius:50%; background:#F7941D; display:inline-block;"></span>
          Nagad (Send Money)
        </button>
      </div>

      <!-- Send Money Receiver Number Box with One-Click Copy -->
      <div style="background:#FFFFFF; border:1.5px dashed #4A102A; border-radius:6px; padding:0.85rem 1rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <div style="font-size:0.75rem; text-transform:uppercase; color:#87828A; font-weight:600;">
            ${selectedProvider.toUpperCase()} Personal (Send Money) Number:
          </div>
          <div style="font-size:1.35rem; font-weight:800; color:#4A102A; font-family:monospace; letter-spacing:0.05em;" id="displayBkashNumber">
            ${bkashNagadNumber}
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="window.copyPaymentNumber(this)" style="padding:0.4rem 0.8rem; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">
          Copy Number
        </button>
      </div>

      <!-- Step by step guidance -->
      <ol style="margin:0; padding-left:1.25rem; font-size:0.825rem; color:#181619; line-height:1.6;">
        <li>আপনার <strong>${selectedProvider.toUpperCase()}</strong> অ্যাপে যান অথবা ডায়াল মেনুতে যান।</li>
        <li><strong>Send Money</strong> (সেন্ড মানি) অপশন নির্বাচন করুন।</li>
        <li>নাম্বার দিন: <strong>${bkashNagadNumber}</strong> (Personal)</li>
        <li>টাকার পরিমাণ লিখুন: <strong>৳${amountToSend}</strong></li>
        <li>রেফারেন্স লিখুন: <strong>DELICE</strong></li>
        <li>পিন দিয়ে সেন্ড মানি সম্পন্ন করুন এবং নিচের ফর্মে আপনার সেন্ডার নাম্বার ও <strong>TrxID</strong> দিন।</li>
      </ol>
      <p style="margin:0.75rem 0 0; font-size:0.785rem; color:#59555B;">
        <em>${noteText}</em>
      </p>
    `;
  }

  window.selectProvider = function(provider) {
    selectedProvider = provider;
    renderPaymentInstructions();
  };

  window.copyPaymentNumber = function(btn) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(bkashNagadNumber).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'COPIED!';
        btn.style.backgroundColor = '#15803D';
        btn.style.color = '#FFF';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.backgroundColor = '';
          btn.style.color = '';
        }, 2200);
      });
    } else {
      prompt('Copy this number:', bkashNagadNumber);
    }
  };

  // 6. Render Order Summary
  function renderOrderSummary() {
    const summaryContainer = document.getElementById('checkoutSummaryItems');
    const subtotalEl = document.getElementById('summarySubtotal');
    const deliveryEl = document.getElementById('summaryDelivery');
    const totalEl = document.getElementById('summaryTotal');
    const savingsEl = document.getElementById('summarySavings');
    const advancePaidEl = document.getElementById('summaryAdvancePaid');
    const cashDueEl = document.getElementById('summaryCashDue');
    const payBtn = document.getElementById('paySubmitBtn');

    if (!summaryContainer) return;

    if (!checkoutItems || checkoutItems.length === 0) {
      summaryContainer.innerHTML = `
        <div style="text-align:center; padding:2rem 0; color:#59555B;">
          <p>Your shopping bag is empty.</p>
          <a href="/index.html#collection" class="btn btn-secondary" style="margin-top:1rem;">Return to Shop</a>
        </div>
      `;
      if (payBtn) payBtn.disabled = true;
      if (subtotalEl) subtotalEl.textContent = '৳0';
      if (deliveryEl) deliveryEl.textContent = '৳0';
      if (totalEl) totalEl.textContent = '৳0';
      if (advancePaidEl) advancePaidEl.textContent = '৳0';
      if (cashDueEl) cashDueEl.textContent = '৳0';
      return;
    }

    if (payBtn) payBtn.disabled = false;

    let subtotal = 0;
    let savings = 0;

    summaryContainer.innerHTML = checkoutItems.map(item => {
      const itemSub = item.price * item.quantity;
      const itemSav = ((item.originalPrice || item.price) - item.price) * item.quantity;
      subtotal += itemSub;
      savings += itemSav;

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid #E0D4C3;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="${item.image}" alt="${item.name}" style="width:42px; height:48px; object-fit:contain; background:#FAF6F0; border-radius:4px; padding:2px;">
            <div>
              <div style="font-weight:600; font-size:0.9rem; color:#4A102A;">${item.name}</div>
              <div style="font-size:0.75rem; color:#87828A;">Qty: ${item.quantity} × ৳${item.price} (${item.volume || '30ml'})</div>
            </div>
          </div>
          <div style="font-weight:600; color:#181619;">৳${itemSub}</div>
        </div>
      `;
    }).join('');

    const deliveryFee = deliveryRates[selectedDeliveryArea] || 60;
    const totalOrderValue = subtotal + deliveryFee;

    const isFullOnline = (selectedPaymentMethod === 'full_online');
    const advancePaid = isFullOnline ? totalOrderValue : deliveryFee;
    const cashDue = isFullOnline ? 0 : subtotal;

    if (subtotalEl) subtotalEl.textContent = `৳${subtotal}`;
    if (deliveryEl) deliveryEl.textContent = `৳${deliveryFee}`;
    if (totalEl) totalEl.textContent = `৳${totalOrderValue}`;
    if (advancePaidEl) advancePaidEl.textContent = `৳${advancePaid}`;
    if (cashDueEl) cashDueEl.textContent = `৳${cashDue}`;
    if (savingsEl) {
      savingsEl.textContent = savings > 0 ? `Opening Offer Savings: ৳${savings}` : '';
    }

    if (payBtn) {
      payBtn.textContent = isFullOnline
        ? `Confirm Order & Pay ৳${totalOrderValue} Online`
        : `Confirm Order & Pay ৳${deliveryFee} Advance Delivery Fee`;
    }
  }

  // Initial render of summary & instruction
  renderOrderSummary();
  renderPaymentInstructions();

  // 7. Form Submission & Order Creation
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!checkoutItems || checkoutItems.length === 0) {
        alert('Your shopping bag is empty. Please add items before proceeding.');
        return;
      }

      const fullName = document.getElementById('fullName').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const email = document.getElementById('email')?.value.trim() || '';
      const district = document.getElementById('districtSelect').value.trim();
      const address = document.getElementById('deliveryAddress').value.trim();
      const orderNotes = document.getElementById('orderNotes')?.value.trim() || '';
      const senderNumber = document.getElementById('senderNumber').value.trim();
      const transactionId = document.getElementById('transactionId').value.trim();

      // Validation
      if (!fullName) {
        alert('Please enter your full recipient name.');
        return;
      }

      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      const cleanedPhone = phone.replace(/[\s-]/g, '');
      if (!bdPhoneRegex.test(cleanedPhone)) {
        alert('Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).');
        return;
      }

      if (!district) {
        alert('Please select your delivery district.');
        return;
      }

      if (!address || address.length < 8) {
        alert('Please provide your complete delivery address (street, building/house, area/thana).');
        return;
      }

      const cleanedSender = senderNumber.replace(/[\s-]/g, '');
      if (!bdPhoneRegex.test(cleanedSender)) {
        alert('Please enter a valid 11-digit bKash / Nagad sender number from which money was sent.');
        return;
      }

      if (!transactionId || transactionId.length < 4) {
        alert('Please enter the bKash or Nagad Transaction ID (TrxID).');
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
        Confirming Your Order...
      `;

      try {
        const payload = {
          customer: {
            fullName,
            phone: cleanedPhone,
            email,
            district,
            address,
            orderNotes
          },
          deliveryArea: selectedDeliveryArea,
          items: checkoutItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity
          })),
          paymentMethod: selectedPaymentMethod,
          paymentProvider: selectedProvider,
          senderNumber: cleanedSender,
          transactionId: transactionId.toUpperCase()
        };

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Clear shopping cart
          if (typeof DeliceCart !== 'undefined') {
            DeliceCart.clearCart();
          }
          // Redirect to payment success receipt page
          window.location.href = result.redirectUrl || `/payment-success.html?orderId=${result.order?.orderNumber}&tranId=${result.order?.transactionId}`;
        } else {
          throw new Error(result.error || 'Failed to place order.');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        alert(`Order submission error: ${err.message || 'Could not submit order. Please try again.'}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
});
