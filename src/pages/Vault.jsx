import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReceiptVault from "../components/ReceiptVault.jsx";
import supabaseAdapter from "../lib/supabaseAdapter.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { loadProfile, saveHsaDate } from "../lib/profile.js";

// Route is wrapped in <RequireAuth> (App.jsx), so `user` is always present here.
export default function Vault() {
  const { user } = useAuth();
  // undefined = loading, null = no profile row yet, object = loaded
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    let alive = true;
    loadProfile().then((p) => {
      if (alive) setProfile(p);
    });
    return () => {
      alive = false;
    };
  }, [user.id]);

  const hsaDate = profile?.hsa_established_date ?? null;
  const needsDate = profile !== undefined && !hsaDate;

  return (
    <div>
      <header className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <h1 className="font-display text-2xl font-700 tracking-tight text-stone-950">
          Receipt vault
        </h1>
        <p className="mt-1 text-stone-500">
          Every eligible expense, in one place — with the shoebox balance you can
          reimburse on your own timeline. Synced to your account, private to you.
        </p>
        <p className="mt-2 text-sm">
          <Link to="/finder" className="font-medium text-candor-red hover:underline">
            Have old statements? Scan them for reimbursable expenses →
          </Link>
        </p>
      </header>

      {needsDate && (
        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
          <HsaDatePrompt
            userId={user.id}
            onSaved={(p) => setProfile(p)}
          />
        </div>
      )}

      <ReceiptVault
        storageAdapter={supabaseAdapter}
        userId={user.id}
        hsaEstablishedDate={hsaDate}
      />
    </div>
  );
}

/**
 * One-time onboarding prompt: capture the HSA establishment date so the app
 * can set the per-receipt "HSA was open" flag automatically (IRS rule: only
 * expenses incurred after establishment are reimbursable).
 */
function HsaDatePrompt({ userId, onSaved }) {
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const p = await saveHsaDate(userId, date);
      onSaved(p);
    } catch {
      setError("Couldn't save just now — try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5"
    >
      <p className="font-display font-600 text-stone-950">
        When did you open your HSA?
      </p>
      <p className="mt-1 max-w-prose text-sm text-stone-500">
        The IRS only lets you reimburse expenses paid <em>after</em> your HSA was
        established. Tell us the date once and we'll flag each receipt for you
        automatically. It's on your HSA provider's site under account details —
        an approximate month is fine, you can change it anytime.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="date"
          required
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-950 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
        <button
          type="submit"
          disabled={busy}
          className="candor-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save date"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
