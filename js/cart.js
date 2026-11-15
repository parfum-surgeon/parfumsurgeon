/* =====================================================================
   CART.JS — localStorage-backed shopping cart
   Stores ONLY { productId, qty } pairs — no personal/customer data,
   per the "do not store sensitive customer information in localStorage"
   requirement. All customer data is entered fresh at checkout and sent
   straight to the backend, never saved to the browser.
   ===================================================================== */

const CART_KEY = "parfumSurgeonCart";
const BUY_NOW_KEY = "parfumSurgeonBuyNow";

const Cart = {
  read() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  write(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) { /* storage unavailable — fail silently */ }
    Cart.updateHeaderCount();
    document.dispatchEvent(new CustomEvent("cart:updated"));
  },

  add(productId, qty = 1) {
    const pid = String((productId && typeof productId === "object") ? productId.id : productId || "");
    if (!pid) return;
    try { sessionStorage.removeItem(BUY_NOW_KEY); } catch (e) {}
    const items = Cart.read();
    const existing = items.find(i => String(i.productId) === pid);
    if (existing) {
      existing.qty += Math.max(1, Number(qty) || 1);
    } else {
      items.push({ productId: pid, qty: Math.max(1, Number(qty) || 1) });
    }
    Cart.write(items);
  },

  updateQty(productId, qty) {
    const pid = String(productId || "");
    try { sessionStorage.removeItem(BUY_NOW_KEY); } catch (e) {}
    let items = Cart.read();
    if (qty <= 0) {
      items = items.filter(i => String(i.productId) !== pid);
    } else {
      const existing = items.find(i => String(i.productId) === pid);
      if (existing) existing.qty = Number(qty);
    }
    Cart.write(items);
  },

  remove(productId) {
    const pid = String(productId || "");
    try { sessionStorage.removeItem(BUY_NOW_KEY); } catch (e) {}
    const items = Cart.read().filter(i => String(i.productId) !== pid);
    Cart.write(items);
  },

  buyNow(productId, qty = 1) {
    const pid = String((productId && typeof productId === "object") ? productId.id : productId || "");
    const product = (STORE_CONFIG.products || []).find(p => String(p.id) === pid);
    if (!product) return;
    try {
      // Keep the customer's regular cart untouched; checkout temporarily uses this one item.
      sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify({ productId: pid, qty: Math.max(1, Number(qty) || 1) }));
      window.location.href = window.location.pathname.includes("/pages/") ? "../checkout.html" : "checkout.html";
    } catch (e) {
      showToast("Quick checkout is unavailable in this browser. Please use Add to Cart.");
    }
  },

  clear() {
    try {
      if (sessionStorage.getItem(BUY_NOW_KEY)) {
        sessionStorage.removeItem(BUY_NOW_KEY);
        Cart.updateHeaderCount();
        document.dispatchEvent(new CustomEvent("cart:updated"));
        return;
      }
    } catch (e) {}
    Cart.write([]);
  },

  count() {
    return Cart.read().reduce((sum, i) => sum + i.qty, 0);
  },

  // Joins stored cart items with live product data from STORE_CONFIG
  getDetailedItems() {
    let items = Cart.read();
    try {
      const quickBuy = JSON.parse(sessionStorage.getItem(BUY_NOW_KEY) || "null");
      if (quickBuy?.productId) items = [{ productId: quickBuy.productId, qty: Math.max(1, Number(quickBuy.qty) || 1) }];
    } catch (e) {}
    return items.map(item => {
      const product = (STORE_CONFIG.products || []).find(p => String(p.id) === String(item.productId));
      if (!product) return null;
      const unitPrice = Number(product.price || 0);
      const qty = Math.max(1, Number(item.qty) || 1);
      return {
        id: String(product.id),
        name: product.name,
        gender: product.gender,
        size: product.size || "50ml",
        image: (function(raw){if(!raw)return "";if(typeof raw==="string"&&raw.trim().startsWith("[")){try{const arr=JSON.parse(raw);if(Array.isArray(arr)&&arr.length)return arr[0];}catch(e){}}return Array.isArray(raw)?raw[0]:String(raw).split(",")[0].trim();})(product.image),
        price: unitPrice,
        qty,
        lineTotal: unitPrice * qty
      };
    }).filter(Boolean);
  },

  getTotals() {
    const items = Cart.getDetailedItems();
    const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotal || 0), 0);
    let delivery = Number(STORE_CONFIG.deliveryFee || 0);
    if (STORE_CONFIG.freeDeliveryThreshold && subtotal >= Number(STORE_CONFIG.freeDeliveryThreshold)) {
      delivery = 0;
    }
    if (items.length === 0) delivery = 0;
    const grandTotal = subtotal + delivery;
    return { items, subtotal, delivery, grandTotal };
  },

  updateHeaderCount() {
    document.querySelectorAll(".cart-count").forEach(el => {
      el.textContent = Cart.count();
    });
  },

  formatPrice(amount) {
    return STORE_CONFIG.currency + " " + Number(amount).toLocaleString("en-PK");
  },

  // ---------------- Cart Drawer rendering ----------------
  renderDrawer() {
    const container = document.getElementById("cartItemsContainer");
    const summaryContainer = document.getElementById("cartSummaryContainer");
    if (!container) return;

    const { items, subtotal, delivery, grandTotal } = Cart.getTotals();

    if (items.length === 0) {
      container.innerHTML = `<div class="cart-empty">Your cart is empty.<br><br>
        <button class="btn btn-dark" id="continueShoppingBtn" type="button">Continue Shopping</button></div>`;
      if (summaryContainer) summaryContainer.innerHTML = "";
      const cont = document.getElementById("continueShoppingBtn");
      if (cont) cont.addEventListener("click", Cart.closeDrawer);
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <img src="${resolveAssetPath(item.image)}" alt="${item.name}" loading="lazy">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <div class="meta">${item.size} &middot; ${Cart.formatPrice(item.price)} each</div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button type="button" data-action="dec" aria-label="Decrease quantity">&minus;</button>
              <span>${item.qty}</span>
              <button type="button" data-action="inc" aria-label="Increase quantity">&plus;</button>
            </div>
            <button class="cart-item-remove" data-action="remove" type="button">Remove</button>
          </div>
        </div>
      </div>
    `).join("");

    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div class="summary-row"><span>Subtotal</span><span>${Cart.formatPrice(subtotal)}</span></div>
        <div class="summary-row"><span>Delivery</span><span>${delivery === 0 ? "Free" : Cart.formatPrice(delivery)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${Cart.formatPrice(grandTotal)}</span></div>
        <a href="checkout.html" class="btn btn-gold btn-block">Proceed to Checkout</a>
      `;
    }

    container.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = String(btn.closest(".cart-item").dataset.id);
        const action = btn.dataset.action;
        const current = Cart.read().find(i => String(i.productId) === id);
        if (!current) return;
        if (action === "inc") Cart.updateQty(id, current.qty + 1);
        if (action === "dec") Cart.updateQty(id, current.qty - 1);
        if (action === "remove") Cart.remove(id);
      });
    });
  },

  openDrawer() {
    document.getElementById("cartOverlay")?.classList.add("open");
    document.getElementById("cartDrawer")?.classList.add("open");
    document.body.style.overflow = "hidden";
    Cart.renderDrawer();
  },

  closeDrawer() {
    document.getElementById("cartOverlay")?.classList.remove("open");
    document.getElementById("cartDrawer")?.classList.remove("open");
    document.body.style.overflow = "";
  }
};

// Resolve asset paths correctly whether page is at root or in /pages/
function resolveAssetPath(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  const inPagesFolder = window.location.pathname.includes("/pages/");
  return inPagesFolder ? "../" + path : path;
}

document.addEventListener("DOMContentLoaded", () => {
  Cart.updateHeaderCount();
  document.getElementById("cartOverlay")?.addEventListener("click", Cart.closeDrawer);
  document.querySelectorAll(".cart-btn").forEach(btn => btn.addEventListener("click", Cart.openDrawer));
  document.getElementById("closeCartBtn")?.addEventListener("click", Cart.closeDrawer);
  document.addEventListener("cart:updated", () => {
    if (document.getElementById("cartDrawer")?.classList.contains("open")) Cart.renderDrawer();
  });
});
