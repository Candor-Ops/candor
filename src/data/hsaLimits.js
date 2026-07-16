// HSA contribution limits — VERSIONED DATA (IRS adjusts annually).
// 2026 figures per Rev. Proc. 2025-19. Update here, not in components.

export const HSA_LIMITS = {
  2026: {
    self: 4400,
    family: 8750,
    catchUp55: 1000, // additional, age 55+
    source: "Rev. Proc. 2025-19",
  },
};

export function limitsFor(year = new Date().getFullYear()) {
  return HSA_LIMITS[year] ?? HSA_LIMITS[2026];
}
