// Candor eligibility rules engine — VERSIONED DATA, single source of truth.
//
// Consumed by: static SEO page generator (scripts/generate-eligibility-pages),
// the AI eligibility advisor (rules-first lookup), the DPC cap tracker, and —
// eventually — a licensable API.
//
// Buckets:
//   A = directly HSA-eligible (green)
//   B = dual-use — requires a Letter of Medical Necessity (amber)
//   C = NOT eligible (never listed in the storefront; shown honestly here)
//
// HARD RULES baked into this data (do not break when editing):
//   - Gym/fitness/wellness is NEVER bucket A. The OBBB fitness provision was
//     stripped from the final law; fitness-adjacent items are B (LMN) or C.
//   - DPC is A but CAPPED: the cap is a CLIFF — exceeding it disqualifies the
//     entire arrangement for that month. Employer-paid DPC never qualifies.
//   - Telehealth pre-deductible coverage is PERMANENT (OBBB §71306).
//   - All copy is informational, not tax advice; counsel review required
//     before public launch. Every item carries a citation.
//
// TECH DEBT (deliberate): PRD wants these as DB rows so updates skip deploys.
// For MVP, git IS the version history and deploys regenerate the static
// pages anyway. Migrate to DB when the API productizes.

export const RULES_VERSION = "2026-07-16";
export const RULES_LAST_VERIFIED = "July 2026";

// DPC caps (OBBB 2026; IRS Notice 2026-05). Inflation-adjusted annually.
export const DPC_CAPS = {
  year: 2026,
  selfMonthly: 150,
  familyMonthly: 300,
  source: "OBBB 2026; IRS Notice 2026-05",
  cliff: true, // exceeding the cap disqualifies the ENTIRE arrangement that month
  employerPaidQualifies: false,
};

export const BUCKET_META = {
  A: { label: "HSA-eligible", color: "green" },
  B: { label: "Eligible with a Letter of Medical Necessity", color: "amber" },
  C: { label: "Not HSA-eligible", color: "red" },
};

// ---------------------------------------------------------------------------
// Items. Keep summaries short, citations honest, caveats load-bearing.
// ---------------------------------------------------------------------------
export const RULES = [
  // ===================== OTC medicines (CARES Act 2020) =====================
  { slug: "ibuprofen", name: "Ibuprofen (Advil, Motrin)", aliases: ["advil", "motrin", "pain reliever", "nsaid"], category: "OTC", bucket: "A", citation: "IRS Pub. 502; CARES Act §3702 (2020)", effectiveFrom: "2020-01-01", summary: "OTC pain relievers are directly HSA-eligible — no prescription needed since the CARES Act (2020).", caveats: null },
  { slug: "acetaminophen", name: "Acetaminophen (Tylenol)", aliases: ["tylenol", "paracetamol"], category: "OTC", bucket: "A", citation: "IRS Pub. 502; CARES Act §3702 (2020)", effectiveFrom: "2020-01-01", summary: "OTC pain and fever medicine — directly eligible, no prescription required.", caveats: null },
  { slug: "allergy-medicine", name: "Allergy medicine (Zyrtec, Claritin, Allegra)", aliases: ["zyrtec", "claritin", "allegra", "antihistamine", "cetirizine", "loratadine"], category: "OTC", bucket: "A", citation: "IRS Pub. 502; CARES Act §3702 (2020)", effectiveFrom: "2020-01-01", summary: "OTC antihistamines and allergy medicines are directly eligible.", caveats: null },
  { slug: "cold-and-flu-medicine", name: "Cold & flu medicine (DayQuil, Mucinex)", aliases: ["dayquil", "nyquil", "mucinex", "cough syrup", "decongestant"], category: "OTC", bucket: "A", citation: "IRS Pub. 502; CARES Act §3702 (2020)", effectiveFrom: "2020-01-01", summary: "OTC cough, cold, and flu remedies are directly eligible.", caveats: null },
  { slug: "antacids", name: "Antacids & heartburn medicine (Tums, Pepcid)", aliases: ["tums", "pepcid", "omeprazole", "prilosec", "heartburn"], category: "OTC", bucket: "A", citation: "IRS Pub. 502; CARES Act §3702 (2020)", effectiveFrom: "2020-01-01", summary: "OTC digestive and heartburn medicines are directly eligible.", caveats: null },
  { slug: "nicotine-replacement", name: "Nicotine gum, patches & lozenges", aliases: ["nicorette", "nicoderm", "quit smoking", "smoking cessation"], category: "OTC", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Smoking-cessation products are qualified medical expenses.", caveats: null },
  { slug: "menstrual-products", name: "Menstrual products (tampons, pads, cups)", aliases: ["tampons", "pads", "menstrual cup", "period products"], category: "Family", bucket: "A", citation: "CARES Act §3702 (2020); IRC §223(d)(2)(D)", effectiveFrom: "2020-01-01", summary: "Menstrual care products became qualified medical expenses under the CARES Act.", caveats: null },
  { slug: "sunscreen", name: "Sunscreen (broad-spectrum)", aliases: ["spf", "sunblock"], category: "OTC", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Broad-spectrum sunscreen is directly eligible.", caveats: "Cosmetic products with incidental SPF (like makeup) generally don't qualify." },
  { slug: "band-aids", name: "Bandages & first-aid supplies", aliases: ["band-aid", "gauze", "first aid kit", "antiseptic", "neosporin"], category: "First Aid", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Bandages, first-aid kits, and wound-care supplies are directly eligible.", caveats: null },
  { slug: "condoms", name: "Condoms & contraceptives", aliases: ["birth control", "contraception", "plan b"], category: "Family", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Condoms, OTC contraceptives, and emergency contraception are eligible.", caveats: null },
  { slug: "pregnancy-tests", name: "Pregnancy & fertility tests", aliases: ["ovulation test", "fertility monitor"], category: "Family", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Pregnancy tests, ovulation kits, and fertility monitors are directly eligible.", caveats: null },
  { slug: "prenatal-vitamins", name: "Prenatal vitamins", aliases: ["folic acid"], category: "Family", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Prenatal vitamins are eligible because they address a specific medical condition — unlike general multivitamins.", caveats: "General-purpose multivitamins are NOT eligible without an LMN." },
  { slug: "breast-pump", name: "Breast pumps & lactation supplies", aliases: ["lactation", "nursing supplies"], category: "Family", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Breast pumps and supplies that assist lactation are directly eligible.", caveats: null },
  { slug: "reading-glasses", name: "Reading glasses (OTC)", aliases: ["readers"], category: "Vision", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Over-the-counter reading glasses are directly eligible.", caveats: null },
  { slug: "covid-tests", name: "At-home COVID-19 tests", aliases: ["covid test", "rapid test", "antigen test"], category: "Diagnostics", bucket: "A", citation: "IRS Announcement 2021-7", effectiveFrom: "2020-01-01", summary: "At-home COVID-19 diagnostic tests are qualified medical expenses.", caveats: null },

  // ===================== Vision =====================
  { slug: "prescription-glasses", name: "Prescription eyeglasses", aliases: ["glasses", "eyeglasses", "frames", "lenses"], category: "Vision", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Prescription eyeglasses, frames, and lenses are directly eligible.", caveats: null },
  { slug: "contact-lenses", name: "Contact lenses & solution", aliases: ["contacts", "contact solution"], category: "Vision", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Prescription contact lenses and the solutions to clean them are eligible.", caveats: "Colored contacts without a prescription (cosmetic) are not eligible." },
  { slug: "eye-exam", name: "Eye exams", aliases: ["optometrist", "vision exam"], category: "Vision", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Routine and diagnostic eye exams are directly eligible.", caveats: null },
  { slug: "lasik", name: "LASIK & corrective eye surgery", aliases: ["prk", "laser eye surgery"], category: "Vision", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Vision-correction surgery like LASIK is directly eligible.", caveats: null },
  { slug: "blue-light-glasses", name: "Blue-light glasses (non-prescription)", aliases: ["computer glasses"], category: "Vision", bucket: "C", citation: "IRS Pub. 502 (general-health exclusion)", effectiveFrom: null, summary: "Non-prescription blue-light glasses are general-wellness products, not qualified medical care.", caveats: "Prescription lenses with a blue-light coating ARE eligible as prescription eyewear." },

  // ===================== Dental =====================
  { slug: "dental-cleaning", name: "Dental cleanings & exams", aliases: ["dentist visit", "dental checkup"], category: "Dental", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Preventive and diagnostic dental care is directly eligible.", caveats: null },
  { slug: "fillings-crowns", name: "Fillings, crowns & root canals", aliases: ["cavity", "root canal", "crown"], category: "Dental", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Restorative dental treatment is directly eligible.", caveats: null },
  { slug: "braces", name: "Braces & orthodontics", aliases: ["invisalign", "orthodontist", "aligners"], category: "Dental", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Orthodontic treatment — including clear aligners — is eligible when it treats a dental condition.", caveats: "Purely cosmetic alignment with no dental-health purpose may not qualify." },
  { slug: "dentures", name: "Dentures & dental implants", aliases: ["implants", "bridge"], category: "Dental", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Dentures, bridges, and implants that replace teeth are eligible.", caveats: null },
  { slug: "teeth-whitening", name: "Teeth whitening", aliases: ["whitening strips", "bleaching"], category: "Dental", bucket: "C", citation: "IRS Pub. 502 (cosmetic exclusion)", effectiveFrom: null, summary: "Teeth whitening is cosmetic and is NOT HSA-eligible.", caveats: null },
  { slug: "electric-toothbrush", name: "Electric toothbrushes", aliases: ["sonicare", "oral-b"], category: "Dental", bucket: "C", citation: "IRS Pub. 502 (general-health exclusion)", effectiveFrom: null, summary: "General oral hygiene products are not qualified medical expenses, even when a dentist recommends them.", caveats: "A dentist-prescribed device for a specific diagnosed condition may qualify with an LMN — rare." },

  // ===================== Diagnostics & devices =====================
  { slug: "blood-pressure-monitor", name: "Blood pressure monitors", aliases: ["bp monitor", "omron"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Home blood-pressure monitors are directly eligible diagnostic devices.", caveats: null },
  { slug: "thermometer", name: "Thermometers", aliases: ["digital thermometer"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Medical thermometers are directly eligible.", caveats: null },
  { slug: "glucose-monitor", name: "Blood glucose monitors & test strips", aliases: ["glucometer", "cgm", "dexcom", "libre"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Glucose meters, CGMs, and test strips are directly eligible.", caveats: null },
  { slug: "pulse-oximeter", name: "Pulse oximeters", aliases: ["spo2 monitor"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Pulse oximeters are eligible diagnostic devices.", caveats: null },
  { slug: "at-home-lab-tests", name: "At-home lab tests (cholesterol, A1c, STI)", aliases: ["lab test kit", "everlywell", "letsgetchecked"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "At-home diagnostic test kits for specific conditions are eligible.", caveats: "General 'wellness panels' marketed for optimization rather than diagnosis can be challenged — keep documentation." },
  { slug: "fitness-tracker", name: "Fitness trackers & smart rings (Oura, Whoop, Fitbit)", aliases: ["oura", "whoop", "fitbit", "apple watch", "wearable"], category: "Recovery", bucket: "B", citation: "IRS Pub. 502 (general-health exclusion); LMN pathway", effectiveFrom: null, summary: "General-wellness wearables are NOT directly eligible. With a Letter of Medical Necessity tying the device to treatment of a diagnosed condition, they can qualify.", caveats: "The LMN must precede the purchase and be renewed; keep it with the receipt." },
  { slug: "hearing-aids", name: "Hearing aids & batteries", aliases: ["hearing amplifier"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Hearing aids (including OTC hearing aids) and their batteries are directly eligible.", caveats: null },

  // ===================== Care & services =====================
  { slug: "doctor-visits", name: "Doctor visits & copays", aliases: ["copay", "office visit", "primary care", "specialist"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Physician care — visits, copays, coinsurance — is directly eligible.", caveats: null },
  { slug: "therapy", name: "Therapy & mental health counseling", aliases: ["psychologist", "psychiatrist", "counseling", "betterhelp", "talkspace"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Mental health treatment — therapy, psychiatry, counseling for a medical condition — is directly eligible.", caveats: "Marriage or career coaching without a medical diagnosis is not eligible." },
  { slug: "telehealth", name: "Telehealth visits (Teladoc, MDLIVE, etc.)", aliases: ["teladoc", "mdlive", "virtual visit", "online doctor"], category: "Telehealth", bucket: "A", citation: "IRS Pub. 502; OBBB §71306 (permanent pre-deductible safe harbor)", effectiveFrom: null, summary: "Telehealth medical care is directly eligible — and HDHPs may now cover it pre-deductible permanently without threatening HSA eligibility.", caveats: null },
  { slug: "physical-therapy", name: "Physical therapy", aliases: ["pt", "rehab"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Physical therapy prescribed for treatment or rehabilitation is directly eligible.", caveats: null },
  { slug: "chiropractic", name: "Chiropractic care", aliases: ["chiropractor"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Chiropractic treatment is a qualified medical expense.", caveats: null },
  { slug: "acupuncture", name: "Acupuncture", aliases: [], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Acupuncture is explicitly listed as a qualified medical expense.", caveats: null },
  { slug: "dpc-membership", name: "Direct Primary Care (DPC) memberships", aliases: ["direct primary care", "concierge medicine", "one medical"], category: "DPC", bucket: "A", citation: "OBBB 2026; IRS Notice 2026-05", effectiveFrom: "2026-01-01", summary: "Individually-paid DPC membership fees are HSA-qualified up to $150/mo (self) or $300/mo (family) in 2026.", caveats: "THE CAP IS A CLIFF: exceed it in a month and the entire arrangement is disqualifying for that month. Employer-paid DPC never qualifies. Caps are inflation-adjusted." },
  { slug: "urgent-care", name: "Urgent care & ER visits", aliases: ["emergency room"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Urgent and emergency medical care is directly eligible.", caveats: null },
  { slug: "lab-work", name: "Lab work (Quest, Labcorp)", aliases: ["quest", "labcorp", "blood work"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Diagnostic laboratory tests ordered for medical care are directly eligible.", caveats: null },
  { slug: "prescription-drugs", name: "Prescription medications", aliases: ["rx", "pharmacy prescription"], category: "OTC", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Prescribed medications are directly eligible.", caveats: "Drugs imported from other countries generally are not." },
  { slug: "vaccines", name: "Vaccines & immunizations", aliases: ["flu shot", "immunization"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Vaccinations are qualified preventive care.", caveats: null },
  { slug: "smoking-cessation-program", name: "Smoking-cessation programs", aliases: ["quit smoking program"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Programs to stop smoking are directly eligible.", caveats: null },
  { slug: "weight-loss-program", name: "Weight-loss programs", aliases: ["ww", "noom", "weight watchers"], category: "Other", bucket: "B", citation: "IRS Pub. 502 (disease-specific rule)", effectiveFrom: null, summary: "Weight-loss programs qualify ONLY when treating a diagnosed disease (obesity, hypertension, heart disease) — that's an LMN situation.", caveats: "Food, meal replacements, and general dieting costs generally remain ineligible even with a diagnosis." },
  { slug: "glp1-medications", name: "GLP-1 medications (Ozempic, Wegovy, Zepbound)", aliases: ["ozempic", "wegovy", "zepbound", "semaglutide", "tirzepatide"], category: "OTC", bucket: "A", citation: "IRS Pub. 502 (prescription drugs)", effectiveFrom: null, summary: "Prescribed GLP-1 medications are eligible as prescription drugs.", caveats: "Compounded or gray-market versions without a valid prescription are not." },

  // ===================== Fitness & wellness (the honest section) =====================
  { slug: "gym-membership", name: "Gym memberships", aliases: ["planet fitness", "equinox", "health club", "fitness membership"], category: "Recovery", bucket: "B", citation: "IRS Pub. 502 (general-health exclusion); LMN pathway", effectiveFrom: null, summary: "Gym memberships are NOT broadly HSA-eligible — the OBBB fitness provision did not become law. Only with a Letter of Medical Necessity prescribing exercise for a specific diagnosed condition can membership fees qualify.", caveats: "Beware of vendors implying blanket eligibility. The LMN must be specific, current, and precede the expense." },
  { slug: "peloton", name: "Peloton & home exercise equipment", aliases: ["treadmill", "exercise bike", "home gym"], category: "Recovery", bucket: "B", citation: "IRS Pub. 502 (general-health exclusion); LMN pathway", effectiveFrom: null, summary: "Exercise equipment is general-wellness spending unless an LMN ties it to treating a diagnosed condition.", caveats: null },
  { slug: "massage-gun", name: "Massage guns (Theragun, etc.)", aliases: ["theragun", "percussion massager"], category: "Recovery", bucket: "B", citation: "IRS Pub. 502; LMN pathway", effectiveFrom: null, summary: "Percussion massagers can qualify with an LMN for a specific musculoskeletal condition.", caveats: null },
  { slug: "massage-therapy", name: "Massage therapy", aliases: ["massage envy"], category: "Recovery", bucket: "B", citation: "IRS Pub. 502; LMN pathway", effectiveFrom: null, summary: "Massage qualifies only when prescribed to treat a specific medical condition (LMN) — relaxation massage is not eligible.", caveats: null },
  { slug: "supplements", name: "Vitamins & supplements (general)", aliases: ["multivitamin", "vitamin d", "fish oil", "creatine", "protein powder"], category: "Recovery", bucket: "B", citation: "IRS Pub. 502 (general-health exclusion); LMN pathway", effectiveFrom: null, summary: "General-health supplements are NOT eligible. A supplement recommended by a provider to treat a specific diagnosed condition (e.g., iron for anemia) can qualify with an LMN.", caveats: "Prenatal vitamins are the exception — directly eligible." },
  { slug: "cold-plunge", name: "Cold plunges & saunas", aliases: ["ice bath", "sauna", "recovery"], category: "Recovery", bucket: "B", citation: "IRS Pub. 502 (general-health exclusion); LMN pathway", effectiveFrom: null, summary: "Recovery equipment is general wellness unless an LMN ties it to treatment of a diagnosed condition — and even then, expect scrutiny.", caveats: null },

  // ===================== Clearly not eligible (C) =====================
  { slug: "cosmetic-surgery", name: "Cosmetic surgery", aliases: ["plastic surgery", "botox cosmetic"], category: "Other", bucket: "C", citation: "IRC §213(d)(9); IRS Pub. 502", effectiveFrom: null, summary: "Procedures to improve appearance without treating disease or deformity are NOT eligible.", caveats: "Reconstructive surgery after an accident, disease, or congenital condition IS eligible." },
  { slug: "toiletries", name: "Toiletries & cosmetics", aliases: ["shampoo", "makeup", "deodorant", "skincare"], category: "Other", bucket: "C", citation: "IRS Pub. 502 (general-health exclusion)", effectiveFrom: null, summary: "Everyday personal-care products are not qualified medical expenses.", caveats: "Medicated products treating a specific condition (e.g., dandruff shampoo with an LMN) can be different — rare." },
  { slug: "diapers", name: "Baby diapers", aliases: ["diapers", "pull-ups"], category: "Family", bucket: "C", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Ordinary infant diapers are not eligible.", caveats: "Diapers/incontinence products required due to a diagnosed medical condition ARE eligible." },
  { slug: "baby-formula", name: "Baby formula", aliases: ["infant formula"], category: "Family", bucket: "C", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Regular infant formula is a food cost, not a medical expense.", caveats: "The excess cost of special formula prescribed for a diagnosed condition can qualify." },
  { slug: "health-insurance-premiums", name: "Health insurance premiums", aliases: ["premiums"], category: "Other", bucket: "C", citation: "IRS Pub. 969", effectiveFrom: null, summary: "You generally CANNOT pay health insurance premiums from an HSA.", caveats: "Exceptions: COBRA, premiums while receiving unemployment, qualified LTC insurance (limits), and Medicare (not Medigap) after 65." },
  { slug: "life-insurance", name: "Life insurance premiums", aliases: [], category: "Other", bucket: "C", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Life insurance is never a qualified medical expense.", caveats: null },
  { slug: "pet-care", name: "Veterinary & pet care", aliases: ["vet", "pet meds"], category: "Other", bucket: "C", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Pet healthcare is not eligible — HSAs cover human medical care only.", caveats: "A trained service animal for a person with a disability IS eligible (purchase, training, upkeep)." },
  { slug: "cbd", name: "CBD & cannabis products", aliases: ["thc", "marijuana", "cannabis"], category: "Other", bucket: "C", citation: "IRC §213(d); federal controlled-substance rule", effectiveFrom: null, summary: "Cannabis and most CBD products are not qualified medical expenses under federal law, regardless of state legality.", caveats: null },

  // ===================== More A items to round out coverage =====================
  { slug: "crutches-wheelchairs", name: "Crutches, wheelchairs & mobility aids", aliases: ["walker", "cane", "mobility scooter"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Mobility equipment for a medical condition is directly eligible.", caveats: null },
  { slug: "cpap", name: "CPAP machines & supplies", aliases: ["sleep apnea", "cpap mask"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "CPAP equipment prescribed for sleep apnea is directly eligible.", caveats: null },
  { slug: "orthotics", name: "Orthotics & insoles", aliases: ["arch supports", "shoe inserts"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Orthopedic shoe inserts and braces are eligible.", caveats: "The extra cost of orthopedic shoes over normal shoes is the eligible portion." },
  { slug: "compression-socks", name: "Compression socks (medical-grade)", aliases: ["compression stockings"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Medical-grade compression wear (typically 20-30 mmHg+) for a medical condition is eligible.", caveats: "Light 'energy' compression marketed for comfort or athletics is general wellness (not eligible)." },
  { slug: "psychiatric-care", name: "Psychiatric care & medication management", aliases: ["psych meds"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Psychiatric treatment, including medication management, is directly eligible.", caveats: null },
  { slug: "fertility-treatment", name: "Fertility treatment (IVF, IUI)", aliases: ["ivf", "iui", "egg freezing"], category: "Family", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Fertility treatments to overcome an inability to have children are eligible.", caveats: "Egg/sperm freezing for non-medical (elective timing) reasons is a gray area — documentation matters." },
  { slug: "lactation-consultant", name: "Lactation consultants", aliases: [], category: "Family", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Lactation consulting for medical breastfeeding support is eligible.", caveats: null },
  { slug: "hearing-exam", name: "Hearing exams", aliases: ["audiologist"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Audiology exams are directly eligible.", caveats: null },
  { slug: "dermatology", name: "Dermatology visits", aliases: ["dermatologist", "skin check"], category: "Other", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Medical dermatology — skin checks, acne treatment, biopsies — is eligible.", caveats: "Cosmetic dermatology (Botox for wrinkles, laser for appearance) is not." },
  { slug: "allergy-testing", name: "Allergy testing & shots", aliases: ["immunotherapy"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Allergy testing and immunotherapy are directly eligible.", caveats: null },
  { slug: "sleep-study", name: "Sleep studies", aliases: ["polysomnography"], category: "Diagnostics", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Diagnostic sleep studies are directly eligible.", caveats: null },
  { slug: "first-aid-kit", name: "First-aid kits", aliases: [], category: "First Aid", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Stocked first-aid kits are directly eligible.", caveats: null },
  { slug: "heating-pad", name: "Heating pads & ice packs", aliases: ["hot cold therapy"], category: "First Aid", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Hot/cold therapy products for treating injuries are eligible.", caveats: null },
  { slug: "prescription-sunglasses", name: "Prescription sunglasses", aliases: [], category: "Vision", bucket: "A", citation: "IRS Pub. 502", effectiveFrom: null, summary: "Prescription sunglasses are eligible as prescription eyewear.", caveats: "Non-prescription sunglasses are not." },
  { slug: "mileage-medical", name: "Mileage & travel for medical care", aliases: ["medical travel", "medical mileage"], category: "Other", bucket: "A", citation: "IRS Pub. 502 (transportation rules)", effectiveFrom: null, summary: "Transportation primarily for and essential to medical care is eligible — at the IRS medical mileage rate, plus parking and tolls.", caveats: "Keep a log: date, destination, purpose, miles. Lodging is capped ($50/night per person) and meals generally aren't eligible." },
];

// ---------------------------------------------------------------------------
// Lookup helpers (used by the advisor and the finder).
// ---------------------------------------------------------------------------
export function findRule(query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return null;
  return (
    RULES.find((r) => r.slug === q) ||
    RULES.find((r) => r.name.toLowerCase() === q) ||
    RULES.find((r) => r.aliases.some((a) => a.toLowerCase() === q)) ||
    RULES.find(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))
    ) ||
    null
  );
}

export function searchRules(query, limit = 8) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return [];
  const scored = RULES.map((r) => {
    let score = 0;
    if (r.name.toLowerCase().includes(q)) score += 3;
    if (r.slug.includes(q)) score += 2;
    if (r.aliases.some((a) => a.toLowerCase().includes(q))) score += 2;
    for (const word of q.split(/\s+/)) {
      if (word.length > 2 && (r.name.toLowerCase().includes(word) || r.aliases.some((a) => a.toLowerCase().includes(word)))) score += 1;
    }
    return { rule: r, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.rule);
}
