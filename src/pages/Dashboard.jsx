// Dashboard v1 (Week 3) — the Claimable Balance is the product.
// Hero number + shoebox stats + manual contribution tracking vs. IRS limits.
// (Plaid balances land here later; contribution entry is manual until then.)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { loadProfile, saveProfileFields } from "../lib/profile.js";
import supabaseAdapter from "../lib/supabaseAdapter.js";
import { limitsFor } from "../data/hsaLimits.js";
import { SearchIcon, ReceiptIcon } from "../components/icons.jsx";

const usd = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function Dashboard() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState(null); // null = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([supabaseAdapter.load(user.id), loadProfile()]).then(
      ([list, p]) => {
        if (!alive) return;
        setReceipts(list);
        setProfile(p);
      }
    );
    return () => {
      alive = false;
    };
  }, [user.id]);

  const stats = useMemo(() => {
    const list = receipts ?? [];
    const year = new Date().getFullYear();
    const claimable = list
      .filter(
        (r) =>
          r.paySource === "out-of-pocket" &&
          r.hsaOpenAtTime &&
          r.status !== "reimbursed"
      )
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    const reimbursed = list
      .filter((r) => r.status === "reimbursed")
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    const ytdSpend = list
      .filter((r) => String(r.date).startsWith(String(year)))
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    return { claimable, reimbursed, ytdSpend, count: list.length };
  }, [receipts]);

  const loading = receipts === null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-2xl font-700 tracking-tight text-stone-950">
          Dashboard
        </h1>
        <p className="mt-1 text-stone-500">
          Your HSA position at a glance — and the number that only goes up.
        </p>
      </header>

      {/* ---- Claimable Balance hero ---- */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="px-6 py-6">
          <p className="text-sm font-medium text-stone-500">Claimable Balance</p>
          <p className="candor-gradient-text font-display mt-1 text-5xl font-700 tracking-tight">
            {loading ? "—" : usd(stats.claimable)}
          </p>
          <p className="mt-2 max-w-prose text-sm text-stone-500">
            You can withdraw this from your HSA tax-free —{" "}
            <span className="font-medium text-stone-700">today or in 2045</span>.
            Every confirmed out-of-pocket expense adds to it, and there's no IRS
            deadline to claim it
            <span className="text-stone-400"> (Notice 2004-50, Q&A 39)</span>.
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-stone-100 border-t border-stone-100 text-center">
          <Stat label="Receipts vaulted" value={loading ? "—" : stats.count} />
          <Stat label="Reimbursed to date" value={loading ? "—" : usd(stats.reimbursed)} />
          <Stat
            label={`${new Date().getFullYear()} eligible spending`}
            value={loading ? "—" : usd(stats.ytdSpend)}
          />
        </div>
      </section>

      {/* ---- Finder CTA ---- */}
      <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50/60 p-5">
        <div className="min-w-0">
          <p className="font-display font-600 text-stone-950">
            <SearchIcon className="mr-1.5 inline h-4 w-4 text-candor-red" />
            Find money you've already spent
          </p>
          <p className="mt-1 max-w-prose text-sm text-stone-500">
            Upload a bank or card statement and we'll flag past medical expenses
            you can still reimburse — most people find hundreds.
          </p>
        </div>
        <Link
          to="/finder"
          className="candor-gradient shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          Scan a statement
        </Link>
      </section>

      {/* ---- Contributions vs. IRS limit ---- */}
      <ContributionTracker
        userId={user.id}
        profile={profile}
        onSaved={setProfile}
      />

      {/* ---- Empty-state nudge ---- */}
      {!loading && stats.count === 0 && (
        <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-10 text-center">
          <ReceiptIcon className="h-8 w-8 text-stone-300" />
          <p className="mt-3 max-w-sm text-sm text-stone-500">
            Your shoebox is empty. Scan a statement above, or{" "}
            <Link to="/vault" className="font-medium text-stone-700 underline">
              add a receipt manually
            </Link>{" "}
            to start building your Claimable Balance.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-4">
      <p className="font-display text-lg font-600 text-stone-950">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

/** Manual contribution tracking vs. the IRS annual limit (versioned data). */
function ContributionTracker({ userId, profile, onSaved }) {
  const year = new Date().getFullYear();
  const limits = limitsFor(year);
  const [coverage, setCoverage] = useState("self");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.coverage_type) setCoverage(profile.coverage_type);
    if (profile.ytd_contributions !== null && profile.ytd_contributions !== undefined) {
      setAmount(String(profile.ytd_contributions));
    }
  }, [profile]);

  const limit = coverage === "family" ? limits.family : limits.self;
  const contributed = Number(String(amount).replace(/[$,\s]/g, "")) || 0;
  const pct = Math.min(100, Math.round((contributed / limit) * 100));
  const remaining = Math.max(0, limit - contributed);
  const over = contributed > limit;

  async function onSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const p = await saveProfileFields(userId, {
        coverage_type: coverage,
        ytd_contributions: contributed,
      });
      onSaved(p);
      setSaved(true);
    } catch {
      setError("Couldn't save — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display font-600 text-stone-950">
          {year} contributions
        </p>
        <p className="text-xs text-stone-400">
          IRS limit: {usd(limit)} ({coverage === "family" ? "family" : "self-only"}) ·{" "}
          {limits.source} · +{usd(limits.catchUp55)} if 55+
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={coverage}
          onChange={(e) => {
            setCoverage(e.target.value);
            setSaved(false);
          }}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950"
        >
          <option value="self">Self-only coverage</option>
          <option value="family">Family coverage</option>
        </select>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setSaved(false);
          }}
          placeholder="Contributed so far"
          className="w-40 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 placeholder:text-stone-400"
        />
        <button
          onClick={onSave}
          disabled={busy}
          className="rounded-xl border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs text-emerald-700">Saved</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className={over ? "h-full rounded-full bg-red-500" : "candor-gradient h-full rounded-full"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {over ? (
          <span className="font-medium text-red-600">
            {usd(contributed - limit)} over the limit — excess contributions are
            taxed 6%/yr until withdrawn. Worth fixing before year-end.
          </span>
        ) : (
          <>
            {usd(contributed)} contributed · {usd(remaining)} of room left this
            year.
          </>
        )}
      </p>
    </section>
  );
}
