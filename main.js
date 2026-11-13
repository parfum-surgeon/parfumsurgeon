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
  toggle.addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
}

function initFooterYear() {
  document.querySelectorAll(".footer-year").forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initWhatsAppButton();
  initNavToggle();
  initFooterYear();
  Cart.updateHeaderCount();
});
