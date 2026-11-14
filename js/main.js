/* =====================================================================
   MAIN.JS — nav toggle, WhatsApp button, toast helper, footer year,
   and injecting brand info from STORE_CONFIG into every page.
   ===================================================================== */

function showToast(message, duration = 2200) {
  let toast = document.getElementById("globalToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "globalToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

function initAdaptiveLogo() {
  document.querySelectorAll(".logo-link img").forEach(img => {
    const update = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const artworkContainsWordmark = img.naturalWidth / img.naturalHeight > 2.1;
      img.closest(".logo-link")?.classList.toggle("logo-image-has-wordmark", artworkContainsWordmark);
    };
    if (img.complete) update();
    img.addEventListener("load", update);
    new MutationObserver(update).observe(img, { attributes: true, attributeFilter: ["src"] });
  });
}

function initWhatsAppButton() {
  const number = STORE_CONFIG.brand.whatsappNumber;
  const btn = document.getElementById("whatsappFloat");
  if (!btn) return;
  if (number && number.trim()) {
    btn.href = `https://wa.me/${number.trim()}`;
    btn.style.display = "flex";
  } else {
    btn.style.display = "none";
  }
}

function initNavToggle() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;
  const setOpen = open => {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    toggle.innerHTML = open ? "&times;" : "&#9776;";
    document.body.classList.toggle("nav-open", open);
  };
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", event => { if (event.key === "Escape") setOpen(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > 860) setOpen(false); });
}

function initFooterYear() {
  document.querySelectorAll(".footer-year").forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initWhatsAppButton();
  initAdaptiveLogo();
  initNavToggle();
  initFooterYear();
  Cart.updateHeaderCount();
});
