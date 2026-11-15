/* =====================================================================
   ANALYTICS.JS — Configurable GA4, GTM & Meta Pixel hooks (no fake IDs)
   ===================================================================== */
(function () {
  const cfg = (window.STORE_CONFIG && window.STORE_CONFIG.analytics) || {};

  if (cfg.ga4Id && /^G-[A-Z0-9]+$/i.test(cfg.ga4Id)) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4Id)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", cfg.ga4Id);
  }

  if (cfg.metaPixelId && /^\d+$/.test(String(cfg.metaPixelId))) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", String(cfg.metaPixelId));
    window.fbq("track", "PageView");
  }

  window.psTrack = function (eventName, payload) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", eventName, payload || {});
      if (typeof window.fbq === "function") {
        const fbMap = {
          view_item: "ViewContent",
          add_to_cart: "AddToCart",
          begin_checkout: "InitiateCheckout",
          purchase: "Purchase",
          search: "Search"
        };
        window.fbq("track", fbMap[eventName] || eventName, payload || {});
      }
    } catch (_) { }
  };
})();
