// LMN provider adapter (PRD Feature 9) — multi-homed on purpose.
//
// STRATEGIC CONTEXT: Truemed is a potential competitor within ~18 months.
// No Candor feature may hard-depend on a single provider's API or URL. This
// module is the ONLY place providers are referenced; swapping or reordering
// providers is a config change here, never a rewrite.
//
// MVP scope: link-out only (no API embed). A future deep integration
// implements the same resolve() contract.

export const LMN_PROVIDERS = {
  truemed: {
    id: "truemed",
    name: "Truemed",
    url: "https://www.truemed.com/",
    blurb: "Qualification survey reviewed by a licensed provider.",
  },
  flex: {
    id: "flex",
    name: "Flex",
    url: "https://www.withflex.com/",
    blurb: "HSA/FSA payment + LMN issuance for qualified products.",
  },
  sika: {
    id: "sika",
    name: "Sika Health",
    url: "https://www.sikahealth.com/",
    blurb: "HSA/FSA eligibility + LMN workflows.",
  },
};

// Preference order — first available provider wins. Per-category overrides
// let us route around a provider that cuts access or reprices for a segment.
// To drop a provider entirely, remove it from these lists. Config, not code.
export const LMN_CONFIG = {
  default: ["truemed", "flex", "sika"],
  byCategory: {
    // e.g. Recovery: ["flex", "sika", "truemed"],
  },
  disabled: [], // provider ids to skip everywhere (kill switch)
};

/**
 * Resolve the LMN provider for an item/category.
 * @returns {{ provider, fallbacks }} provider = first enabled choice;
 *          fallbacks = remaining enabled providers in order.
 */
export function resolveLmnProvider(category) {
  const order = (LMN_CONFIG.byCategory[category] ?? LMN_CONFIG.default).filter(
    (id) => !LMN_CONFIG.disabled.includes(id) && LMN_PROVIDERS[id]
  );
  const [first, ...rest] = order;
  return {
    provider: first ? LMN_PROVIDERS[first] : null,
    fallbacks: rest.map((id) => LMN_PROVIDERS[id]),
  };
}
