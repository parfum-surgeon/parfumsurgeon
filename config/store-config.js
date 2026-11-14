/* =====================================================================
   PARFUM SURGEON — CENTRAL STORE CONFIGURATION
   =====================================================================
   Edit THIS FILE to change prices, delivery fee, bank details, WhatsApp
   number, social links, and product content. Nothing else in the code
   needs to change for everyday store updates.

   DO NOT put real API keys or backend secrets in this file — it is
   public once pushed to GitHub. See README.md "Connecting the backend"
   section for where secrets actually belong (Supabase Row Level
   Security + a serverless email function keep real secrets server-side).
   ===================================================================== */

const STORE_CONFIG = {

  // ---------------------------------------------------------------
  // BRAND
  // ---------------------------------------------------------------
  brand: {
    name: "Parfum Surgeon",
    tagline: "The Science of Signature Scents.",
    supportEmail: "parfumsurgeon@gmail.com",
    location: "Lahore, Pakistan",
    deliveryArea: "Nationwide Pakistan",
    instagramUrl: "https://www.instagram.com/parfumsurgeon",
    facebookUrl: "https://www.facebook.com/share/1G25dWLNv8/?mibextid=wwXIfr",
    // Leave blank until you have a number. Format: "923001234567" (no + , no spaces).
    // The WhatsApp button automatically hides itself when this is blank.
    whatsappNumber: "",
    logoImage: "assets/logo/parfum-surgeon-logo.svg"
  },

  // ---------------------------------------------------------------
  // CURRENCY / PRICING / DELIVERY  — edit these as your business needs change
  // ---------------------------------------------------------------
  currency: "PKR",
  deliveryFee: 250,              // Flat delivery charge per order (PKR)
  freeDeliveryThreshold: null,   // Set a number (e.g. 10000) to enable free delivery above that subtotal, or leave null to disable.

  // EDITABLE SETTING: no confirmed delivery estimate was provided.
  // Set this once you know real dispatch/delivery timelines, e.g. "2-4 business days".
  // Leave as null and the site will simply not display a delivery-time claim.
  estimatedDeliveryTime: null,

  returnPolicyDays: 30,

  // ---------------------------------------------------------------
  // PAYMENT METHODS
  // ---------------------------------------------------------------
  payments: {
    cod: {
      enabled: true,
      label: "Cash on Delivery",
      description: "Pay in cash when your order is delivered to your doorstep."
    },
    bankTransfer: {
      enabled: true,
      label: "Meezan Bank Transfer",
      bankName: "Meezan Bank",
      accountHolder: "Noman Ali",
      accountNumber: "02140107996166",
      iban: "ADD-YOUR-IBAN-HERE",
      instructions: "Transfer the exact order total to the account below, then upload your payment receipt or enter the transaction reference. Your order stays 'Pending Verification' until we confirm the payment."
    },
    easypaisa: {
      enabled: true,
      label: "EasyPaisa",
      accountTitle: "Parfum Surgeon",
      accountNumber: "03234028507",
      note: "Send payment to this EasyPaisa number. Your order will remain pending until payment is verified."
    },
    jazzcash: {
      enabled: true,
      label: "JazzCash",
      accountTitle: "Parfum Surgeon",
      accountNumber: "03234028507",
      note: "Send payment to this JazzCash number. Your order will remain pending until payment is verified."
    }
  },

  // ---------------------------------------------------------------
  // BACKEND ENDPOINTS (filled in once you follow the README setup)
  // These are PUBLIC-safe values by design:
  //   - Supabase "anon" key is meant to be exposed in frontend code;
  //     real protection comes from Row Level Security rules on the server.
  //   - EmailJS "public key" is also meant to be exposed client-side.
  // Real secrets (Supabase service_role key, email provider private keys)
  // must never be placed here — see README.md.
  // ---------------------------------------------------------------
  backend: {
    supabaseUrl: "https://shtksedfchykyfbwjuoo.supabase.co",          // Supabase project URL
    supabaseAnonKey: "sb_publishable_1p3o7U50k5ycXj9NIkwhEw_f5hLtgQZ",      // public publishable key
    emailjsPublicKey: "",     // EmailJS public key
    emailjsServiceId: "",     // EmailJS service ID
    emailjsCustomerTemplateId: "",  // EmailJS template ID for customer confirmation
    emailjsOwnerTemplateId: ""      // EmailJS template ID for owner notification
  },

  // ---------------------------------------------------------------
  // PAKISTAN PROVINCES & MAJOR CITIES (for checkout dropdowns)
  // ---------------------------------------------------------------
  locations: {
    "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha", "Sheikhupura", "Other"],
    "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Mirpur Khas", "Other"],
    "Khyber Pakhtunkhwa": ["Peshawar", "Abbottabad", "Mardan", "Swat", "Kohat", "Other"],
    "Balochistan": ["Quetta", "Gwadar", "Turbat", "Other"],
    "Islamabad Capital Territory": ["Islamabad"],
    "Azad Jammu & Kashmir": ["Muzaffarabad", "Mirpur", "Other"],
    "Gilgit-Baltistan": ["Gilgit", "Skardu", "Other"]
  },

  // ---------------------------------------------------------------
  // PRODUCTS — ALL 10 PERFUMES
  // "fragranceImpression" is kept here ONLY as an internal writing
  // reference. It is never shown to customers and no customer-facing
  // text claims association with, or manufacture by, any other brand.
  // ---------------------------------------------------------------
  products: [
    {
      id: "the-antidote",
      name: "THE ANTIDOTE",
      gender: "men",
      capColor: "black",
      fragranceImpression: "Profondo", // internal reference only — not displayed
      size: "50ml",
      price: 3499,
      image: "the-antidote.jpg",
      shortDescription: "A deep, resinous composition built for presence rather than noise.",
      description: "THE ANTIDOTE opens with a sharp, aromatic clarity before settling into a warm bed of amber and dark woods. It was composed for the man who would rather be remembered than remarked upon — confident, deliberate, and unmistakably grounded.",
      personality: "Confident, grounded, enigmatic",
      occasions: "Evening wear, formal dinners, winter days",
      fragranceFamily: "Woody Amber"
    },
    {
      id: "the-prescription",
      name: "THE PRESCRIPTION",
      gender: "men",
      capColor: "black",
      fragranceImpression: "Janan Support",
      size: "50ml",
      price: 3499,
      image: "the-prescription.jpg",
      shortDescription: "A warm, spiced oriental designed to feel both familiar and commanding.",
      description: "THE PRESCRIPTION blends spiced top notes with a rich, slightly sweet heart, finishing on a smooth, woody base. It carries a quiet authority — the kind of scent that fills a room before a word is spoken.",
      personality: "Warm, assured, magnetic",
      occasions: "Everyday wear, gatherings, cooler evenings",
      fragranceFamily: "Spicy Oriental"
    },
    {
      id: "the-compound",
      name: "THE COMPOUND",
      gender: "men",
      capColor: "black",
      fragranceImpression: "9PM",
      size: "50ml",
      price: 3499,
      image: "the-compound.jpg",
      shortDescription: "A sweet, addictive blend of vanilla and spice, built for the night.",
      description: "THE COMPOUND is dark, sweet and unapologetically bold — a swirl of vanilla, spice and amber wrapped in a smooth woody base. Composed for nights that are remembered the next morning.",
      personality: "Bold, seductive, unforgettable",
      occasions: "Nightlife, dates, celebrations",
      fragranceFamily: "Sweet Oriental"
    },
    {
      id: "the-dosage",
      name: "THE DOSAGE",
      gender: "men",
      capColor: "black",
      fragranceImpression: "Dunhill Desire",
      size: "50ml",
      price: 3499,
      image: "the-dosage.jpg",
      shortDescription: "A crisp, energetic fresh-woody scent for the man always in motion.",
      description: "THE DOSAGE opens bright and citrus-fresh, moving into a clean woody heart with a soft, lasting base. Light enough for daily wear, distinct enough to notice.",
      personality: "Energetic, clean, approachable",
      occasions: "Office, daytime, casual outings",
      fragranceFamily: "Fresh Woody"
    },
    {
      id: "the-catalyst",
      name: "THE CATALYST",
      gender: "men",
      capColor: "black",
      fragranceImpression: "Cigar",
      size: "50ml",
      price: 3499,
      image: "the-catalyst.jpg",
      shortDescription: "A rich, tobacco-leather composition with old-world confidence.",
      description: "THE CATALYST is built on warm tobacco, leather and a touch of sweetness — a composition that feels lived-in and luxurious from the very first spray. Not for the quiet room.",
      personality: "Rich, mature, commanding",
      occasions: "Formal events, winter evenings, special occasions",
      fragranceFamily: "Tobacco Leather"
    },
    {
      id: "the-elixir",
      name: "THE ELIXIR",
      gender: "unisex",
      capColor: "black",
      fragranceImpression: "Cool Water",
      size: "50ml",
      price: 3499,
      image: "the-elixir.jpg",
      shortDescription: "A crisp aquatic classic — clean, fresh and endlessly versatile.",
      description: "THE ELIXIR captures the feeling of sea spray and open air — bright, aquatic and clean, resting on a soft woody-musk base. An everyday signature that never overstays its welcome.",
      personality: "Fresh, clean, effortless",
      occasions: "Daily wear, summer, sport and casual settings",
      fragranceFamily: "Aromatic Aquatic"
    },
    {
      id: "the-remedy",
      name: "THE REMEDY",
      gender: "men",
      capColor: "black",
      fragranceImpression: "Midnight",
      size: "50ml",
      price: 3499,
      image: "the-remedy.jpg",
      shortDescription: "A smooth, mysterious scent made for low light and long nights.",
      description: "THE REMEDY moves through dark spice and smooth woods, finishing on a soft musk that lingers just enough. Composed for the hours after sunset.",
      personality: "Mysterious, smooth, quietly intense",
      occasions: "Evenings, dinners, special nights out",
      fragranceFamily: "Spicy Woody"
    },
    {
      id: "the-formula",
      name: "THE FORMULA",
      gender: "men",
      capColor: "black",
      fragranceImpression: "Wanted",
      size: "50ml",
      price: 3499,
      image: "the-formula.jpg",
      shortDescription: "A sharp, fruity-spiced scent with unmistakable charisma.",
      description: "THE FORMULA opens with a burst of dark fruit and spice before settling into a smooth, woody-amber base. Charismatic and a little daring — built to be noticed.",
      personality: "Charismatic, daring, magnetic",
      occasions: "Social events, dates, evenings out",
      fragranceFamily: "Fruity Spicy"
    },
    {
      id: "the-panacea",
      name: "THE PANACEA",
      gender: "men",
      capColor: "black",
      fragranceImpression: "Sauvage",
      size: "50ml",
      price: 3499,
      image: "the-panacea.jpg",
      shortDescription: "A powerful fresh-spicy composition with raw, modern energy.",
      description: "THE PANACEA combines a sharp citrus opening with a radiant, peppery heart and a clean ambery base. Modern, powerful and built for confidence on any occasion.",
      personality: "Powerful, modern, confident",
      occasions: "Versatile — day to night, any season",
      fragranceFamily: "Fresh Spicy"
    },
    {
      id: "the-serum",
      name: "THE SERUM",
      gender: "women",
      capColor: "gold",
      fragranceImpression: "Bright Crystal",
      size: "50ml",
      price: 3499,
      image: "the-serum.jpg",
      shortDescription: "A luminous floral-fruity scent, light, feminine and effortlessly elegant.",
      description: "THE SERUM opens with juicy, sparkling fruit before unfolding into a soft floral heart of peony and magnolia, resting on a delicate musky base. Elegant, light and endlessly wearable.",
      personality: "Elegant, graceful, luminous",
      occasions: "Daytime, office, everyday elegance",
      fragranceFamily: "Floral Fruity"
    }
  ]
};

// Expose globally for the rest of the site's scripts
window.STORE_CONFIG = STORE_CONFIG;
