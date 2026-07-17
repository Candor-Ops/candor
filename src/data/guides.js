// Pillar HSA guides — VERSIONED DATA rendered to static SEO pages by
// scripts/generate-eligibility-pages.mjs. Same rules as eligibilityRules.js:
// cite everything, no tax advice, counsel review before launch.

export const GUIDES_VERSION = "2026-07-16";

export const GUIDES = [
  {
    slug: "hsa-rules-2026",
    title: "HSA Rules 2026: The Complete Guide",
    description:
      "Everything that governs your HSA in 2026 — contribution limits, HDHP requirements, the triple tax advantage, qualified expenses, and the rules people miss.",
    sections: [
      {
        heading: "Who can contribute in 2026",
        paragraphs: [
          "To contribute to an HSA you must be covered by a qualified high-deductible health plan (HDHP), have no disqualifying other coverage, not be enrolled in Medicare, and not be claimable as a dependent. For 2026, an HDHP means a deductible of at least $1,700 (self-only) or $3,400 (family), with out-of-pocket maximums no higher than $8,500 / $17,000 (Rev. Proc. 2025-19).",
          "One 2026-friendly exception: thanks to OBBB §71306, an HDHP can cover telehealth before you meet your deductible without breaking your HSA eligibility — permanently.",
        ],
      },
      {
        heading: "2026 contribution limits",
        paragraphs: [
          "The 2026 limits are $4,400 for self-only coverage and $8,750 for family coverage (Rev. Proc. 2025-19). If you're 55 or older, add a $1,000 catch-up contribution. Limits apply across all your HSAs combined, and employer contributions count against them.",
          "Contributions for a tax year can be made until the tax-filing deadline the following April — one of the few retroactive tax moves available.",
        ],
      },
      {
        heading: "The triple tax advantage",
        paragraphs: [
          "HSAs are the only account with three tax breaks stacked: contributions are tax-deductible (or pre-tax through payroll, which also skips FICA), growth is tax-free, and withdrawals for qualified medical expenses are tax-free. No other account — not a 401(k), not a Roth IRA — does all three.",
        ],
      },
      {
        heading: "What counts as a qualified expense",
        paragraphs: [
          "Qualified medical expenses are defined by IRC §213(d) and cataloged in IRS Publication 502: care that diagnoses, treats, mitigates, or prevents disease. Doctor visits, prescriptions, dental and vision care, OTC medicines (since the CARES Act of 2020), menstrual products, and much more.",
          "The line that trips people up: expenses for GENERAL HEALTH — gym memberships, supplements, wellness apps — are not qualified, unless a Letter of Medical Necessity ties them to treating a specific diagnosed condition. Candor's eligibility database covers 160+ items with citations.",
        ],
      },
      {
        heading: "The establishment-date rule",
        paragraphs: [
          "You can only reimburse expenses incurred AFTER your HSA was established. An expense from the year before you opened the account never becomes reimbursable — which is why opening an HSA (even with a small deposit) as early as possible matters. Candor asks for your establishment date once and flags every receipt automatically.",
        ],
      },
      {
        heading: "The last-month rule (careful)",
        paragraphs: [
          "If you're HSA-eligible on December 1, you may contribute the full annual limit for that year — but only if you stay eligible through the end of the NEXT year (the 'testing period'). Fail it and the extra contributions become taxable income plus a 10% penalty. Powerful, but brittle.",
        ],
      },
      {
        heading: "Penalties worth knowing",
        paragraphs: [
          "Non-qualified withdrawals before 65 are taxed as income PLUS a 20% penalty. After 65, non-qualified withdrawals are just ordinary income (like a traditional IRA). Excess contributions carry a 6% excise tax every year until corrected.",
        ],
      },
    ],
  },
  {
    slug: "hsa-shoebox-rule",
    title: "The HSA Shoebox Strategy: Reimburse Yourself Years Later, Tax-Free",
    description:
      "IRS Notice 2004-50 Q&A 39 puts no deadline on HSA reimbursements. Pay out of pocket, keep the receipt, let your HSA grow — and withdraw tax-free whenever you choose.",
    sections: [
      {
        heading: "The rule almost nobody uses",
        paragraphs: [
          "IRS Notice 2004-50, Q&A 39 says an HSA distribution for a qualified expense is tax-free whenever it happens — there is NO deadline between paying the expense and reimbursing yourself. Pay for a filling in 2026, reimburse yourself in 2046. Tax-free either way.",
        ],
      },
      {
        heading: "Why paying out of pocket wins",
        paragraphs: [
          "Every dollar you don't withdraw stays invested growing tax-free. A $200 expense reimbursed today costs your HSA $200; the same $200 left invested for 20 years at 7% becomes roughly $775 of tax-free money. Paying out of pocket converts your HSA from a spending account into the most tax-advantaged retirement account that exists.",
          "Meanwhile your receipts accumulate as a 'claimable balance' — an emergency fund you can tap tax-free at any moment, for any reason, by reimbursing old expenses.",
        ],
      },
      {
        heading: "The three requirements",
        paragraphs: [
          "1) The expense must have been incurred AFTER your HSA was established. 2) It must be a qualified medical expense that wasn't reimbursed by insurance or anyone else. 3) You must not have taken it as an itemized deduction. Meet those, and the reimbursement clock never expires.",
        ],
      },
      {
        heading: "The catch: proof",
        paragraphs: [
          "The IRS can ask you to substantiate any distribution. A 2040 reimbursement of a 2026 expense needs the 2026 receipt — date, provider, amount, what it was. Fading paper in an actual shoebox fails this test; that's the problem Candor exists to solve. Vault the receipt when you pay, and the audit defense is permanent.",
        ],
      },
      {
        heading: "How Candor tracks it",
        paragraphs: [
          "Log the expense, attach the receipt, and your Claimable Balance grows — the running total you can withdraw tax-free today or decades from now. Mark expenses reimbursed when you finally claim them, and export everything at tax time.",
        ],
      },
    ],
  },
  {
    slug: "hsa-changes-obbb-2026",
    title: "What the OBBB Changed for HSAs in 2026 (DPC, Telehealth & What Didn't Make It)",
    description:
      "Direct Primary Care memberships became HSA-eligible with a hard monthly cap, telehealth's pre-deductible safe harbor became permanent — and the gym provision died. What actually changed in 2026.",
    sections: [
      {
        heading: "Direct Primary Care is now HSA-eligible — with a cliff",
        paragraphs: [
          "Starting January 1, 2026, individually-paid DPC membership fees are qualified expenses AND holding a DPC membership no longer breaks HSA eligibility — up to $150/month (self) or $300/month (family), inflation-adjusted (OBBB 2026; IRS Notice 2026-05).",
          "The cap is a CLIFF, not a ceiling: pay $151/month and the entire arrangement is disqualifying for that month — not just the extra dollar. And employer-paid DPC never qualifies; only fees you pay yourself count.",
        ],
      },
      {
        heading: "Telehealth pre-deductible coverage is permanent",
        paragraphs: [
          "Since 2020, a temporary rule let HDHPs cover telehealth before the deductible without costing members their HSA eligibility. OBBB §71306 made that safe harbor permanent. Teladoc-style visits, virtual mental health, and telemedicine prescriptions can be covered first-dollar.",
        ],
      },
      {
        heading: "What did NOT change: the gym provision",
        paragraphs: [
          "Early drafts included fitness expenses; the final law stripped them. Gym memberships, fitness classes, and exercise equipment remain NOT broadly HSA-eligible in 2026. The only path remains a Letter of Medical Necessity prescribing exercise for a specific diagnosed condition. Any vendor implying blanket gym eligibility is selling risk.",
        ],
      },
      {
        heading: "What this means practically",
        paragraphs: [
          "If you use a DPC practice: confirm your fee is under the cap, confirm you (not your employer) pay it, and track it monthly — Candor's DPC tracker warns you before the cliff. If you're choosing an HDHP: telehealth coverage no longer carries HSA risk. If you're hoping to HSA-fund your gym: the LMN path or nothing.",
        ],
      },
    ],
  },
  {
    slug: "hsa-letter-of-medical-necessity",
    title: "Letters of Medical Necessity (LMN): When You Need One and How They Work",
    description:
      "Dual-use products — wearables, supplements, gym memberships — can become HSA-eligible with a Letter of Medical Necessity. What an LMN is, what it must say, and how to keep it audit-proof.",
    sections: [
      {
        heading: "What an LMN is",
        paragraphs: [
          "A Letter of Medical Necessity is a licensed provider's written statement that a product or service treats or mitigates a SPECIFIC diagnosed medical condition — converting a dual-use expense (IRS Pub. 502's general-health exclusion) into qualified medical care for you specifically.",
        ],
      },
      {
        heading: "When you need one",
        paragraphs: [
          "Anything 'Bucket B' in Candor's eligibility database: fitness trackers and smart rings, supplements beyond prenatal vitamins, gym memberships and exercise equipment, massage therapy, weighted blankets, air purifiers, weight-loss programs. The pattern: products healthy people also buy. Directly eligible items (Bucket A) never need one; cosmetic items (Bucket C) can't be rescued by one.",
        ],
      },
      {
        heading: "What a defensible LMN contains",
        paragraphs: [
          "The diagnosis or condition being treated; the specific product or service recommended; how it treats or mitigates that condition; duration of the recommendation; and the provider's license information and signature. Vague 'wellness' letters that don't name a condition are weak audit defense.",
        ],
      },
      {
        heading: "Timing and renewal",
        paragraphs: [
          "Get the LMN BEFORE the purchase — a letter dated after the expense invites the argument that the purchase wasn't medically motivated. LMNs should be renewed (annually is the norm) for ongoing expenses like memberships or subscriptions.",
        ],
      },
      {
        heading: "Store it with the receipt",
        paragraphs: [
          "An LMN is audit-defense paperwork: it only works if you can produce it alongside the receipt, possibly decades later under the shoebox strategy. Candor stores both together against the expense.",
        ],
      },
    ],
  },
  {
    slug: "hsa-mistakes",
    title: "7 HSA Mistakes That Cost Real Money",
    description:
      "The 20% penalty, the 6% excise trap, the Medicare surprise, and the receipts people lose — the most expensive HSA mistakes and how to avoid each one.",
    sections: [
      {
        heading: "1. Paying for non-qualified expenses",
        paragraphs: [
          "Before age 65, a non-qualified HSA withdrawal is taxed as income PLUS a 20% penalty. Buying general-wellness products on an assumption of eligibility is the common version — check the item against a cited eligibility database first.",
        ],
      },
      {
        heading: "2. Paying insurance premiums from the HSA",
        paragraphs: [
          "Regular health insurance premiums are NOT qualified expenses. The exceptions: COBRA, premiums while on unemployment, qualified long-term-care insurance (within age-based limits), and Medicare premiums once you're 65+ (but never Medigap).",
        ],
      },
      {
        heading: "3. Over-contributing",
        paragraphs: [
          "Excess contributions carry a 6% excise tax EVERY YEAR until removed. It happens most often with job changes (two employers contributing) or family/self coverage switches mid-year. Withdraw the excess plus earnings before the tax deadline to cure it.",
        ],
      },
      {
        heading: "4. Losing receipts",
        paragraphs: [
          "Tax-free reimbursement lives or dies on substantiation. No receipt, no defense — and the expense effectively becomes non-qualified if challenged. Capture receipts at purchase time, not at tax time.",
        ],
      },
      {
        heading: "5. Contributing after Medicare enrollment",
        paragraphs: [
          "Medicare enrollment ends HSA contribution eligibility — and Part A coverage is retroactive up to 6 months when you enroll after 65. Stop contributing 6 months before enrolling to avoid backdated excess contributions.",
        ],
      },
      {
        heading: "6. Reimbursing pre-establishment expenses",
        paragraphs: [
          "Expenses from before your HSA existed are never reimbursable. Know your establishment date; don't backfill past it.",
        ],
      },
      {
        heading: "7. Leaving the HSA in cash forever",
        paragraphs: [
          "The triple tax advantage compounds only if the money grows. Most custodians let you invest above a small cash threshold — an HSA left 100% in cash for decades forfeits most of its value as a retirement vehicle. (Not investment advice; your allocation is your call.)",
        ],
      },
    ],
  },
];
