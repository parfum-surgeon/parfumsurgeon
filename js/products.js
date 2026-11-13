/* =====================================================================
   PRODUCTS.JS — product grid, filtering, search, and detail modal
   ===================================================================== */

let currentFilter = "all";
let currentSearch = "";
let modalQty = 1;
let activeModalProduct = null;\n\nasync function loadStoreProducts() {\n  try {\n    const cfg = STORE_CONFIG.backend;\n    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;\n    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/products?select=*&active=eq.true&order=name.asc`, { headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` } });\n    if (!response.ok) throw new Error("Could not load products");\n    const rows = await response.json();\n    if (rows.length) STORE_CONFIG.products = rows.map(p => ({ ...p, shortDescription: p.short_description || "", fragranceFamily: p.fragrance_family || "", image: p.image || "" }));\n  } catch (e) { console.error("Using local product catalogue:", e); }\n  renderProductGrid();\n}

function productCardHTML(p) {
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="img-wrap" data-action="open-modal">
        <img src="${resolveAssetPath(p.image)}" alt="${p.name} - Parfum Surgeon ${p.gender === 'men' ? "men's" : "women's"} perfume" loading="lazy">
      </div>
      <div class="card-body">
        <div class="tag-row">
          <span class="tag ${p.gender === 'men' ? 'tag-men' : 'tag-women'}">${p.gender === 'men' ? "Men's" : "Women's"}</span>
          <span class="tag tag-size">${p.size}</span>
        </div>
        <h3>${p.name}</h3>
        <p class="short-desc">${p.shortDescription}</p>
        <div class="price">${Cart.formatPrice(p.price)}</div>
        <div class="card-actions">
          <button class="btn btn-outline-dark" style="border:1px solid #000;color:#000;" data-action="open-modal">View Details</button>
          <button class="btn btn-gold" data-action="add-cart">Add to Cart</button>
        </div>
      </div>
    </article>
  `;
}

function renderProductGrid() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  let products = STORE_CONFIG.products;

  if (currentFilter !== "all") {
    products = products.filter(p => p.gender === currentFilter);
  }
  if (currentSearch.trim()) {
    const q = currentSearch.trim().toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.fragranceFamily.toLowerCase().includes(q)
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
  document.getElementById("modalDescription").textContent = product.description;
  document.getElementById("modalGender").textContent = product.gender === "men" ? "Men's Collection" : "Women's Collection";
  document.getElementById("modalSize").textContent = product.size;
  document.getElementById("modalPersonality").textContent = product.personality;
  document.getElementById("modalOccasions").textContent = product.occasions;
  document.getElementById("modalFamily").textContent = product.fragranceFamily;
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
  renderProductGrid();

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  const searchInput = document.getElementById("productSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderProductGrid();
    });
  }

  // URL param support for header links like shop.html?filter=men
  const params = new URLSearchParams(window.location.search);
  if (params.get("filter")) setFilter(params.get("filter"));

  document.getElementById("modalCloseBtn")?.addEventListener("click", closeProductModal);
  document.getElementById("modalOverlay")?.addEventListener("click", (e) => {
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
});
