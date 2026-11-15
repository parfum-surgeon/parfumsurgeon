/* =====================================================================
   PRODUCTS.JS — product grid, filtering, search, and detail modal
   ===================================================================== */

let currentFilter = "all";
let currentMood = "all";
let currentSearch = "";
let modalQty = 1;
let activeModalProduct = null;
let modalImages = [];
let modalImageIndex = 0;

function parseProductImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  const str = String(raw).trim();
  if (str.startsWith("[")) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch (e) {}
  }
  return str ? [str] : [];
}

function getPrimaryProductImage(raw) {
  return parseProductImages(raw)[0] || "";
}

function updateCatalogStructuredData(products) {
  const script = document.getElementById("catalogStructuredData");
  if (!script) return;
  const visible = (products || []).filter(p => p.active !== false);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Parfum Surgeon Signature Perfume Collection",
    "description": "Explore signature perfumes for men, women and unisex wear from Parfum Surgeon Pakistan.",
    "numberOfItems": visible.length,
    "itemListElement": visible.map((p, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": p.name,
        "description": p.description || p.shortDescription || "Signature fragrance from Parfum Surgeon.",
        "image": new URL(resolveAssetPath(getPrimaryProductImage(p.image)), document.baseURI).href,
        "brand": { "@type": "Brand", "name": "Parfum Surgeon" },
        "category": p.gender === "women" ? "Women's Perfume" : p.gender === "men" ? "Men's Perfume" : "Unisex Perfume",
        "offers": {
          "@type": "Offer",
          "priceCurrency": "PKR",
          "price": Number(p.price || 0),
          "availability": Number(p.stock_quantity ?? p.stock ?? 1) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "url": "https://parfum-surgeon.github.io/parfumsurgeon/#shop"
        }
      }
    }))
  };
  script.textContent = JSON.stringify(itemList);
}

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

const PRODUCTS_CACHE_KEY = "ps_cached_products_v1";

function readCachedProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch (e) {
    return null;
  }
}

function writeCachedProducts(products) {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch (e) { /* storage unavailable */ }
}

async function loadStoreProducts() {
  const localProducts = (STORE_CONFIG.products || []).map(p => normalizeStoreProduct(p));
  const cfg = STORE_CONFIG.backend || {};
  const hasBackend = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const cached = hasBackend ? readCachedProducts() : null;

  if (cached) {
    STORE_CONFIG.products = cached.map(p => normalizeStoreProduct(p));
    renderProductGrid();
    renderSignatureGrid();
    renderDealsSection();
    updateCatalogStructuredData(STORE_CONFIG.products);
  } else if (!hasBackend) {
    STORE_CONFIG.products = localProducts;
    renderProductGrid();
    renderSignatureGrid();
    renderDealsSection();
    updateCatalogStructuredData(STORE_CONFIG.products);
    return;
  } else {
    const grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = '<div class="no-results">Loading signature collection...</div>';
  }

  try {
    const response = await fetch(
      `${cfg.supabaseUrl}/rest/v1/products?select=*&active=eq.true&order=name.asc`,
      { cache: "no-store", headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` } }
    );
    if (!response.ok) throw new Error(`Product API returned ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid products response");
    const localById = new Map(localProducts.map(p => [p.id, p]));
    // Database is authoritative: include newly-added products, and remove hidden products.
    const nextProducts = rows.map(row => normalizeStoreProduct(row, localById.get(String(row.id)) || {}));
    writeCachedProducts(nextProducts);
    if (JSON.stringify(nextProducts) !== JSON.stringify(STORE_CONFIG.products)) {
      STORE_CONFIG.products = nextProducts;
      renderProductGrid();
      renderSignatureGrid();
      renderDealsSection();
      updateCatalogStructuredData(STORE_CONFIG.products);
      Cart.updateHeaderCount();
      if (typeof Cart.renderDrawer === "function") Cart.renderDrawer();
    }
  } catch (e) {
    console.error("Product API unavailable; showing built-in catalogue:", e);
    if (!cached) {
      STORE_CONFIG.products = localProducts;
      renderProductGrid();
      renderSignatureGrid();
      renderDealsSection();
      updateCatalogStructuredData(STORE_CONFIG.products);
    }
  }
}


function getDealBundles(list) {
  const men = list.filter(p => p.gender === "men");
  const women = list.filter(p => p.gender === "women");
  const pick = (arr, idx, fb) => arr[idx] || list[fb] || list[0];
  return [
    {
      id: "duo",
      tag: "SIGNATURE DUO · 2 BOTTLES",
      title: "His & Hers Pair",
      items: [pick(men, 0, 0), pick(women, 0, 1)].filter(Boolean)
    },
    {
      id: "office",
      tag: "MOST POPULAR · 2 BOTTLES",
      title: "Office to Evening",
      items: [pick(men, 0, 0), pick(men, 1, 2)].filter(Boolean)
    },
    {
      id: "trio",
      tag: "GIFT BOX · 3 BOTTLES",
      title: "Discovery Trio",
      items: list.slice(0, 3)
    }
  ].filter(b => b.items.length > 0);
}

function renderDealsSection() {
  const list = (STORE_CONFIG.products || []).filter(p => p.active !== false);
  const showcase = document.getElementById("dealsShowcase");
  const grid = document.getElementById("dealsGrid");
  if (!list.length) return;

  if (showcase) {
    const featured = list.slice(0, 3);
    showcase.innerHTML = featured.map(p => `
      <button type="button" class="deal-showcase-bottle" data-showcase-id="${p.id}" aria-label="View ${p.name} details">
        <img src="${resolveAssetPath(getPrimaryProductImage(p.image))}" alt="${p.name}" loading="lazy">
        <span>${p.name}</span>
      </button>
    `).join("");
    showcase.querySelectorAll("[data-showcase-id]").forEach(btn => {
      btn.addEventListener("click", () => openProductModal(btn.dataset.showcaseId));
    });
  }

  if (grid) {
    const bundles = getDealBundles(list);
    grid.innerHTML = bundles.map(b => {
      const total = b.items.reduce((sum, p) => sum + Number(p.price || 0), 0);
      const thumbs = b.items.map(p => `<img src="${resolveAssetPath(getPrimaryProductImage(p.image))}" alt="${p.name}" title="${p.name}">`).join("");
      const names = b.items.map(p => p.name).join(" + ");
      return `
        <article class="deal-mini-card">
          <span class="deal-tag">${b.tag}</span>
          <h3>${b.title}</h3>
          <div class="deal-bottles-preview">${thumbs}</div>
          <p>${names}</p>
          <div class="deal-price-row">Total: <strong>${Cart.formatPrice(total)}</strong></div>
          <button type="button" class="btn btn-gold" data-deal-id="${b.id}">Order ${b.items.length} Bottles</button>
        </article>
      `;
    }).join("");

    grid.querySelectorAll("[data-deal-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const bundle = bundles.find(b => b.id === btn.dataset.dealId);
        if (!bundle) return;
        try { sessionStorage.removeItem("parfumSurgeonBuyNow"); } catch (e) {}
        bundle.items.forEach(p => Cart.add(p.id, 1));
        window.location.href = "checkout.html";
      });
    });
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
    const image = resolveAssetPath(getPrimaryProductImage(p.image));
    return `
      <article class="signature-card" data-signature-id="${p.id}">
        <button class="signature-image-button" type="button" aria-label="View ${p.name}">
          <span class="signature-number">${String(index + 1).padStart(2, "0")}</span>
          <img src="${image}" alt="${p.name} perfume bottle" loading="lazy" onerror="this.onerror=null;this.src='assets/logo/parfum-surgeon-logo.jpg';">
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

function productCardHTML(p, index = 0) {
  const genderLabel = p.gender === "men" ? "Men's" : p.gender === "women" ? "Women's" : "Unisex";
  const badge = index < 2 ? '<span class="card-badge">Bestseller</span>' : "";
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="img-wrap" data-action="open-modal">
        ${badge}
        <img src="${resolveAssetPath(getPrimaryProductImage(p.image))}" alt="${p.name} - Parfum Surgeon ${genderLabel} perfume" loading="lazy" onerror="this.onerror=null;this.src='assets/logo/parfum-surgeon-logo.jpg';">
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
  if (currentMood !== "all") {
    const moodMap = {
      woody: ["wood", "cedar", "sandal", "oud", "spic", "pepper", "vetiver", "leather"],
      fresh: ["fresh", "citrus", "bergamot", "lemon", "aquatic", "marine", "crisp", "mint"],
      amber: ["amber", "oriental", "musk", "vanilla", "warm", "incense", "tonka"],
      floral: ["floral", "rose", "jasmine", "sweet", "bloom", "fruity", "peach", "berry"]
    };
    const terms = moodMap[currentMood] || [];
    if (terms.length) {
      products = products.filter(p => {
        const hay = [p.fragranceFamily, p.shortDescription, p.description, p.personality].join(" ").toLowerCase();
        return terms.some(t => hay.includes(t));
      });
    }
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
  grid.innerHTML = products.map((p, i) => productCardHTML(p, i)).join("");
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

function setModalGalleryIndex(idx) {
  if (!modalImages.length) return;
  modalImageIndex = (idx + modalImages.length) % modalImages.length;
  const src = resolveAssetPath(modalImages[modalImageIndex]);
  const modalImg = document.getElementById("modalImage");
  if (modalImg) {
    modalImg.src = src;
    modalImg.alt = `${activeModalProduct?.name || "Parfum Surgeon"} (${modalImageIndex + 1}/${modalImages.length})`;
  }
  const lightbox = document.getElementById("imageLightbox");
  const lightboxImg = document.getElementById("imageLightboxPhoto");
  if (lightbox?.classList.contains("open") && lightboxImg) {
    lightboxImg.src = src;
  }
  const dotsEl = document.getElementById("modalGalleryDots");
  if (dotsEl) {
    dotsEl.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === modalImageIndex));
  }
}

function openProductModal(id) {
  const product = STORE_CONFIG.products.find(p => p.id === id);
  if (!product) return;
  activeModalProduct = product;
  modalQty = 1;
  modalImages = parseProductImages(product.image);
  if (!modalImages.length) modalImages = ["assets/logo/parfum-surgeon-logo.jpg"];
  modalImageIndex = 0;

  const hasMultiple = modalImages.length > 1;
  document.getElementById("modalPrevImg")?.classList.toggle("hidden", !hasMultiple);
  document.getElementById("modalNextImg")?.classList.toggle("hidden", !hasMultiple);
  document.getElementById("lightboxPrevImg")?.classList.toggle("hidden", !hasMultiple);
  document.getElementById("lightboxNextImg")?.classList.toggle("hidden", !hasMultiple);

  const dotsEl = document.getElementById("modalGalleryDots");
  if (dotsEl) {
    dotsEl.innerHTML = hasMultiple
      ? modalImages.map((_, i) => `<button type="button" aria-label="Image ${i + 1}" class="${i === 0 ? "active" : ""}"></button>`).join("")
      : "";
    dotsEl.querySelectorAll("button").forEach((b, i) => {
      b.addEventListener("click", e => { e.stopPropagation(); setModalGalleryIndex(i); });
    });
  }

  setModalGalleryIndex(0);
  document.getElementById("modalTitle").textContent = product.name;
  document.getElementById("modalPrice").textContent = Cart.formatPrice(product.price);
  document.getElementById("modalDescription").textContent = product.description || product.shortDescription || "A signature 50ml Parfum Surgeon fragrance crafted for lasting impression.";
  document.getElementById("modalGender").textContent = product.gender === "men" ? "Men's Collection" : product.gender === "women" ? "Women's Collection" : "Unisex Collection";
  document.getElementById("modalSize").textContent = product.size || "50ml";
  document.getElementById("modalPersonality").textContent = product.personality || "Refined, confident, memorable";
  document.getElementById("modalOccasions").textContent = product.occasions || "Daily wear & special evenings";
  document.getElementById("modalFamily").textContent = product.fragranceFamily || "Signature Blend";
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
  document.querySelectorAll(".mood-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      currentMood = chip.dataset.mood || "all";
      document.querySelectorAll(".mood-chip").forEach(c => c.classList.toggle("active", c === chip));
      renderProductGrid();
    });
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
  const imageLightbox = document.getElementById("imageLightbox");
  const imageLightboxPhoto = document.getElementById("imageLightboxPhoto");
  const imageLightboxClose = document.getElementById("imageLightboxClose");
  const openImageLightbox = () => {
    const source = document.getElementById("modalImage");
    if (!imageLightbox || !imageLightboxPhoto || !source?.src) return;
    imageLightboxPhoto.src = source.src;
    imageLightboxPhoto.alt = source.alt || "Parfum Surgeon perfume";
    imageLightbox.classList.add("open");
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-lightbox-open");
  };
  const closeImageLightbox = () => {
    if (!imageLightbox) return;
    imageLightbox.classList.remove("open");
    imageLightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("image-lightbox-open");
    if (imageLightboxPhoto) imageLightboxPhoto.removeAttribute("src");
  };
  const attachSwipe = (el) => {
    if (!el) return;
    let startX = 0;
    el.addEventListener("touchstart", e => { startX = e.touches[0]?.clientX || 0; }, { passive: true });
    el.addEventListener("touchend", e => {
      if (modalImages.length <= 1) return;
      const endX = e.changedTouches[0]?.clientX || 0;
      const diff = endX - startX;
      if (Math.abs(diff) > 40) setModalGalleryIndex(modalImageIndex + (diff < 0 ? 1 : -1));
    }, { passive: true });
  };
  const modalWrap = document.getElementById("modalImageWrap");
  attachSwipe(modalWrap);
  attachSwipe(imageLightbox);
  document.getElementById("modalPrevImg")?.addEventListener("click", e => { e.stopPropagation(); setModalGalleryIndex(modalImageIndex - 1); });
  document.getElementById("modalNextImg")?.addEventListener("click", e => { e.stopPropagation(); setModalGalleryIndex(modalImageIndex + 1); });
  document.getElementById("lightboxPrevImg")?.addEventListener("click", e => { e.stopPropagation(); setModalGalleryIndex(modalImageIndex - 1); });
  document.getElementById("lightboxNextImg")?.addEventListener("click", e => { e.stopPropagation(); setModalGalleryIndex(modalImageIndex + 1); });
  modalWrap?.addEventListener("click", openImageLightbox);
  imageLightboxClose?.addEventListener("click", closeImageLightbox);
  imageLightbox?.addEventListener("click", event => {
    if (event.target === imageLightbox) closeImageLightbox();
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (imageLightbox?.classList.contains("open")) {
      closeImageLightbox();
    } else if (document.getElementById("modalOverlay")?.classList.contains("open")) {
      closeProductModal();
    }
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
