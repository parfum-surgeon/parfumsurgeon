/* =====================================================================
   CART.JS — localStorage-backed shopping cart
   Stores ONLY { productId, qty } pairs — no personal/customer data,
   per the "do not store sensitive customer information in localStorage"
   requirement. All customer data is entered fresh at checkout and sent
   straight to the backend, never saved to the browser.
   ===================================================================== */

const CART_KEY = "parfumSurgeonCart";
const BUY_NOW_KEY = "parfumSurgeonBuyNow";

function normalizeCartItems(rawList) {
  if (!Array.isArray(rawList)) return [];
  const merged = new Map();
  rawList.forEach(item => {
    if (!item || typeof item !== "object") return;
    const pid = String(item.productId || item.id || "").trim();
    const qty = Math.floor(Number(item.qty));
    if (!pid || !Number.isFinite(qty) || qty <= 0) return;
    merged.set(pid, (merged.get(pid) || 0) + qty);
  });
  return Array.from(merged.entries()).map(([productId, qty]) => ({ productId, qty }));
}

const Cart = {
  read() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? normalizeCartItems(JSON.parse(raw)) : [];
    } catch (e) {
      return [];
    }
  },

  write(items) {
    const clean = normalizeCartItems(items);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(clean));
    } catch (e) { /* storage unavailable — fail silently */ }
    Cart.updateHeaderCount();
    document.dispatchEvent(new CustomEvent("cart:updated"));
  },

  add(productId, qty = 1) {
    const pid = String((productId && typeof productId === "object") ? productId.id : productId || "").trim();
    if (!pid) return;
    const addQty = Math.max(1, Math.floor(Number(qty) || 1));
    try { sessionStorage.removeItem(BUY_NOW_KEY); } catch (e) {}
    const items = Cart.read();
    const existing = items.find(i => String(i.productId) === pid);
    if (existing) {
      existing.qty = Math.max(1, Math.floor(Number(existing.qty) || 0)) + addQty;
    } else {
      items.push({ productId: pid, qty: addQty });
    }
    Cart.write(items);
  },

  updateQty(productId, qty) {
    const pid = String(productId || "").trim();
    if (!pid) return;
    try { sessionStorage.removeItem(BUY_NOW_KEY); } catch (e) {}
    const nextQty = Math.floor(Number(qty));
    let items = Cart.read();
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      items = items.filter(i => String(i.productId) !== pid);
    } else {
      const existing = items.find(i => String(i.productId) === pid);
      if (existing) existing.qty = nextQty;
    }
    Cart.write(items);
  },

  remove(productId) {
    const pid = String(productId || "").trim();
    if (!pid) return;
    try { sessionStorage.removeItem(BUY_NOW_KEY); } catch (e) {}
    const items = Cart.read().filter(i => String(i.productId) !== pid);
    Cart.write(items);
  },

  buyNow(productId, qty = 1) {
    const pid = String((productId && typeof productId === "object") ? productId.id : productId || "").trim();
    const product = (STORE_CONFIG.products || []).find(p => String(p.id) === pid);
    if (!product) return;
    const buyQty = Math.max(1, Math.floor(Number(qty) || 1));
    try {
      // Keep the customer's regular cart untouched; checkout temporarily uses this one item.
      sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify({ productId: pid, qty: buyQty }));
      window.location.href = resolveAssetPath("checkout.html");
    } catch (e) {
      if (typeof showToast === "function") {
        showToast("Quick checkout is unavailable in this browser. Please use Add to Cart.");
      }
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
    const items = Cart.read();
    const catalog = Array.isArray(STORE_CONFIG?.products) ? STORE_CONFIG.products : null;
    return items.reduce((sum, i) => {
      if (catalog && catalog.length && !catalog.some(p => String(p.id) === String(i.productId))) return sum;
      return sum + (Math.floor(Number(i.qty)) || 0);
    }, 0);
  },

  // Joins stored cart items with live product data from STORE_CONFIG
  getDetailedItems(useQuickBuy = false) {
    let items = Cart.read();
    if (useQuickBuy) {
      try {
        const quickBuy = JSON.parse(sessionStorage.getItem(BUY_NOW_KEY) || "null");
        if (quickBuy?.productId) {
          items = [{ productId: String(quickBuy.productId), qty: Math.max(1, Math.floor(Number(quickBuy.qty) || 1)) }];
        }
      } catch (e) {}
    }
    return items.map(item => {
      const product = (STORE_CONFIG.products || []).find(p => String(p.id) === String(item.productId));
      if (!product) return null;
      const unitPrice = Number(product.price || 0);
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
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

  getTotals(useQuickBuy = false) {
    const items = Cart.getDetailedItems(useQuickBuy);
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
    const totalCount = Cart.count();
    document.querySelectorAll(".cart-count").forEach(el => {
      el.textContent = totalCount;
    });
  },

  formatPrice(amount) {
    return STORE_CONFIG.currency + " " + Number(amount || 0).toLocaleString("en-PK");
  },

  // ---------------- Cart Drawer rendering ----------------
  renderDrawer() {
    const container = document.getElementById("cartItemsContainer");
    const summaryContainer = document.getElementById("cartSummaryContainer");
    if (!container) return;

    Cart.updateHeaderCount();
    const { items, subtotal, delivery, grandTotal } = Cart.getTotals(false);

    if (items.length === 0) {
      container.innerHTML = `<div class="cart-empty">Your cart is empty.<br><br>
        <button class="btn btn-dark" id="continueShoppingBtn" type="button">Continue Shopping</button></div>`;
      if (summaryContainer) summaryContainer.innerHTML = "";
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
        <a href="${resolveAssetPath("checkout.html")}" class="btn btn-gold btn-block">Proceed to Checkout</a>
      `;
    }
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
  if (path.startsWith("http") || path.startsWith("/") || path.startsWith("data:")) return path;
  const inPagesFolder = window.location.pathname.includes("/pages/");
  const resolved = inPagesFolder ? "../" + path : path;
  if (/\.(jpg|jpeg|png|webp)$/i.test(resolved) && !resolved.includes("?")) {
    return resolved + "?v=3";
  }
  return resolved;
}

document.addEventListener("DOMContentLoaded", () => {
  Cart.updateHeaderCount();

  // Single delegated click handler for drawer controls, cart buttons, and close triggers
  document.addEventListener("click", (e) => {
    const actionBtn = e.target.closest("#cartItemsContainer [data-action]");
    if (actionBtn) {
      const row = actionBtn.closest(".cart-item");
      const id = String(row?.dataset.id || "").trim();
      if (!id) return;
      const action = actionBtn.dataset.action;
      const current = Cart.read().find(i => String(i.productId) === id);
      if (!current) {
        Cart.renderDrawer();
        return;
      }
      const curQty = Math.max(1, Math.floor(Number(current.qty) || 1));
      if (action === "inc") Cart.updateQty(id, curQty + 1);
      else if (action === "dec") Cart.updateQty(id, curQty - 1);
      else if (action === "remove") Cart.remove(id);
      return;
    }

    if (e.target.closest(".cart-btn")) {
      Cart.openDrawer();
      return;
    }

    if (e.target.closest("#closeCartBtn") || e.target.closest("#continueShoppingBtn") || e.target.id === "cartOverlay") {
      Cart.closeDrawer();
    }
  });

  const refreshOpenDrawer = () => {
    Cart.updateHeaderCount();
    if (document.getElementById("cartDrawer")?.classList.contains("open")) {
      Cart.renderDrawer();
    }
  };

  document.addEventListener("cart:updated", refreshOpenDrawer);
  document.addEventListener("store:settings-updated", refreshOpenDrawer);
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) refreshOpenDrawer();
  });
});
