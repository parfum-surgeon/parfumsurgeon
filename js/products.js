/* =====================================================================
   PRODUCTS.JS — product grid, filtering, search, and detail modal
   ===================================================================== */

let currentFilter = "all";
let currentSearch = "";
let modalQty = 1;
let activeModalProduct = null;

function normalizeStoreProduct(p, fallback = {}) {
  const genderRaw = String(p.gender || fallback.gender || "unisex").toLowerCase();
  const gender = ["men", "male", "m"].includes(genderRaw) ? "men"
    : ["women", "female", "f"].includes(genderRaw) ? "women" : "unisex";
  return {
    ...fallback,
    ...p,
    id: String(p.id || fallback.id || ""),
    name: p.name || fallback.name || "Parfum Surgeon",
    gender,
    size: p.size || p.size_ml ? (p.size || (p.size_ml + "ml")) : (fallback.size || "50ml"),
    price: Number(p.price ?? fallback.price ?? 3499),
    image: p.image || fallback.image || "",
    shortDescription: p.short_description || p.shortDescription || fallback.shortDescription || "",
    description: p.description || fallback.description || "",
    fragranceFamily: p.fragrance_family || p.fragranceFamily || fallback.fragranceFamily || "",
    personality: p.personality || fallback.personality || "",
    occasions: p.occasions || fallback.occasions || ""
  };
}

async function loadStoreProducts() {
  const localProducts = (STORE_CONFIG.products || []).map(p => normalizeStoreProduct(p));
  STORE_CONFIG.products = localProducts;
  renderProductGrid();
  renderSignatureGrid();
  const cfg = STORE_CONFIG.backend || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  try {
    const response = await fetch(
      `${cfg.supabaseUrl}/rest/v1/products?select=*&active=eq.true&order=name.asc`,
      { headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` } }
    );
    if (!response.ok) throw new Error(`Product API returned ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid products response");
    const localById = new Map(localProducts.map(p => [p.id, p]));
    // Database is authoritative: include newly-added products, and remove hidden products.
    STORE_CONFIG.products = rows.map(row => normalizeStoreProduct(row, localById.get(String(row.id)) || {}));
    renderProductGrid();
    renderSignatureGrid();
  } catch (e) {
    console.error("Product API unavailable; showing built-in catalogue:", e);
  }
}


function renderSignatureGrid() {
  const grid = document.getElementById("signatureGrid");
  if (!grid) return;
  const items = (STORE_CONFIG.products || []).filter(p => p.active !== false);
  if (!items.length) {
    grid.innerHTML = '<p class="signature-empty">Our signature collection is being prepared. Please check back soon.</p>';
    return;
  }
  grid.innerHTML = items.map((p, index) => {
    const gender = p.gender === "women" ? "WOMEN" : p.gender === "men" ? "MEN" : "UNISEX";
    const image = resolveAssetPath(p.image);
    return `
      <article class="signature-card" data-signature-id="${p.id}">
        <button class="signature-image-button" type="button" aria-label="View ${p.name}">
          <span class="signature-number">${String(index + 1).padStart(2, "0")}</span>
          <img src="${image}" alt="${p.name} perfume bottle" loading="lazy" onerror="this.onerror=null;this.src='assets/logo/parfum-surgeon-logo.svg';">
        </button>
        <div class="signature-card-body">
          <span class="signature-category">${gender} <i></i> ${p.size || "50ml"}</span>
          <h3>${p.name}</h3>
          <p>${p.shortDescription || p.fragranceFamily || "A signature Parfum Surgeon fragrance."}</p>
          <div class="signature-card-bottom"><strong>PKR ${Number(p.price || 0).toLocaleString("en-PK")}</strong><button type="button" class="signature-view">Discover scent <span aria-hidden="true">↗</span></button></div>
        </div>
      </article>`;
  }).join("");
  grid.querySelectorAll("[data-signature-id]").forEach(card => {
    card.querySelector(".signature-image-button").addEventListener("click", () => openProductModal(card.dataset.signatureId));
    card.querySelector(".signature-view").addEventListener("click", () => openProductModal(card.dataset.signatureId));
  });
}

function productCardHTML(p) {
  const genderLabel = p.gender === "men" ? "Men's" : p.gender === "women" ? "Women's" : "Unisex";
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="img-wrap" data-action="open-modal">
        <img src="${resolveAssetPath(p.image)}" alt="${p.name} - Parfum Surgeon ${genderLabel} perfume" loading="lazy" onerror="this.onerror=null;this.src='assets/logo/parfum-surgeon-logo.svg';">
      </div>
      <div class="card-body">
        <div class="tag-row">
          <span class="tag ${p.gender === "women" ? "tag-women" : "tag-men"}">${genderLabel}</span>
          <span class="tag tag-size">${p.size || "50ml"}</span>
        </div>
        <h3>${p.name}</h3>
        <p class="short-desc">${p.shortDescription || ""}</p>
        <div class="price">${Cart.formatPrice(p.price)}</div>
        <div class="card-actions">
          <button class="btn btn-outline-dark" style="border:1px solid #000;color:#000;" data-action="open-modal">Details</button>
          <button class="btn btn-outline-dark" data-action="add-cart">Add to Cart</button>
          <button class="btn btn-gold" data-action="buy-now">Buy Now</button>
        </div>
      </div>
    </article>
  `;
}

function renderProductGrid() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  let products = STORE_CONFIG.products || [];
  if (currentFilter !== "all") {
    products = products.filter(p => p.gender === currentFilter || p.gender === "unisex");
  }
  if (currentSearch.trim()) {
    const q = currentSearch.trim().toLowerCase();
    products = products.filter(p =>
      String(p.name || "").toLowerCase().includes(q) ||
      String(p.shortDescription || "").toLowerCase().includes(q) ||
      String(p.fragranceFamily || "").toLowerCase().includes(q)
    );
  }
  if (products.length === 0) {
    grid.innerHTML = `<div class="no-results">No perfumes match your search. Try a different term or filter.</div>`;
    return;
  }
  grid.innerHTML = products.map(productCardHTML).join("");
  grid.querySelectorAll(".product-card").forEach(card => {
    const id = card.dataset.id;
    card.querySelectorAll('[data-action="open-modal"]').forEach(el =>
      el.addEventListener("click", () => openProductModal(id))
    );
    card.querySelector('[data-action="add-cart"]').addEventListener("click", () => {
      Cart.add(id, 1);
      showToast("Added to cart");
    });
    card.querySelector('[data-action="buy-now"]').addEventListener("click", () => {
      Cart.buyNow(id, 1);
    });
  });
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderProductGrid();
}

function openProductModal(id) {
  const product = STORE_CONFIG.products.find(p => p.id === id);
  if (!product) return;
  activeModalProduct = product;
  modalQty = 1;
  document.getElementById("modalImage").src = resolveAssetPath(product.image);
  document.getElementById("modalImage").alt = product.name;
  document.getElementById("modalTitle").textContent = product.name;
  document.getElementById("modalPrice").textContent = Cart.formatPrice(product.price);
  document.getElementById("modalDescription").textContent = product.description || "";
  document.getElementById("modalGender").textContent = product.gender === "men" ? "Men's Collection" : product.gender === "women" ? "Women's Collection" : "Unisex Collection";
  document.getElementById("modalSize").textContent = product.size || "50ml";
  document.getElementById("modalPersonality").textContent = product.personality || "";
  document.getElementById("modalOccasions").textContent = product.occasions || "";
  document.getElementById("modalFamily").textContent = product.fragranceFamily || "";
  document.getElementById("modalQty").textContent = modalQty;
  document.getElementById("modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("modalImageWrap").classList.remove("zoomed");
  document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", () => {
  loadStoreProducts();
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });
  const searchInput = document.getElementById("productSearch");
  if (searchInput) searchInput.addEventListener("input", e => {
    currentSearch = e.target.value;
    renderProductGrid();
  });
  const params = new URLSearchParams(window.location.search);
  if (params.get("filter")) setFilter(params.get("filter"));
  document.getElementById("modalCloseBtn")?.addEventListener("click", closeProductModal);
  document.getElementById("modalOverlay")?.addEventListener("click", e => {
    if (e.target.id === "modalOverlay") closeProductModal();
  });
  document.getElementById("modalImageWrap")?.addEventListener("click", function () {
    this.classList.toggle("zoomed");
  });
  document.getElementById("qtyIncBtn")?.addEventListener("click", () => {
    modalQty++;
    document.getElementById("modalQty").textContent = modalQty;
  });
  document.getElementById("qtyDecBtn")?.addEventListener("click", () => {
    if (modalQty > 1) modalQty--;
    document.getElementById("modalQty").textContent = modalQty;
  });
  document.getElementById("modalAddCartBtn")?.addEventListener("click", () => {
    if (!activeModalProduct) return;
    Cart.add(activeModalProduct.id, modalQty);
    showToast("Added to cart");
    closeProductModal();
  });
  document.getElementById("modalBuyNowBtn")?.addEventListener("click", () => {
    if (!activeModalProduct) return;
    Cart.buyNow(activeModalProduct.id, modalQty);
  });
});
