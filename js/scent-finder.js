/* =====================================================================
   SCENT-FINDER.JS — 3-step interactive fragrance recommender
   ===================================================================== */
(function () {
  const root = document.getElementById("scentFinder");
  const resultsEl = document.getElementById("finderResults");
  if (!root || !resultsEl) return;

  const state = { gender: "men", occasion: "daily", vibe: "fresh" };

  function scoreProduct(p) {
    let score = 0;
    const g = String(p.gender || "").toLowerCase();
    if (state.gender === "all") score += 2;
    else if (g === state.gender) score += 6;
    else if (g === "unisex") score += 3;

    const hay = [
      p.fragranceFamily,
      p.personality,
      p.occasions,
      p.shortDescription,
      p.topNotes,
      p.heartNotes,
      p.baseNotes
    ].join(" ").toLowerCase();

    if (state.occasion === "daily" && /office|daily|day|fresh|clean|work|casual/.test(hay)) score += 4;
    if (state.occasion === "evening" && /night|evening|date|intimate|warm|sweet|amber/.test(hay)) score += 4;
    if (state.occasion === "wedding" && /wedding|event|bold|oud|leather|resinous|formal|rich/.test(hay)) score += 4;

    if (state.vibe === "fresh" && /fresh|citrus|aquatic|crisp|bergamot|aromatic|woody/.test(hay)) score += 5;
    if (state.vibe === "warm" && /sweet|vanilla|amber|spice|gourmand|tonka|warm/.test(hay)) score += 5;
    if (state.vibe === "woody" && /woody|oud|leather|tobacco|cedar|sandalwood|smoky|resinous/.test(hay)) score += 5;
    if (state.vibe === "floral" && /floral|rose|jasmine|fruity|luminous|soft|musk/.test(hay)) score += 5;

    return score;
  }

  function renderResults() {
    const list = (window.STORE_CONFIG && Array.isArray(window.STORE_CONFIG.products))
      ? window.STORE_CONFIG.products
      : [];
    if (!list.length) return;

    const ranked = [...list]
      .map(p => ({ p, score: scoreProduct(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(x => x.p);

    resultsEl.innerHTML = ranked.map(p => {
      const rawImg = Array.isArray(p.image) ? p.image[0] : String(p.image || "").split(",")[0].trim();
      const img = (typeof resolveAssetPath === "function") ? resolveAssetPath(rawImg) : rawImg;
      const price = typeof formatPrice === "function"
        ? formatPrice(p.price)
        : `PKR ${Number(p.price || 0).toLocaleString("en-PK")}`;
      const label = p.gender === "women" ? "Women's" : p.gender === "unisex" ? "Unisex" : "Men's";
      return `
        <article class="finder-match">
          <img src="${img}" alt="${p.name} 50ml perfume" loading="lazy">
          <div class="finder-match-info">
            <span class="finder-badge">Best Match · ${label} · 50ml</span>
            <h3>${p.name}</h3>
            <p>${p.shortDescription || p.fragranceFamily || "Long-lasting signature parfum."}</p>
            <div class="finder-match-foot">
              <strong>${price}</strong>
              <div class="finder-match-actions">
                <button type="button" class="btn btn-outline finder-notes-btn" data-id="${p.id}">View Notes</button>
                <button type="button" class="btn btn-gold finder-add-btn" data-id="${p.id}">Add to Cart</button>
              </div>
            </div>
          </div>
        </article>`;
    }).join("");

    resultsEl.querySelectorAll(".finder-notes-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (typeof openProductModal === "function") openProductModal(btn.dataset.id);
      });
    });
    resultsEl.querySelectorAll(".finder-add-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const prod = list.find(item => String(item.id) === String(btn.dataset.id));
        if (prod && window.Cart && typeof Cart.add === "function") {
          Cart.add(prod.id, 1);
          if (typeof Cart.openDrawer === "function") Cart.openDrawer();
          if (typeof showToast === "function") showToast("Added to cart");
        }
      });
    });
  }

  root.querySelectorAll(".finder-pills").forEach(group => {
    const key = group.dataset.finderGroup;
    group.querySelectorAll(".finder-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        group.querySelectorAll(".finder-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state[key] = btn.dataset.val;
        renderResults();
      });
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderResults);
  } else {
    renderResults();
  }
  window.addEventListener("ps:products-updated", renderResults);

  // Sync Top Collection Cards with live product imagery & click filtering
  function syncCollections() {
    const list = (window.STORE_CONFIG && Array.isArray(window.STORE_CONFIG.products))
      ? window.STORE_CONFIG.products
      : [];
    if (!list.length) return;
    document.querySelectorAll(".collection-card[data-col-product]").forEach(card => {
      const slug = card.dataset.colProduct;
      const match = list.find(p =>
        String(p.id || "").toLowerCase().includes(slug) ||
        String(p.name || "").toLowerCase().replace(/\s+/g, "-").includes(slug)
      );
      if (match && match.image) {
        const raw = Array.isArray(match.image) ? match.image[0] : String(match.image).split(",")[0].trim();
        const url = (typeof resolveAssetPath === "function") ? resolveAssetPath(raw) : raw;
        const img = card.querySelector("img");
        if (img && url) img.src = url;
      }
    });
  }

  document.querySelectorAll(".collection-card[data-col-filter], .collection-card[data-col-mood]").forEach(card => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      if (card.dataset.colFilter) {
        const btn = document.querySelector(`.filter-btn[data-filter="${card.dataset.colFilter}"]`);
        if (btn) btn.click();
      } else if (card.dataset.colMood) {
        const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
        if (allBtn) allBtn.click();
        const moodBtn = document.querySelector(`.mood-chip[data-mood="${card.dataset.colMood}"]`);
        if (moodBtn) moodBtn.click();
      }
      const shop = document.getElementById("shop");
      if (shop) shop.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Wire header search bar to #productSearch
  const headerForm = document.getElementById("headerSearchForm");
  const headerInput = document.getElementById("headerSearch");
  const productSearch = document.getElementById("productSearch");
  if (headerForm && headerInput && productSearch) {
    headerInput.addEventListener("input", () => {
      productSearch.value = headerInput.value;
      productSearch.dispatchEvent(new Event("input", { bubbles: true }));
    });
    headerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      productSearch.value = headerInput.value;
      productSearch.dispatchEvent(new Event("input", { bubbles: true }));
      const shop = document.getElementById("shop");
      if (shop) shop.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncCollections);
  } else {
    syncCollections();
  }
  window.addEventListener("ps:products-updated", syncCollections);
})();
