# Parfum Surgeon — E-Commerce Website

A premium, mobile-responsive e-commerce site for Parfum Surgeon, built as static
HTML/CSS/JS (GitHub Pages compatible) with a real order backend (Supabase) and
real email notifications (EmailJS) — both free to start.

## ⚠️ Known gaps to fix before going live — read this first

1. **Product photos:** All 10 products now have real photos. Two (**The
   Elixir**, **The Compound**) use your dedicated standalone shots; the
   other 8 are cropped directly from your "Top 10" collage image — real
   photography, not AI-generated, just cropped into individual product
   shots. Crop quality is good but slightly lower‑resolution than the two
   standalone shots — swap in higher‑res individual photos later if you get
   them, via `config/store-config.js` → each product's `image` path.
2. **Cap-colour rule isn't followed consistently in your source artwork:**
   You confirmed **black cap = men's, gold cap = women's**. Checking every
   bottle in your real photos against this rule:
   - Correct: The Dosage, The Elixir (collage version used), The Catalyst,
     The Formula, The Panacea, The Compound (standalone photo used) — black
     caps, all men's. The Serum — gold cap, women's. ✅
   - **Inconsistent in the source photos:** **The Remedy**, **The
     Prescription**, and **The Antidote** are all men's products but their
     real photos show **gold caps**. I have not recoloured any bottle caps
     (per your instruction not to alter real photography) — these three
     simply don't match the stated rule in the artwork you provided. You'll
     want either new photos for these three with black caps, or to move
     them into the Women's Collection if the cap colour is actually correct
     and the gender assignment is what's wrong. Worth a decision before
     launch.
3. **Delivery time estimate:** Left unset on purpose (no confirmed figure was
   given) — add one later in the same config file and in
   `pages/delivery-info.html` once confirmed.
4. **Backend not yet connected:** Until you complete the Supabase + EmailJS
   setup below, checkout will clearly tell visitors that order submission
   isn't connected yet, instead of faking a successful order.

---

## Project Structure

```
parfum-surgeon/
├── index.html              Home + full shop (all 10 products, filters, search)
├── checkout.html           Checkout, payment, order placement
├── css/style.css
├── js/
│   ├── cart.js             localStorage cart logic
│   ├── products.js         product grid, filter/search, detail modal
│   ├── checkout.js         form validation, order submission, emails
│   └── main.js             nav, WhatsApp button, toasts
├── assets/
│   ├── logo/                parfum-surgeon-logo.jpg (your real logo)
│   ├── products/             the-elixir.jpg, the-compound.jpg (real photos)
│   │                         placeholder-men.svg / placeholder-women.svg
│   └── banners/               top10-collage.jpg
├── pages/
│   ├── about.html, contact.html, return-policy.html,
│   │   privacy-policy.html, terms.html, delivery-info.html
├── config/store-config.js   ← EDIT THIS for prices, delivery fee, bank
│                               details, WhatsApp number, product content
├── robots.txt
├── sitemap.xml
└── README.md
```

---

## 1–5. Deploying to GitHub Pages (free)

1. **Create a repository:** On github.com, click **New repository**, name it
   e.g. `parfum-surgeon`, set it to **Public** (required for free GitHub
   Pages), and create it without a README (we already have one).
2. **Upload the files:** On the repo page, click **Add file → Upload files**,
   drag in the entire contents of this `parfum-surgeon` folder (keeping the
   folder structure), and commit.
   - Alternative (recommended if you're comfortable with git):
     ```
     git init
     git add .
     git commit -m "Initial Parfum Surgeon site"
     git branch -M main
     git remote add origin https://github.com/YOUR-USERNAME/parfum-surgeon.git
     git push -u origin main
     ```
3. **Organizing product images:** Keep all product photos inside
   `assets/products/`, one file per perfume, named simply (e.g.
   `the-antidote.jpg`). Reference the filename in `config/store-config.js`.
4. **Enable GitHub Pages:** Repo → **Settings → Pages** → under "Build and
   deployment", set **Source: Deploy from a branch**, **Branch: main**,
   folder **/ (root)** → Save.
5. **Get your public URL:** After ~1 minute, the same Pages settings page
   shows your live URL, typically:
   `https://YOUR-USERNAME.github.io/parfum-surgeon/`
   Update the `<link rel="canonical">` tags and `sitemap.xml`/`robots.txt`
   placeholder domains to this URL (or your future custom domain).

---

## 6. Connecting the backend (Supabase — free tier)

GitHub Pages only serves static files — it cannot store orders. Supabase
gives you a free hosted database plus a REST API your checkout page can
call directly, safely, using Row Level Security (RLS) so the public key in
your frontend can **only insert new orders**, never read, edit or delete
anyone's data.

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier).
2. Once created, open the **SQL Editor** and run:

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  customer_name text not null,
  mobile_number text not null,
  email text,
  province text not null,
  city text not null,
  address text not null,
  postal_code text,
  order_notes text,
  items jsonb not null,
  subtotal numeric not null,
  delivery_fee numeric not null,
  grand_total numeric not null,
  payment_method text not null,
  payment_reference text,
  payment_status text not null default 'Pending',
  order_status text not null default 'Pending',
  created_at timestamptz not null default now()
);

alter table orders enable row level security;

-- Public (anon key) may INSERT orders only — cannot read, update or delete.
create policy "public can insert orders"
  on orders for insert
  to anon
  with check (true);
```

3. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public key**.
4. Paste both into `config/store-config.js`:
   ```js
   backend: {
     supabaseUrl: "https://xxxxxxxx.supabase.co",
     supabaseAnonKey: "eyJ....your-anon-key....",
     ...
   }
   ```
   This is safe to commit — the anon key is designed to be public; RLS is
   what actually protects your data.
5. **To view/manage orders:** use Supabase's **Table Editor** (sign in with
   your Supabase account — the public site visitors never get this access)
   to see new orders and update `order_status` / `payment_status` as you
   confirm bank transfers and dispatch orders.

### Email notifications (EmailJS — free tier, ~200 emails/month)

1. Go to [emailjs.com](https://www.emailjs.com) → create a free account.
2. Add an **Email Service** (e.g. connect your Gmail —
   parfumsurgeon@gmail.com).
3. Create two **Templates**:
   - **Customer confirmation** — sent to the customer's email (if provided).
   - **Owner notification** — sent to parfumsurgeon@gmail.com with the full
     order details.
   Use template variables matching `js/checkout.js`:
   `{{order_id}}`, `{{customer_name}}`, `{{mobile_number}}`,
   `{{delivery_address}}`, `{{products_list}}`, `{{grand_total}}`,
   `{{payment_method}}`, `{{to_email}}`.
4. Copy your **Public Key**, **Service ID**, and both **Template IDs** into
   `config/store-config.js` → `backend`.
5. EmailJS's public key is, like Supabase's anon key, meant to be used
   client-side — this does not expose your email account credentials.

**Never put a Supabase `service_role` key, an SMTP password, or any other
private secret in this repository** — only the public-safe keys described
above belong here.

---

## 7. Testing order placement

1. Open your live GitHub Pages URL.
2. Add 1–2 products to the cart, open the cart drawer, click **Proceed to
   Checkout**.
3. Fill in the form with test details, choose **Cash on Delivery**, submit.
4. Confirm: you see the confirmation screen with an order reference, AND the
   order appears in Supabase's Table Editor, AND (if EmailJS is configured)
   both emails arrive.
5. Repeat selecting **Meezan Bank Transfer** and confirm the bank details box
   and payment reference field appear correctly, and the order saves with
   `payment_status = "Awaiting Verification"`.
6. Refresh the page mid-cart to confirm items persist (localStorage).
7. Try submitting the form with required fields empty to confirm validation
   blocks it.

---

## 8. Updating product prices, images, and content later

Everything customer-facing lives in **`config/store-config.js`**:
- Change any `price` value to update that perfume's price everywhere at once.
- Change `deliveryFee` to update the flat delivery charge sitewide.
- Change `image` paths once you upload more real product photos to
  `assets/products/`.
- Add `whatsappNumber` (digits only, country code, no `+`) once you have one
  — the floating WhatsApp button will appear automatically.
- Edit `payments.bankTransfer.accountNumber` once you have it.

No other files need to change for these everyday updates.

---

## 9. Connecting a custom domain later (optional, has a cost)

GitHub Pages hosting itself stays free forever. A custom domain (e.g.
`parfumsurgeon.pk`) is optional and paid separately through a domain
registrar (typically $10–15/year for a `.com`, prices vary for `.pk`).

1. Buy a domain from any registrar (Namecheap, GoDaddy, a local Pakistani
   registrar for `.pk`, etc.).
2. In the registrar's DNS settings, add a `CNAME` record pointing to
   `YOUR-USERNAME.github.io`.
3. In your GitHub repo → **Settings → Pages → Custom domain**, enter your
   domain and save. GitHub provides free HTTPS automatically once DNS
   propagates.
4. Update the placeholder domain in `index.html`'s canonical tag,
   `robots.txt`, and `sitemap.xml` to your real domain.

### Third-party services and costs, summarized
| Service | Free tier | When you'd pay |
|---|---|---|
| GitHub Pages | Free, forever | Never (for hosting) |
| Supabase | Free tier (500MB DB, generous for an order log) | Only if you outgrow the free tier |
| EmailJS | Free up to ~200 emails/month | If you exceed that volume |
| Domain name | Not free | Annual registration fee if you want a custom domain |

---

Questions or issues: parfumsurgeon@gmail.com
