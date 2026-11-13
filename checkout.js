/* =====================================================================
   CHECKOUT.JS — order form, validation, order summary, real order
   submission (Supabase) and email notifications (EmailJS).

   IMPORTANT: This file intentionally does NOT fake a successful order.
   If the backend (Supabase) has not been configured yet in
   config/store-config.js, checkout clearly tells the store owner /
   tester that order submission is not connected, instead of pretending
   the order went through. See README.md "Connecting the backend".
   ===================================================================== */

let isSubmitting = false;

function populateLocationDropdowns() {
  const provinceSelect = document.getElementById("province");
  const citySelect = document.getElementById("city");
  if (!provinceSelect || !citySelect) return;

  const provinces = Object.keys(STORE_CONFIG.locations);
  provinceSelect.innerHTML = `<option value="">Select Province</option>` +
    provinces.map(p => `<option value="${p}">${p}</option>`).join("");

  provinceSelect.addEventListener("change", () => {
    const cities = STORE_CONFIG.locations[provinceSelect.value] || [];
    citySelect.innerHTML = `<option value="">Select City</option>` +
      cities.map(c => `<option value="${c}">${c}</option>`).join("");
  });
}

function renderOrderSummary() {
  const { items, subtotal, delivery, grandTotal } = Cart.getTotals();
  const listEl = document.getElementById("orderSummaryList");
  const totalsEl = document.getElementById("orderSummaryTotals");

  if (items.length === 0) {
    document.getElementById("checkoutContent").innerHTML = `
      <div class="text-center" style="padding:60px 20px;">
        <h2>Your cart is empty</h2>
        <p style="margin:14px 0 20px;color:#666;">Add a few signature scents before checking out.</p>
        <a href="index.html" class="btn btn-gold">Continue Shopping</a>
      </div>`;
    return false;
  }

  listEl.innerHTML = items.map(i => `
    <div class="order-summary-item">
      <span>${i.name} (${i.size}) &times; ${i.qty}</span>
      <span>${Cart.formatPrice(i.lineTotal)}</span>
    </div>
  `).join("");

  totalsEl.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${Cart.formatPrice(subtotal)}</span></div>
    <div class="summary-row"><span>Delivery</span><span>${delivery === 0 ? "Free" : Cart.formatPrice(delivery)}</span></div>
    <div class="summary-row total"><span>Grand Total</span><span>${Cart.formatPrice(grandTotal)}</span></div>
  `;
  return true;
}

function renderPaymentOptions() {
  const container = document.getElementById("paymentOptions");
  if (!container) return;
  const p = STORE_CONFIG.payments;
  let html = "";

  if (p.cod.enabled) {
    html += `
      <label class="payment-option">
        <input type="radio" name="paymentMethod" value="cod" checked>
        <strong>${p.cod.label}</strong>
        <div style="font-size:0.82rem;color:#666;margin-top:4px;">${p.cod.description}</div>
      </label>`;
  }

  if (p.bankTransfer.enabled) {
    html += `
      <label class="payment-option">
        <input type="radio" name="paymentMethod" value="bank">
        <strong>${p.bankTransfer.label}</strong>
        <div class="bank-details-box" id="bankDetailsBox">
          <div><strong>Bank:</strong> ${p.bankTransfer.bankName}</div>
          <div><strong>Account Holder:</strong> ${p.bankTransfer.accountHolder}</div>
          <div><strong>Account Number:</strong> ${p.bankTransfer.accountNumber}</div>
          <div style="margin-top:8px;">${p.bankTransfer.instructions}</div>
          <div class="form-group" style="margin-top:14px;">
            <label for="paymentReference">Payment Reference / Transaction ID</label>
            <input type="text" id="paymentReference" name="paymentReference" placeholder="e.g. last 6 digits of transaction ID">
          </div>
          <div class="form-group">
            <label for="receiptUpload">Upload Payment Receipt (optional)</label>
            <input type="file" id="receiptUpload" name="receiptUpload" accept="image/*,.pdf">
          </div>
        </div>
      </label>`;
  }

  [p.easypaisa, p.jazzcash].forEach(method => {
    if (!method.enabled) {
      html += `
        <label class="payment-option disabled">
          <input type="radio" disabled>
          <strong>${method.label}</strong>
          <div style="font-size:0.82rem;color:#999;margin-top:4px;">${method.note}</div>
        </label>`;
    }
  });

  container.innerHTML = html;

  container.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener("change", () => {
      const box = document.getElementById("bankDetailsBox");
      if (box) box.classList.toggle("show", radio.value === "bank" && radio.checked);
    });
  });
}

function validateForm(form) {
  let valid = true;
  const required = ["fullName", "mobileNumber", "province", "city", "address"];
  required.forEach(name => {
    const field = form.elements[name];
    const group = field.closest(".form-group");
    if (!field.value.trim()) {
      group.classList.add("error");
      valid = false;
    } else {
      group.classList.remove("error");
    }
  });

  // Mobile number basic PK format check
  const mobile = form.elements["mobileNumber"];
  const mobileDigits = mobile.value.replace(/\D/g, "");
  if (mobile.value.trim() && (mobileDigits.length < 10 || mobileDigits.length > 12)) {
    mobile.closest(".form-group").classList.add("error");
    valid = false;
  }

  // Email optional, but validate format if provided
  const email = form.elements["email"];
  if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    email.closest(".form-group").classList.add("error");
    valid = false;
  }

  return valid;
}

function generateOrderId() {
  const date = new Date();
  const stamp = date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PS-${stamp}-${rand}`;
}

function sanitize(str) {
  return String(str || "").replace(/[<>]/g, "").trim();
}

async function submitOrderToBackend(order) {
  const { supabaseUrl, supabaseAnonKey } = STORE_CONFIG.backend;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, reason: "not_configured" };
  }
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(order)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Order submission failed:", errText);
      return { ok: false, reason: "backend_error", detail: errText };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    console.error(err);
    return { ok: false, reason: "network_error", detail: String(err) };
  }
}

async function sendEmailNotifications(order) {
  const { emailjsPublicKey, emailjsServiceId, emailjsCustomerTemplateId, emailjsOwnerTemplateId } = STORE_CONFIG.backend;
  if (!emailjsPublicKey || typeof emailjs === "undefined") return;

  const commonParams = {
    order_id: order.order_id,
    customer_name: order.customer_name,
    mobile_number: order.mobile_number,
    delivery_address: `${order.address}, ${order.city}, ${order.province}`,
    products_list: order.items.map(i => `${i.name} x${i.qty}`).join(", "),
    grand_total: order.grand_total,
    payment_method: order.payment_method,
    support_email: STORE_CONFIG.brand.supportEmail
  };

  try {
    if (order.email && emailjsCustomerTemplateId) {
      await emailjs.send(emailjsServiceId, emailjsCustomerTemplateId, { ...commonParams, to_email: order.email });
    }
    if (emailjsOwnerTemplateId) {
      await emailjs.send(emailjsServiceId, emailjsOwnerTemplateId, { ...commonParams, to_email: STORE_CONFIG.brand.supportEmail });
    }
  } catch (err) {
    console.error("Email notification failed (order was still saved):", err);
  }
}

function showBackendNotConfiguredNotice() {
  const notice = document.getElementById("backendNotice");
  if (notice) notice.style.display = "block";
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  if (isSubmitting) return;

  const form = e.target;
  if (!validateForm(form)) {
    showToast("Please fix the highlighted fields");
    return;
  }

  const { items, subtotal, delivery, grandTotal } = Cart.getTotals();
  if (items.length === 0) {
    showToast("Your cart is empty");
    return;
  }

  const paymentMethod = form.elements["paymentMethod"]?.value || "cod";
  const orderId = generateOrderId();

  const order = {
    order_id: orderId,
    customer_name: sanitize(form.elements["fullName"].value),
    mobile_number: sanitize(form.elements["mobileNumber"].value),
    email: sanitize(form.elements["email"].value) || null,
    province: sanitize(form.elements["province"].value),
    city: sanitize(form.elements["city"].value),
    address: sanitize(form.elements["address"].value),
    postal_code: sanitize(form.elements["postalCode"]?.value) || null,
    order_notes: sanitize(form.elements["orderNotes"]?.value) || null,
    items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, lineTotal: i.lineTotal })),
    subtotal,
    delivery_fee: delivery,
    grand_total: grandTotal,
    payment_method: paymentMethod,
    payment_reference: paymentMethod === "bank" ? sanitize(form.elements["paymentReference"]?.value) || null : null,
    payment_status: paymentMethod === "bank" ? "Awaiting Verification" : "Pending",
    order_status: "Pending",
    created_at: new Date().toISOString()
  };

  isSubmitting = true;
  const submitBtn = document.getElementById("placeOrderBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Placing Order...";

  const result = await submitOrderToBackend(order);

  if (!result.ok) {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
    if (result.reason === "not_configured") {
      showBackendNotConfiguredNotice();
    } else {
      showToast("Something went wrong saving your order. Please try again or contact us.");
    }
    return;
  }

  await sendEmailNotifications(order);

  // Only now — after backend confirms the save — do we show confirmation and clear the cart.
  renderConfirmation(order);
  Cart.clear();
}

function renderConfirmation(order) {
  document.getElementById("checkoutContent").innerHTML = `
    <div class="confirmation-box policy-card">
      <div class="icon">&#10003;</div>
      <h2>Order Placed Successfully</h2>
      <div class="order-ref">Reference: ${order.order_id}</div>
      <p style="color:#555;max-width:480px;margin:0 auto 24px;">
        Thank you, ${order.customer_name}! We've received your order and will contact you shortly to confirm delivery.
        ${order.payment_method === "bank" ? "Your order is pending payment verification." : ""}
      </p>
      <div style="text-align:left;max-width:420px;margin:0 auto;">
        ${order.items.map(i => `<div class="order-summary-item"><span>${i.name} &times; ${i.qty}</span><span>${Cart.formatPrice(i.lineTotal)}</span></div>`).join("")}
        <div class="summary-row total" style="margin-top:10px;"><span>Grand Total</span><span>${Cart.formatPrice(order.grand_total)}</span></div>
      </div>
      <p style="margin-top:26px;font-size:0.9rem;color:#777;">
        Need help with your order? Email us at <a href="mailto:${STORE_CONFIG.brand.supportEmail}" style="color:var(--color-gold);">${STORE_CONFIG.brand.supportEmail}</a>
      </p>
      <a href="index.html" class="btn btn-dark mt-4">Back to Home</a>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const hasItems = renderOrderSummary();
  if (!hasItems) return;
  populateLocationDropdowns();
  renderPaymentOptions();

  const form = document.getElementById("checkoutForm");
  if (form) form.addEventListener("submit", handleCheckoutSubmit);
});
