/**
 * DÉLICE — Minimal Ultra-Fast Checkout Flow
 * - 1. Delivery Details (Name, Phone, District, Address)
 * - 2. Order Summary (Items, Delivery ৳60/৳120, Savings Highlight ৳51, Total)
 * - 3. Payment (bKash & Nagad with uploaded logos, Sender Number, TrxID)
 */

document.addEventListener('DOMContentLoaded', async () => {
  let deliveryRates = { insideDhaka: 60, outsideDhaka: 120 };
  let bkashNagadNumber = '01731101780';
  let checkoutItems = [];
  let selectedDeliveryArea = 'insideDhaka';
  let selectedCampusHub = null;
  let selectedProvider = 'bkash';
  let selectedPaymentMethod = 'full_online';

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

  // 3. District selector listener — Auto Delivery Charge calculation & Campus Hub Sync
  const districtSelect = document.getElementById('districtSelect');
  if (districtSelect) {
    districtSelect.addEventListener('change', (e) => {
      const val = (e.target.value || '').trim();
      if (val.startsWith('Campus-')) {
        const hub = val.replace('Campus-', '').toUpperCase();
        selectCampusHub(hub);
      } else {
        if (selectedCampusHub) {
          deselectCampusHub(false);
        }
        syncDeliveryAreaFromDistrict(val);
      }
    });
  }

  function syncDeliveryAreaFromDistrict(districtVal) {
    const isDhaka = (districtVal || '').trim().toLowerCase() === 'dhaka';
    selectedDeliveryArea = isDhaka ? 'insideDhaka' : 'outsideDhaka';

    const areaNameEl = document.getElementById('summaryDeliveryAreaName');
    if (areaNameEl) {
      areaNameEl.textContent = isDhaka ? 'Dhaka' : districtVal;
    }

    renderOrderSummary();
  }

  // 4. Payment Method Choice (Online vs COD Advance)
  const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
  paymentMethodRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedPaymentMethod = e.target.value;
      const cardOnline = document.getElementById('payTypeCardOnline');
      const cardCOD = document.getElementById('payTypeCardCOD');
      if (cardOnline) cardOnline.classList.toggle('active', selectedPaymentMethod === 'full_online');
      if (cardCOD) cardCOD.classList.toggle('active', selectedPaymentMethod === 'cod_advance');
      renderOrderSummary();
    });
  });

  // 5. Provider Selection (Native Radio Change & Label Class Sync)
  const providerRadios = document.querySelectorAll('input[name="paymentProvider"]');
  providerRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      setProvider(e.target.value);
    });
  });

  function setProvider(provider) {
    selectedProvider = provider;
    const labelBkash = document.getElementById('labelBkash');
    const labelNagad = document.getElementById('labelNagad');

    if (labelBkash) labelBkash.classList.toggle('active', provider === 'bkash');
    if (labelNagad) labelNagad.classList.toggle('active', provider === 'nagad');
  }

  // 6. Campus Delivery Hubs (Free Delivery ৳0 for UIU, NSU, IUB, AIUB, BRACU, EWU)
  const hubButtons = document.querySelectorAll('.campus-hub-btn');
  const hubRadios = document.querySelectorAll('input[name="selectedCampusHubRadio"]');
  const activeHubBanner = document.getElementById('campusHubActiveBanner');
  const selectedHubDisplay = document.getElementById('selectedHubDisplay');
  const btnRemoveHub = document.getElementById('btnRemoveHub');
  const hiddenHubInput = document.getElementById('selectedCampusHubInput');

  // Listen for native radio changes
  hubRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const hub = (e.target.value || '').trim().toUpperCase();
      if (hub) {
        selectCampusHub(hub);
      } else {
        deselectCampusHub();
      }
    });
  });

  // Direct label/button clicks
  hubButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hub = (btn.getAttribute('data-hub') || btn.dataset.hub || '').trim().toUpperCase();
      if (!hub) return;
      selectCampusHub(hub);
    });
  });

  if (btnRemoveHub) {
    btnRemoveHub.addEventListener('click', (e) => {
      e.preventDefault();
      deselectCampusHub();
    });
  }

  function selectCampusHub(hubCode) {
    selectedCampusHub = hubCode;
    if (hiddenHubInput) hiddenHubInput.value = hubCode;

    // Check matching radio
    const matchingRadio = document.querySelector(`input[name="selectedCampusHubRadio"][value="${hubCode}"]`);
    if (matchingRadio) matchingRadio.checked = true;

    // Sync district dropdown
    if (districtSelect) {
      districtSelect.value = `Campus-${hubCode}`;
    }

    hubButtons.forEach(b => {
      const bHub = (b.getAttribute('data-hub') || b.dataset.hub || '').trim().toUpperCase();
      b.classList.toggle('active', bHub === hubCode);
    });

    if (activeHubBanner) activeHubBanner.style.display = 'flex';
    if (selectedHubDisplay) selectedHubDisplay.textContent = hubCode;
    renderOrderSummary();
  }

  function deselectCampusHub(syncDistrict = true) {
    selectedCampusHub = null;
    if (hiddenHubInput) hiddenHubInput.value = '';

    const noneRadio = document.getElementById('hubRadioNone');
    if (noneRadio) noneRadio.checked = true;

    if (syncDistrict && districtSelect && districtSelect.value.startsWith('Campus-')) {
      districtSelect.value = 'Dhaka';
      selectedDeliveryArea = 'insideDhaka';
    }

    hubButtons.forEach(b => b.classList.remove('active'));
    if (activeHubBanner) activeHubBanner.style.display = 'none';
    renderOrderSummary();
  }

  // Check initial state from district or hidden input
  if (districtSelect && districtSelect.value.startsWith('Campus-')) {
    selectCampusHub(districtSelect.value.replace('Campus-', '').toUpperCase());
  } else if (hiddenHubInput && hiddenHubInput.value) {
    selectCampusHub(hiddenHubInput.value.trim().toUpperCase());
  }

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
    btn.textContent = 'Copied!';
    btn.style.backgroundColor = '#15803D';
    btn.style.color = '#FFFFFF';
    btn.style.borderColor = '#15803D';

    setTimeout(() => {
      btn.innerHTML = origHtml;
      btn.style.backgroundColor = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2000);
  }

  // 6. Render Order Summary
  function renderOrderSummary() {
    const summaryContainer = document.getElementById('checkoutSummaryItems');
    const subtotalEl = document.getElementById('summarySubtotal');
    const deliveryEl = document.getElementById('summaryDelivery');
    const totalEl = document.getElementById('summaryTotal');
    const payBtn = document.getElementById('paySubmitBtn');

    if (!summaryContainer) return;

    if (!checkoutItems || checkoutItems.length === 0) {
      summaryContainer.innerHTML = `
        <div style="text-align:center; padding:1rem 0; color:#59555B; font-size:0.85rem;">
          <p style="margin:0 0 0.5rem;">Your shopping bag is empty.</p>
          <a href="/index.html#collection" class="btn btn-secondary btn-sm" style="font-size:0.75rem;">View Collection &rarr;</a>
        </div>
      `;
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = 'Bag is Empty';
      }
      if (subtotalEl) subtotalEl.textContent = '৳0';
      if (deliveryEl) deliveryEl.textContent = '৳0';
      if (totalEl) totalEl.textContent = '৳0';
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
        <div class="summary-item-mini">
          <div class="summary-item-left-mini">
            <img src="${item.image}" alt="${item.name}" class="summary-item-thumb-mini">
            <div>
              <div class="summary-item-name-mini">${item.name}</div>
              <div class="summary-item-meta-mini">${item.volume || '30ml'} EDP &bull; Qty: ${item.quantity}</div>
            </div>
          </div>
          <div class="summary-item-price-mini">৳${itemSub}</div>
        </div>
      `;
    }).join('');

    const isFreeHub = Boolean(selectedCampusHub);
    const baseDeliveryFee = deliveryRates[selectedDeliveryArea] || (selectedDeliveryArea === 'insideDhaka' ? 60 : 120);
    const deliveryFee = isFreeHub ? 0 : baseDeliveryFee;
    const total = subtotal + deliveryFee;

    if (subtotalEl) subtotalEl.textContent = `৳${subtotal}`;
    if (deliveryEl) {
      if (isFreeHub) {
        deliveryEl.innerHTML = `<span style="color:#15803D; font-weight:800;">৳0 (FREE)</span>`;
      } else {
        deliveryEl.textContent = `৳${deliveryFee}`;
      }
    }
    if (totalEl) totalEl.textContent = `৳${total}`;

    // Update Area Name in summary
    const areaNameEl = document.getElementById('summaryDeliveryAreaName');
    if (areaNameEl) {
      if (isFreeHub) {
        areaNameEl.textContent = `Campus Hub (${selectedCampusHub})`;
      } else {
        const isDhaka = (document.getElementById('districtSelect')?.value || '').trim().toLowerCase() === 'dhaka';
        areaNameEl.textContent = isDhaka ? 'Dhaka' : (document.getElementById('districtSelect')?.value || 'Dhaka');
      }
    }

    // Update savings text if element exists
    const savingsPill = document.querySelector('.savings-pill');
    if (savingsPill) {
      savingsPill.textContent = `-৳${savings > 0 ? savings : 51}`;
    }

    // Dynamic Payable Amount & COD Notice
    const bannerLabel = document.getElementById('bannerAmountLabel');
    const bannerValue = document.getElementById('bannerAmountValue');
    const codNoticeLine = document.getElementById('codNoticeLine');
    const codCashDueAmount = document.getElementById('codCashDueAmount');
    const senderInput = document.getElementById('senderNumber');
    const trxInput = document.getElementById('transactionId');
    const labelSender = document.getElementById('labelSenderNumber');
    const labelTrx = document.getElementById('labelTransactionId');
    const sendMoneySection = document.getElementById('sendMoneyDetailsSection');
    const campusCodHandoverBox = document.getElementById('campusCodHandoverBox');
    const campusCodCashDue = document.getElementById('campusCodCashDue');
    const campusCodHubName = document.getElementById('campusCodHubName');

    const isFreeHubCOD = (Boolean(selectedCampusHub) && selectedPaymentMethod === 'cod_advance');

    if (isFreeHubCOD) {
      // HIDE Send Money Details completely when Campus Hub + Cash on Delivery is active!
      if (sendMoneySection) sendMoneySection.style.display = 'none';
      if (campusCodHandoverBox) campusCodHandoverBox.style.display = 'block';
      if (campusCodCashDue) campusCodCashDue.textContent = subtotal;
      if (campusCodHubName) campusCodHubName.textContent = selectedCampusHub;

      if (senderInput) senderInput.required = false;
      if (trxInput) trxInput.required = false;

      if (payBtn) payBtn.innerHTML = `<span id="btnPayText">Confirm Order • Pay ৳${subtotal} Hand to Hand at ${selectedCampusHub}</span>`;
    } else {
      // SHOW Send Money Details (for Online Payment OR regular Home Delivery with advance fee)
      if (sendMoneySection) sendMoneySection.style.display = 'block';
      if (campusCodHandoverBox) campusCodHandoverBox.style.display = 'none';

      if (senderInput) senderInput.required = true;
      if (trxInput) trxInput.required = true;
      if (labelSender) labelSender.textContent = 'Sender Number *';
      if (labelTrx) labelTrx.textContent = 'Transaction ID (TrxID) *';

      if (selectedPaymentMethod === 'full_online') {
        if (bannerLabel) bannerLabel.textContent = isFreeHub ? 'Payable Now (100% Online • Free Hub):' : 'Payable Now (100% Online):';
        if (bannerValue) bannerValue.textContent = `৳${total}`;
        if (codNoticeLine) codNoticeLine.style.display = 'none';
        if (payBtn) payBtn.innerHTML = `<span id="btnPayText">Confirm Order • Pay ৳${total} Online</span>`;
      } else {
        // Regular home delivery COD: ৳60 or ৳120 advance fee
        if (bannerLabel) bannerLabel.textContent = 'Payable Now (Advance Delivery):';
        if (bannerValue) bannerValue.textContent = `৳${deliveryFee}`;
        if (codNoticeLine) codNoticeLine.style.display = 'flex';
        if (codCashDueAmount) codCashDueAmount.textContent = `৳${subtotal}`;
        if (payBtn) payBtn.innerHTML = `<span id="btnPayText">Confirm Order • Pay ৳${deliveryFee} Advance</span>`;
      }
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
        alert('Your shopping bag is empty.');
        return;
      }

      const fullName = document.getElementById('fullName').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const district = document.getElementById('districtSelect').value.trim();
      const address = document.getElementById('deliveryAddress').value.trim();
      const senderNumber = document.getElementById('senderNumber').value.trim();
      const transactionId = document.getElementById('transactionId').value.trim();

      if (!fullName) {
        alert('Please enter your full name.');
        document.getElementById('fullName').focus();
        return;
      }

      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      const cleanedPhone = phone.replace(/[\s-]/g, '');
      if (!bdPhoneRegex.test(cleanedPhone)) {
        alert('Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX).');
        document.getElementById('phone').focus();
        return;
      }

      if (!district) {
        alert('Please select your delivery district.');
        document.getElementById('districtSelect').focus();
        return;
      }

      if (!address || address.length < 5) {
        alert('Please enter your delivery address.');
        document.getElementById('deliveryAddress').focus();
        return;
      }

      const checkedRadio = document.querySelector('input[name="selectedCampusHubRadio"]:checked');
      const radioHub = (checkedRadio && checkedRadio.value) ? checkedRadio.value.trim().toUpperCase() : '';
      const domHub = (document.getElementById('selectedCampusHubInput')?.value || '').trim().toUpperCase();
      const districtVal = (document.getElementById('districtSelect')?.value || '').trim();
      const districtHub = districtVal.startsWith('Campus-') ? districtVal.replace('Campus-', '').toUpperCase() : '';

      const activeCampusHub = radioHub || domHub || districtHub || (selectedCampusHub ? selectedCampusHub.trim().toUpperCase() : '');
      const isFreeHubCOD = (Boolean(activeCampusHub) && selectedPaymentMethod === 'cod_advance');

      let cleanedSender = senderNumber ? senderNumber.replace(/[\s-]/g, '') : '';
      let trxIdClean = transactionId ? transactionId.toUpperCase().trim() : '';

      if (isFreeHubCOD) {
        if (!cleanedSender) cleanedSender = cleanedPhone;
        if (!trxIdClean) trxIdClean = `CAMPUS-COD-${Date.now().toString().slice(-6)}`;
      } else {
        if (!bdPhoneRegex.test(cleanedSender)) {
          alert('Please enter the 11-digit sender mobile number.');
          document.getElementById('senderNumber').focus();
          return;
        }

        if (!trxIdClean || trxIdClean.length < 4) {
          alert('Please enter the Transaction ID (TrxID).');
          document.getElementById('transactionId').focus();
          return;
        }
      }

      const submitBtn = document.getElementById('paySubmitBtn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      submitBtn.innerHTML = `
        <span class="btn-spinner"></span>
        <span>Securing Your Order...</span>
      `;

      try {
        const payload = {
          customer: {
            fullName,
            phone: cleanedPhone,
            email: '',
            district: districtVal.startsWith('Campus-') ? 'Dhaka' : districtVal,
            address,
            orderNotes: ''
          },
          deliveryArea: activeCampusHub ? 'campusHub' : selectedDeliveryArea,
          deliveryHub: activeCampusHub || '',
          items: checkoutItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity
          })),
          paymentMethod: selectedPaymentMethod,
          paymentProvider: isFreeHubCOD ? 'hand_cash' : selectedProvider,
          senderNumber: cleanedSender,
          transactionId: trxIdClean
        };

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          if (typeof DeliceCart !== 'undefined') {
            DeliceCart.clearCart();
          }
          window.location.href = result.redirectUrl || `/payment-success.html?orderId=${result.order?.orderNumber}&tranId=${result.order?.transactionId}`;
        } else {
          throw new Error(result.error || 'Failed to submit order.');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        alert(`Order error: ${err.message || 'Please check your details and try again.'}`);
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
});
