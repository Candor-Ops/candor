// Eligibility classification heuristics — VERSIONED DATA, not logic.
//
// Used by the Retroactive Expense Finder to flag *candidate* HSA-eligible
// transactions in imported bank/card statements. This is the demo-grade
// forerunner of the full eligibility rules engine (PRD Feature 4); when that
// engine lands, this file becomes seed data.
//
// HARD GUARDRAILS (per Candor compliance reference — do not break):
//   - Candidates are SUGGESTIONS. The user must confirm every one; we never
//     auto-assert eligibility. Confidence is shown, never hidden.
//   - Gym/fitness/wellness merchants are NOT flagged eligible (LMN-only,
//     Bucket B) — they are deliberately ABSENT from these patterns.
//   - Grocery/big-box stores sell mostly ineligible goods → excluded; a CVS
//     receipt is a candidate, a Costco receipt is not (too noisy).
//   - Informational, not tax advice.
//
// version: bump when rules change; shown in the review queue footer.

export const HEURISTICS_VERSION = "2026-07-16";

// Confidence levels: "high" = merchant is overwhelmingly medical (pharmacy,
// dental, vision, labs); "medium" = commonly-but-not-always medical.
export const MERCHANT_PATTERNS = [
  // ---------- Pharmacies (high) ----------
  { pattern: /\b(cvs|walgreens|rite\s*aid|duane\s*reade)\b/i, category: "OTC", confidence: "high", reason: "Pharmacy chain" },
  { pattern: /\bpharmacy\b/i, category: "OTC", confidence: "high", reason: "Pharmacy" },

  // ---------- Medical providers & facilities (high) ----------
  { pattern: /\b(urgent\s*care|medical\s*(center|group|clinic)|health\s*clinic|family\s*medicine|pediatric|dermatolog|cardiolog|orthopedic|physical\s*therapy)\b/i, category: "Other", confidence: "high", reason: "Medical provider" },
  { pattern: /\b(hospital|emergency\s*room|\bER\b)\b/, category: "Other", confidence: "high", reason: "Hospital / ER" },
  { pattern: /\b(labcorp|quest\s*diagnostics|lab(oratory)?\s*(corp|services))\b/i, category: "Diagnostics", confidence: "high", reason: "Diagnostic lab" },
  { pattern: /\b(radiology|imaging|mri|x-?ray)\b/i, category: "Diagnostics", confidence: "high", reason: "Imaging / radiology" },

  // ---------- Dental (high) ----------
  { pattern: /\b(dental|dentist|orthodont|endodont|periodont|oral\s*surg)\b/i, category: "Dental", confidence: "high", reason: "Dental care" },

  // ---------- Vision (high) ----------
  { pattern: /\b(optometr|ophthalmolog|vision\s*(center|care)|eye\s*(care|center|doctor)|lenscrafters|pearle\s*vision|warby\s*parker|america'?s\s*best\s*contacts|1-?800\s*contacts|contacts?\s*direct)\b/i, category: "Vision", confidence: "high", reason: "Vision care / eyewear" },

  // ---------- Telehealth (high — permanently pre-deductible per OBBB §71306) ----------
  { pattern: /\b(teladoc|mdlive|amwell|doctor\s*on\s*demand|plushcare|sesame\s*care|hims|hers|ro\.co|\broman\b|lemonaid)\b/i, category: "Telehealth", confidence: "high", reason: "Telehealth provider" },

  // ---------- DPC (medium — cap rules apply; tracker handles the cliff) ----------
  { pattern: /\b(direct\s*primary\s*care|\bDPC\b|one\s*medical|forward\s*health)\b/i, category: "DPC", confidence: "medium", reason: "Possible DPC membership — monthly cap rules apply" },

  // ---------- Mental health (high) ----------
  { pattern: /\b(therap(y|ist)|psycholog|psychiatr|counseling|betterhelp|talkspace)\b/i, category: "Other", confidence: "high", reason: "Mental health care" },

  // ---------- Chiropractic / acupuncture (high — Pub. 502 eligible) ----------
  { pattern: /\b(chiropract|acupunctur)\b/i, category: "Other", confidence: "high", reason: "Chiropractic / acupuncture (Pub. 502)" },

  // ---------- Medical goods & first aid (medium) ----------
  { pattern: /\b(medical\s*supply|first\s*aid|bandage|braces?\s*&?\s*supports?)\b/i, category: "First Aid", confidence: "medium", reason: "Medical supplies" },
  { pattern: /\b(omron|oura|withings|ihealth)\b/i, category: "Diagnostics", confidence: "medium", reason: "Health-monitoring device — eligibility can depend on use (some need an LMN)" },

  // ---------- Insurance-ish / billing intermediaries (medium) ----------
  { pattern: /\b(copay|co-pay|patient\s*(pay|billing)|mychart|athenahealth)\b/i, category: "Other", confidence: "medium", reason: "Medical billing / copay" },
];

// Lines matching these are never candidates — payments, transfers, obvious noise.
export const EXCLUDE_PATTERNS = [
  /\b(payment|autopay|thank\s*you)\b/i,
  /\b(transfer|zelle|venmo|paypal\s*transfer|wire)\b/i,
  /\b(deposit|payroll|direct\s*dep|refund|reversal|cash\s*back)\b/i,
  /\b(interest|fee|atm)\b/i,
  // Fitness/wellness: NOT broadly HSA-eligible (LMN-only). Excluded on purpose
  // so the finder never implies a gym membership is reimbursable.
  /\b(gym|fitness|planet\s*fit|equinox|crossfit|peloton|yoga|pilates|spa|massage\s*envy)\b/i,
];
