// localStorage persistence adapter for <ReceiptVault />.
//
// This implements the storageAdapter contract the vault expects:
//   load(userId)         -> Promise<Receipt[]>   (newest-first is fine; vault sorts)
//   save(userId, list)   -> Promise<void>
//
// In Week 2 this is replaced by a Supabase adapter implementing the SAME two methods,
// backed by a `receipts` table with row-level security. The vault component does not
// change — only the adapter passed to it does.
//
// NOTE: localStorage works on a real deployed site (this is NOT the Claude sandbox
// window.storage API, which does not exist on real sites). It does not work for
// server-side rendering and is per-browser, which is exactly right for a demo MVP.

const KEY_PREFIX = "candor:receipts:";

function keyFor(userId) {
  return KEY_PREFIX + (userId || "demo-user");
}

export const localStorageAdapter = {
  async load(userId) {
    try {
      const raw = localStorage.getItem(keyFor(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async save(userId, list) {
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(list ?? []));
    } catch {
      // Quota or privacy-mode failures are non-fatal for the demo.
    }
  },
};

export default localStorageAdapter;
