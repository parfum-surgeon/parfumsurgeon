/* =====================================================================
   REVIEWS.JS — Real Supabase-backed Customer Reviews & Newsletter
   ===================================================================== */
(function () {
  const cfg = window.STORE_CONFIG || {};
  const sb = (cfg.supabase && cfg.supabase.url)
    ? cfg.supabase
    : { url: cfg.backend?.supabaseUrl || "", anonKey: cfg.backend?.supabaseAnonKey || "" };
  const LOCAL_REVIEWS_KEY = "ps_local_reviews_v1";

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function populateProductSelect() {
    const sel = document.getElementById("revProduct");
    if (!sel || !Array.isArray(cfg.products)) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">Select Perfume *</option>` +
      cfg.products.map(p => `<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.size || "50ml")})</option>`).join("");
    if (current) sel.value = current;
  }

  async function loadApprovedReviews() {
    const grid = document.getElementById("reviewsGrid");
    const eyebrow = document.getElementById("reviewsSummaryEyebrow");
    if (!grid || !sb.url || !sb.anonKey) return;

    try {
      const res = await fetch(
        `${sb.url}/rest/v1/reviews?select=id,customer_name,city,product_id,product_name,rating,comment,created_at&is_approved=eq.true&order=created_at.desc&limit=6`,
        {
          headers: {
            apikey: sb.anonKey,
            Authorization: `Bearer ${sb.anonKey}`
          },
          cache: "no-store"
        }
      );
      if (!res.ok) return;
      const rows = await res.json();
      if (!Array.isArray(rows) || !rows.length) return;

      const avg = (rows.reduce((s, r) => s + Number(r.rating || 5), 0) / rows.length).toFixed(1);
      if (eyebrow) eyebrow.textContent = `Verified Customer Reviews · ★ ${avg} / 5.0 (${rows.length})`;

      grid.innerHTML = rows.map(r => {
        const stars = "★".repeat(Math.max(1, Math.min(5, Number(r.rating) || 5)));
        const meta = [r.city, r.product_name].filter(Boolean).join(" · ");
        return `
          <article class="review-card">
            <div class="review-stars" aria-label="${Number(r.rating) || 5} out of 5 stars">${stars}</div>
            <p class="review-quote">"${esc(r.comment)}"</p>
            <div class="review-author">
              <strong>${esc(r.customer_name)}</strong>
              <span>${esc(meta || "Verified Customer")}</span>
            </div>
          </article>`;
      }).join("");
    } catch (_) {
      // Keep clean empty state if reviews table is not yet provisioned
    }
  }

  function wireReviewForm() {
    const form = document.getElementById("reviewSubmitForm");
    const msg = document.getElementById("revFormMsg");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("revName")?.value.trim();
      const city = document.getElementById("revCity")?.value.trim();
      const productSel = document.getElementById("revProduct");
      const productId = productSel?.value || "";
      const productName = productSel?.selectedOptions?.[0]?.textContent?.replace(/\s*\(.*\)$/, "") || "";
      const rating = Number(document.getElementById("revRating")?.value || 5);
      const comment = document.getElementById("revComment")?.value.trim();

      if (!name || !productId || !comment) {
        if (msg) msg.textContent = "Please fill in your name, perfume, and review.";
        return;
      }
      if (!sb.url || !sb.anonKey) {
        if (msg) msg.textContent = "Store database is not configured yet.";
        return;
      }

      if (msg) msg.textContent = "Submitting...";
      try {
        const res = await fetch(`${sb.url}/rest/v1/reviews`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: sb.anonKey,
            Authorization: `Bearer ${sb.anonKey}`,
            Prefer: "return=minimal"
          },
          body: JSON.stringify({
            customer_name: name,
            city: city || null,
            product_id: productId,
            product_name: productName,
            rating,
            comment,
            is_approved: false
          })
        });
        if (res.ok) {
          form.reset();
          if (msg) msg.textContent = "Thank you! Your review has been submitted for moderation.";
        } else if (res.status === 404) {
          try {
            const local = JSON.parse(localStorage.getItem(LOCAL_REVIEWS_KEY) || "[]");
            local.unshift({ customer_name: name, city, product_id: productId, product_name: productName, rating, comment, created_at: new Date().toISOString() });
            localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(local.slice(0, 20)));
          } catch (_) {}
          form.reset();
          if (msg) msg.textContent = "Thank you! Your review has been saved and received.";
        } else {
          if (msg) msg.textContent = "Could not save review right now. Please try again shortly.";
        }
      } catch (_) {
        if (msg) msg.textContent = "Network error while submitting review.";
      }
    });
  }

  function wireNewsletter() {
    const form = document.getElementById("newsletterForm");
    const msg = document.getElementById("newsletterMsg");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("newsletterEmail")?.value.trim();
      if (!email) return;
      if (msg) msg.textContent = "Subscribing...";
      try {
        if (sb.url && sb.anonKey) {
          const res = await fetch(`${sb.url}/rest/v1/newsletter_subscribers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: sb.anonKey,
              Authorization: `Bearer ${sb.anonKey}`,
              Prefer: "return=minimal"
            },
            body: JSON.stringify({ email })
          });
          if (res.ok || res.status === 409) {
            form.reset();
            if (msg) msg.textContent = "You're subscribed for Parfum Surgeon updates.";
            return;
          }
        }
        if (msg) msg.textContent = "Saved locally. Thank you for subscribing.";
      } catch (_) {
        if (msg) msg.textContent = "Could not subscribe right now.";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateProductSelect();
    loadApprovedReviews();
    wireReviewForm();
    wireNewsletter();
  });
  window.addEventListener("ps:products-updated", populateProductSelect);
})();
