/* =====================================================================
   PRODUCT-PAGE.JS — Individual Product Detail Page Logic & SEO Schema
   ===================================================================== */
(function () {
  const cfg = window.STORE_CONFIG || {};
  const sb = cfg.supabase || {};
  const RECENT_KEY = "ps_recent_products_v1";
  let qty = 1;
  let activeImages = [];
  let imgIdx = 0;

  function parseImages(raw) {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return String(raw || "").split(",").map(s => s.trim()).filter(Boolean);
  }

  function resolveImg(path) {
    if (!path) return "assets/logo/parfum-surgeon-logo.png";
    if (/^https?:\/\//i.test(path) || path.startsWith("assets/")) return path;
    return path;
  }

  function formatPKR(n) {
    return `PKR ${Number(n || 0).toLocaleString("en-PK")}`;
  }

  function recordRecentlyViewed(id) {
    try {
      const prev = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").map(String);
      const next = [String(id), ...prev.filter(x => x !== String(id))].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    } catch (_) {
      return [];
    }
  }

  async function fetchLiveProducts() {
    let list = Array.isArray(cfg.products) ? [...cfg.products] : [];
    if (!sb.url || !sb.anonKey) return list;
    try {
      const res = await fetch(`${sb.url}/rest/v1/products?select=*`, {
        headers: { apikey: sb.anonKey, Authorization: `Bearer ${sb.anonKey}` },
        cache: "no-store"
      });
      if (!res.ok) return list;
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length) {
        const byId = new Map(list.map(p => [String(p.id), p]));
        list = rows.map(r => {
          const fb = byId.get(String(r.id)) || {};
          const updatedMs = r.updated_at ? Date.parse(r.updated_at) : 0;
          const useRepoImage = fb.image && (!r.image || !updatedMs || updatedMs < Date.parse("2026-11-15T18:00:00Z"));
          return {
            ...fb,
            ...r,
            image: useRepoImage ? fb.image : (r.image || fb.image),
            shortDescription: r.short_description || r.shortDescription || fb.shortDescription || "",
            fullDescription: r.full_description || r.fullDescription || fb.fullDescription || "",
            fragranceFamily: r.fragrance_family || r.fragranceFamily || fb.fragranceFamily || "",
            topNotes: r.top_notes || r.topNotes || fb.topNotes || "",
            heartNotes: r.heart_notes || r.heartNotes || fb.heartNotes || "",
            baseNotes: r.base_notes || r.baseNotes || fb.baseNotes || "",
            inStock: r.in_stock !== undefined ? r.in_stock : (r.inStock !== undefined ? r.inStock : true)
          };
        });
      }
    } catch (_) { }
    return list;
  }

  function updateImageDisplay() {
    const mainImg = document.getElementById("pdpImage");
    const prevBtn = document.getElementById("pdpPrevImg");
    const nextBtn = document.getElementById("pdpNextImg");
    const thumbs = document.getElementById("pdpThumbs");
    const url = activeImages[imgIdx] || "assets/logo/parfum-surgeon-logo.png";
    if (mainImg) mainImg.src = url;
    if (prevBtn) prevBtn.classList.toggle("hidden", activeImages.length <= 1);
    if (nextBtn) nextBtn.classList.toggle("hidden", activeImages.length <= 1);
    if (thumbs) {
      thumbs.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === imgIdx));
    }
  }

  function renderMiniCard(p) {
    const img = resolveImg(parseImages(p.image)[0]);
    return `
      <article class="product-card" style="padding:14px;">
        <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-image" style="display:block;">
          <img src="${img}" alt="${p.name} 50ml perfume" loading="lazy">
        </a>
        <div class="product-body" style="padding:12px 0 0;">
          <h3 style="margin:0 0 6px;font-size:1rem;"><a href="product.html?id=${encodeURIComponent(p.id)}" style="color:inherit;text-decoration:none;">${p.name}</a></h3>
          <div class="product-price" style="font-weight:700;color:#0b0b0c;">${formatPKR(p.price)}</div>
        </div>
      </article>`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("id") || params.get("slug");
    const list = await fetchLiveProducts();
    const product = list.find(p =>
      String(p.id) === String(targetId) ||
      String(p.slug || "").toLowerCase() === String(targetId || "").toLowerCase()
    ) || list[0];

    if (!product) return;

    const genderLabel = product.gender === "women" ? "Women's Collection" : product.gender === "unisex" ? "Unisex Collection" : "Men's Collection";
    const sale = Number(product.sale_price || product.salePrice || 0);
    const basePrice = Number(product.price || 0);
    const activePrice = (sale > 0 && sale < basePrice) ? sale : basePrice;
    const outOfStock = product.inStock === false || Number(product.stock) === 0;

    // SEO & Meta updates
    document.title = `${product.seo_title || product.name} (${product.size || "50ml"}) | Parfum Surgeon Pakistan`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", product.seo_description || product.shortDescription || `Buy ${product.name} 50ml perfume in Pakistan at Parfum Surgeon.`);
    const canon = document.getElementById("productCanonical");
    if (canon) canon.href = `https://parfum-surgeon.github.io/parfumsurgeon/product.html?id=${encodeURIComponent(product.id)}`;

    document.getElementById("pdpBreadcrumbName").textContent = product.name;
    document.getElementById("pdpCategory").textContent = `${genderLabel} · ${product.size || "50ml"}`;
    document.getElementById("pdpTitle").textContent = product.name;
    document.getElementById("pdpShortDesc").textContent = product.shortDescription || "";
    document.getElementById("pdpPrice").textContent = formatPKR(activePrice);

    const compareEl = document.getElementById("pdpComparePrice");
    if (compareEl && sale > 0 && sale < basePrice) {
      compareEl.textContent = formatPKR(basePrice);
      compareEl.classList.remove("hidden");
    }

    const stockBadge = document.getElementById("pdpStockBadge");
    if (stockBadge) {
      stockBadge.textContent = outOfStock ? "Out of Stock" : "In Stock · Ready to Ship";
      stockBadge.classList.toggle("out", outOfStock);
    }

    document.getElementById("pdpSize").textContent = product.size || "50ml";
    document.getElementById("pdpFamily").textContent = product.fragranceFamily || "Signature Blend";
    document.getElementById("pdpPersonality").textContent = product.personality || "Refined & Lasting";
    document.getElementById("pdpOccasions").textContent = product.occasions || "Daily Wear & Evenings";
    document.getElementById("pdpTopNotes").textContent = product.topNotes || "—";
    document.getElementById("pdpHeartNotes").textContent = product.heartNotes || "—";
    document.getElementById("pdpBaseNotes").textContent = product.baseNotes || "—";
    document.getElementById("pdpFullDesc").textContent = product.fullDescription || product.shortDescription || "";

    // Gallery
    activeImages = parseImages(product.image).map(resolveImg);
    if (!activeImages.length) activeImages = ["assets/logo/parfum-surgeon-logo.png"];
    const thumbsEl = document.getElementById("pdpThumbs");
    if (thumbsEl && activeImages.length > 1) {
      thumbsEl.innerHTML = activeImages.map((src, i) => `
        <button type="button" class="${i === 0 ? "active" : ""}" aria-label="Image ${i + 1}">
          <img src="${src}" alt="${product.name} view ${i + 1}">
        </button>`).join("");
      thumbsEl.querySelectorAll("button").forEach((b, i) => {
        b.addEventListener("click", () => { imgIdx = i; updateImageDisplay(); });
      });
    }
    updateImageDisplay();

    document.getElementById("pdpPrevImg")?.addEventListener("click", () => {
      imgIdx = (imgIdx - 1 + activeImages.length) % activeImages.length;
      updateImageDisplay();
    });
    document.getElementById("pdpNextImg")?.addEventListener("click", () => {
      imgIdx = (imgIdx + 1) % activeImages.length;
      updateImageDisplay();
    });

    // Lightbox zoom
    const lb = document.getElementById("pdpLightbox");
    const lbImg = document.getElementById("pdpLightboxImg");
    const openLb = () => {
      if (!lb || !lbImg) return;
      lbImg.src = activeImages[imgIdx] || activeImages[0];
      lbImg.alt = product.name;
      lb.classList.add("open");
    };
    document.getElementById("pdpZoomBtn")?.addEventListener("click", openLb);
    document.getElementById("pdpImage")?.addEventListener("click", openLb);
    document.getElementById("pdpLightboxClose")?.addEventListener("click", () => lb?.classList.remove("open"));
    lb?.addEventListener("click", (e) => { if (e.target === lb) lb.classList.remove("open"); });

    // Quantity & Purchase Actions
    const qtyEl = document.getElementById("pdpQtyVal");
    document.getElementById("pdpQtyMinus")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      if (qtyEl) qtyEl.textContent = String(qty);
    });
    document.getElementById("pdpQtyPlus")?.addEventListener("click", () => {
      qty = Math.min(20, qty + 1);
      if (qtyEl) qtyEl.textContent = String(qty);
    });

    const addBtn = document.getElementById("pdpAddCart");
    const buyBtn = document.getElementById("pdpBuyNow");
    if (outOfStock) {
      if (addBtn) { addBtn.disabled = true; addBtn.textContent = "Out of Stock"; }
      if (buyBtn) { buyBtn.disabled = true; }
    } else {
      addBtn?.addEventListener("click", () => {
        if (window.Cart && typeof Cart.add === "function") {
          Cart.add(product.id, qty);
          if (typeof Cart.openDrawer === "function") Cart.openDrawer();
          if (typeof showToast === "function") showToast("Added to cart");
        }
        if (typeof window.psTrack === "function") {
          window.psTrack("add_to_cart", { currency: "PKR", value: activePrice * qty, items: [{ item_id: product.id, item_name: product.name, price: activePrice, quantity: qty }] });
        }
      });
      buyBtn?.addEventListener("click", () => {
        if (window.Cart && typeof Cart.buyNow === "function") {
          Cart.buyNow(product.id, qty);
        } else if (window.Cart && typeof Cart.add === "function") {
          Cart.add(product.id, qty);
          window.location.href = "checkout.html";
        }
      });
    }

    // Wishlist button
    const wishBtn = document.getElementById("pdpWishlistBtn");
    const syncWishBtn = () => {
      if (!wishBtn || !window.psWishlist) return;
      const saved = window.psWishlist.has(product.id);
      wishBtn.innerHTML = saved ? "&#9829; Saved" : "&#9825; Wishlist";
    };
    syncWishBtn();
    wishBtn?.addEventListener("click", () => {
      if (!window.psWishlist) return;
      window.psWishlist.toggle(product.id);
      syncWishBtn();
    });

    // Structured Data
    const pdSchema = document.getElementById("productStructuredData");
    if (pdSchema) {
      pdSchema.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        image: activeImages.map(u => u.startsWith("http") ? u : `https://parfum-surgeon.github.io/parfumsurgeon/${u}`),
        description: product.shortDescription || product.fullDescription || product.name,
        sku: product.sku || String(product.id),
        brand: { "@type": "Brand", name: "Parfum Surgeon" },
        offers: {
          "@type": "Offer",
          url: `https://parfum-surgeon.github.io/parfumsurgeon/product.html?id=${encodeURIComponent(product.id)}`,
          priceCurrency: "PKR",
          price: activePrice,
          availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
        }
      });
    }

    // Related & Recently Viewed
    const related = list.filter(p => String(p.id) !== String(product.id) && (p.gender === product.gender || true)).slice(0, 4);
    const relGrid = document.getElementById("pdpRelatedGrid");
    if (relGrid) relGrid.innerHTML = related.map(renderMiniCard).join("");

    const recentIds = recordRecentlyViewed(product.id).filter(id => id !== String(product.id));
    const recentProds = recentIds.map(id => list.find(p => String(p.id) === id)).filter(Boolean).slice(0, 4);
    if (recentProds.length) {
      const recSec = document.getElementById("pdpRecentSection");
      const recGrid = document.getElementById("pdpRecentGrid");
      if (recSec && recGrid) {
        recGrid.innerHTML = recentProds.map(renderMiniCard).join("");
        recSec.classList.remove("hidden");
      }
    }

    if (typeof window.psTrack === "function") {
      window.psTrack("view_item", { currency: "PKR", value: activePrice, items: [{ item_id: product.id, item_name: product.name, price: activePrice }] });
    }
  });
})();
