// Candor verified storefront catalog.
//
// Every item is tagged with its eligibility bucket and the IRS authority for it,
// sourced from Candor's internal HSA Compliance Reference (June 2026):
//   kind "eligible" → Bucket A, directly HSA-eligible, no documentation (GREEN)
//   kind "lmn"      → Bucket B, dual-use, needs a Letter of Medical Necessity (AMBER)
//   kind "dpc"      → Bucket A but capped: HSA-qualified only up to the monthly cap (ORANGE)
//
// RULES baked in here (do not break when editing):
//   - Bucket C (whitening, cosmetics, plain vitamins/supplements without an LMN,
//     employer-paid DPC) is NEVER listed.
//   - Fitness / gym memberships are NOT a standalone eligible category — the OBBB
//     fitness provision was stripped from the final law. Anything fitness-adjacent
//     is Bucket B (LMN) and badged amber.
//   - DPC is a cliff, not a ceiling: over $150/mo (self) or $300/mo (family) the
//     ENTIRE arrangement is disqualifying for that month. Surface the cap, always.
//   - All copy here is informational, not tax advice. Counsel review required
//     before public launch.

export const CATALOG = [
  // ---------- OTC medicine (Bucket A · CARES Act 2020) ----------
  {
    id: "otc-zyrtec",
    name: "Zyrtec 24-Hour Allergy, 90 ct",
    merchant: "Amazon",
    price: 31.99,
    category: "OTC",
    kind: "eligible",
    irs: "IRS Pub. 502 · CARES Act 2020",
    note: "OTC medicines no longer need a prescription to be HSA-eligible.",
  },
  {
    id: "otc-advil",
    name: "Advil Liqui-Gels, 160 ct",
    merchant: "Target",
    price: 17.49,
    category: "OTC",
    kind: "eligible",
    irs: "IRS Pub. 502 · CARES Act 2020",
    note: "Pain reliever — directly eligible OTC drug.",
  },
  {
    id: "otc-mucinex",
    name: "Mucinex DM 12-Hour, 42 ct",
    merchant: "CVS",
    price: 23.99,
    category: "OTC",
    kind: "eligible",
    irs: "IRS Pub. 502 · CARES Act 2020",
    note: "Cough & congestion medicine — directly eligible.",
  },
  {
    id: "otc-nicorette",
    name: "Nicorette 4mg Gum, 100 ct",
    merchant: "Walgreens",
    price: 47.99,
    category: "OTC",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Smoking-cessation product — qualified medical expense.",
  },

  // ---------- Vision (Bucket A · Pub. 502) ----------
  {
    id: "vis-acuvue",
    name: "Acuvue Oasys Contacts, 90 pk",
    merchant: "1-800 Contacts",
    price: 134.99,
    category: "Vision",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Prescription contact lenses — directly eligible.",
  },
  {
    id: "vis-warby",
    name: "Warby Parker Rx Eyeglasses",
    merchant: "Warby Parker",
    price: 95.0,
    category: "Vision",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Prescription eyeglasses — directly eligible.",
  },
  {
    id: "vis-solution",
    name: "Biotrue Contact Solution, 2 × 10 oz",
    merchant: "Walgreens",
    price: 15.49,
    category: "Vision",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Contact lens solution — directly eligible.",
  },
  {
    id: "vis-zenni",
    name: "Zenni Prescription Blue-Light Glasses",
    merchant: "Zenni Optical",
    price: 39.95,
    category: "Vision",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Eligible because they carry a vision prescription (non-Rx blue-light glasses are not).",
  },

  // ---------- Dental (Bucket A · Pub. 502 — treatment, NOT whitening) ----------
  {
    id: "den-byte",
    name: "Byte Clear Aligners — Orthodontic Treatment",
    merchant: "Byte",
    price: 1999.0,
    category: "Dental",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Orthodontia is eligible dental treatment. Whitening is not.",
  },
  {
    id: "den-polident",
    name: "Polident Denture Cleanser, 84 ct",
    merchant: "Target",
    price: 10.99,
    category: "Dental",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Denture care product — directly eligible.",
  },

  // ---------- Diagnostics (Bucket A · Pub. 502) ----------
  {
    id: "dx-omron",
    name: "Omron Platinum Blood Pressure Monitor",
    merchant: "Amazon",
    price: 89.99,
    category: "Diagnostics",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Home diagnostic device — directly eligible.",
  },
  {
    id: "dx-contour",
    name: "Contour Next Glucose Meter Kit",
    merchant: "Walgreens",
    price: 34.99,
    category: "Diagnostics",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Glucose meter, lancets & strips — directly eligible.",
  },
  {
    id: "dx-covid",
    name: "iHealth COVID-19 Antigen Tests, 5 pk",
    merchant: "Amazon",
    price: 24.99,
    category: "Diagnostics",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "At-home diagnostic test — directly eligible.",
  },
  {
    id: "dx-thermometer",
    name: "Vicks ComfortFlex Digital Thermometer",
    merchant: "CVS",
    price: 17.99,
    category: "Diagnostics",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Medical thermometer — directly eligible.",
  },

  // ---------- First aid & skin protection (Bucket A · Pub. 502) ----------
  {
    id: "fa-kit",
    name: "Johnson & Johnson All-Purpose First Aid Kit, 160 pc",
    merchant: "Target",
    price: 19.99,
    category: "First Aid",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "First-aid supplies — directly eligible.",
  },
  {
    id: "fa-sunscreen",
    name: "Neutrogena Sheer Zinc SPF 50 Sunscreen",
    merchant: "Walgreens",
    price: 12.99,
    category: "First Aid",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Broad-spectrum SPF 15+ sunscreen — directly eligible.",
  },

  // ---------- Family & maternity (Bucket A · Pub. 502 / CARES Act 2020) ----------
  {
    id: "fam-elvie",
    name: "Elvie Stride Hands-Free Breast Pump",
    merchant: "Elvie",
    price: 279.0,
    category: "Family",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Breast pump & supplies — directly eligible.",
  },
  {
    id: "fam-frida",
    name: "Frida Mom Postpartum Recovery Kit",
    merchant: "Amazon",
    price: 49.99,
    category: "Family",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Postpartum medical recovery supplies — directly eligible.",
  },
  {
    id: "fam-tampax",
    name: "Tampax Pearl Tampons, 96 ct",
    merchant: "Target",
    price: 21.99,
    category: "Family",
    kind: "eligible",
    irs: "CARES Act 2020",
    note: "Menstrual care products are HSA-eligible without a prescription.",
  },
  {
    id: "fam-firstresponse",
    name: "First Response Pregnancy Test, 3 pk",
    merchant: "Walgreens",
    price: 15.99,
    category: "Family",
    kind: "eligible",
    irs: "IRS Pub. 502",
    note: "Pregnancy test kit — directly eligible.",
  },

  // ---------- Direct Primary Care (Bucket A · CAPPED · OBBB 2026 / Notice 2026-05) ----------
  {
    id: "dpc-plum",
    name: "Plum Health DPC — Individual Membership",
    merchant: "Plum Health",
    price: 79.0,
    unit: "/mo",
    category: "DPC",
    kind: "dpc",
    cap: 150,
    capLabel: "$150/mo individual cap",
    irs: "OBBB Act 2026 · IRS Notice 2026-05",
    note: "HSA-qualified up to $150/mo (individual). Over the cap, the entire DPC arrangement is disqualifying for that month — a cliff, not a ceiling. Employer-paid fees do not qualify.",
  },
  {
    id: "dpc-family",
    name: "Hint Health Network DPC — Family Membership",
    merchant: "Hint Health",
    price: 269.0,
    unit: "/mo",
    category: "DPC",
    kind: "dpc",
    cap: 300,
    capLabel: "$300/mo family cap",
    irs: "OBBB Act 2026 · IRS Notice 2026-05",
    note: "HSA-qualified up to $300/mo (family). Exceeding the cap disqualifies the whole arrangement for that month. Only individually-paid fees qualify.",
  },

  // ---------- Telehealth (Bucket A · OBBB §71306, permanent) ----------
  {
    id: "tele-teladoc",
    name: "Teladoc General Medical Visit",
    merchant: "Teladoc",
    price: 75.0,
    category: "Telehealth",
    kind: "eligible",
    irs: "OBBB Act 2026 §71306",
    note: "Pre-deductible telehealth is permanently HSA-safe, retroactive to Jan 1, 2025.",
  },
  {
    id: "tele-amazon",
    name: "Amazon Clinic Virtual Visit",
    merchant: "Amazon Clinic",
    price: 35.0,
    category: "Telehealth",
    kind: "eligible",
    irs: "OBBB Act 2026 §71306",
    note: "Telehealth consultation — directly eligible.",
  },
  {
    id: "tele-sesame",
    name: "Sesame Online Doctor Visit",
    merchant: "Sesame",
    price: 29.0,
    category: "Telehealth",
    kind: "eligible",
    irs: "OBBB Act 2026 §71306",
    note: "Telehealth consultation — directly eligible.",
  },

  // ---------- Recovery & wearables (Bucket B · LMN REQUIRED) ----------
  {
    id: "lmn-oura",
    name: "Oura Ring Gen 4",
    merchant: "Oura",
    price: 349.0,
    category: "Recovery",
    kind: "lmn",
    irs: "IRS Pub. 502 (via LMN)",
    note: "Health-tracking wearable. Eligible only with a Letter of Medical Necessity tied to a diagnosed condition. LMN checkout (Truemed/Flex) is a Phase 2 feature.",
  },
  {
    id: "lmn-whoop",
    name: "Whoop 5.0 + 12-Month Membership",
    merchant: "Whoop",
    price: 239.0,
    category: "Recovery",
    kind: "lmn",
    irs: "IRS Pub. 502 (via LMN)",
    note: "Dual-use wearable. Requires an LMN tied to a diagnosed condition to qualify.",
  },
  {
    id: "lmn-theragun",
    name: "Theragun Relief Percussive Massager",
    merchant: "Therabody",
    price: 149.0,
    category: "Recovery",
    kind: "lmn",
    irs: "IRS Pub. 502 (via LMN)",
    note: "Recovery device. Eligible only with an LMN for a diagnosed condition (e.g. chronic pain).",
  },
];

// Filter chips are derived from the catalog so they stay in sync when SKUs change.
export const CATEGORIES = ["All", ...Array.from(new Set(CATALOG.map((p) => p.category)))];
