/* =====================================================================
   WISHLIST.JS — Persistent Wishlist (localStorage + UI badge)
   ===================================================================== */
(function () {
  const KEY = "ps_wishlist_v1";

  function readWishlist() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? raw.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function writeWishlist(ids) {
    try {
      localStorage.setItem(KEY, JSON.stringify([...new Set(ids.map(String))]));
    } catch (_) { }
    updateBadge();
  }

  function updateBadge() {
    const count = readWishlist().length;
    document.querySelectorAll("#headerWishlistCount").forEach(el => {
      el.textContent = String(count);
      el.classList.toggle("hidden", count === 0);
    });
  }

  window.psWishlist = {
    getAll: readWishlist,
    has: (id) => readWishlist().includes(String(id)),
    toggle: (id) => {
      const s = String(id);
      const list = readWishlist();
      const idx = list.indexOf(s);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(s);
      writeWishlist(list);
      return idx < 0;
    },
    remove: (id) => {
      writeWishlist(readWishlist().filter(x => x !== String(id)));
    }
  };

  document.addEventListener("DOMContentLoaded", updateBadge);
})();
