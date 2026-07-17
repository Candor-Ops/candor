// Retroactive Expense Finder (Week 3) — CSV statement path.
//
// Upload a bank/card CSV → classify against versioned heuristics → review
// queue → confirmed candidates land in the shoebox as deferred expenses.
// GUARDRAIL: everything here is a SUGGESTION until the user confirms it.
// We never auto-assert eligibility; confidence and reasoning are always shown.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { loadProfile } from "../lib/profile.js";
import supabaseAdapter from "../lib/supabaseAdapter.js";
import {
  findCandidates,
  candidatesFromTransactions,
  HEURISTICS_VERSION,
} from "../lib/statementImport.js";
import { connectBank, fetchPlaidTransactions } from "../lib/plaid.js";
import { ReceiptIcon, CheckIcon, SearchIcon } from "../components/icons.jsx";

const usd = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

const CATEGORIES = [
  "OTC", "Vision", "Dental", "Diagnostics", "First Aid",
  "Family", "DPC", "Telehealth", "Recovery", "Other",
];

export default function Finder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [hsaDate, setHsaDate] = useState(null);
  const [existing, setExisting] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | review | saving | done
  const [result, setResult] = useState(null); // output of findCandidates
  const [selected, setSelected] = useState(new Set());
  const [categories, setCategories] = useState({}); // key -> category override
  const [error, setError] = useState(null);
  const [savedTotal, setSavedTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([loadProfile(), supabaseAdapter.load(user.id)]).then(
      ([profile, receipts]) => {
        if (!alive) return;
        setHsaDate(profile?.hsa_established_date ?? null);
        setExisting(receipts);
      }
    );
    return () => {
      alive = false;
    };
  }, [user.id]);

  // Same date + same amount as an existing receipt → probably already vaulted.
  const dupKeys = useMemo(
    () => new Set(existing.map((r) => `${r.date}|${Number(r.total).toFixed(2)}`)),
    [existing]
  );

  function startReview(res) {
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(res);
    // Pre-select high-confidence, non-duplicate candidates; the user still
    // reviews the whole list before anything is saved.
    setSelected(
      new Set(
        res.candidates
          .filter(
            (c) =>
              c.confidence === "high" &&
              !dupKeys.has(`${c.date}|${c.amount.toFixed(2)}`)
          )
          .map((c) => c.key)
      )
    );
    setCategories({});
    setPhase("review");
  }

  async function onFile(file) {
    setError(null);
    if (!file) return;
    const text = await file.text();
    startReview(findCandidates(text, hsaDate));
  }

  const [connecting, setConnecting] = useState(false);

  // Plaid's transactions product can take a few seconds to initialize after
  // linking — retry a couple of times before concluding there's nothing.
  async function pullTransactions() {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { transactions } = await fetchPlaidTransactions();
      if (transactions.length) return transactions;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return [];
  }

  async function onConnectBank() {
    setError(null);
    setConnecting(true);
    try {
      const linked = await connectBank();
      if (!linked) return; // user closed Link
      const transactions = await pullTransactions();
      startReview(candidatesFromTransactions(transactions, hsaDate));
    } catch (err) {
      setError(err.message || "Bank connection failed. Try again shortly.");
    } finally {
      setConnecting(false);
    }
  }

  async function onRescan() {
    setError(null);
    setConnecting(true);
    try {
      const transactions = await pullTransactions();
      if (!transactions.length) {
        setError("No transactions found on your linked banks yet — connect one first, or wait a moment and rescan.");
        return;
      }
      startReview(candidatesFromTransactions(transactions, hsaDate));
    } catch (err) {
      setError(err.message || "Rescan failed. Try again shortly.");
    } finally {
      setConnecting(false);
    }
  }

  function toggle(key) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const foundTotal = useMemo(
    () => (result?.candidates ?? []).reduce((s, c) => s + c.amount, 0),
    [result]
  );
  const selectedTotal = useMemo(
    () =>
      (result?.candidates ?? [])
        .filter((c) => selected.has(c.key))
        .reduce((s, c) => s + c.amount, 0),
    [result, selected]
  );

  async function confirmSelected() {
    if (!selected.size) return;
    setPhase("saving");
    const now = Date.now();
    const picked = result.candidates.filter((c) => selected.has(c.key));
    const newReceipts = picked.map((c, i) => ({
      id: `r_${now}_${i}`,
      product: c.description,
      merchant: c.description,
      date: c.date,
      subtotal: "",
      discount: "",
      tax: "",
      total: c.amount,
      category: categories[c.key] || c.category,
      paySource: "out-of-pocket",
      cardBrand: "",
      cardLast4: "",
      hsaOpenAtTime: true, // pre-HSA rows were excluded by the pipeline
      notes: `Imported from statement · ${c.confidence} confidence · ${c.reason} · rules ${HEURISTICS_VERSION}`,
      photo: null,
      photoPath: null,
      status: "deferred",
      createdAt: new Date().toISOString(),
    }));
    // Reuse the vault's write path: merge with the existing list and save.
    const fresh = await supabaseAdapter.load(user.id);
    await supabaseAdapter.save(user.id, [...newReceipts, ...fresh]);
    setSavedTotal(selectedTotal);
    setPhase("done");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-2xl font-700 tracking-tight text-stone-950">
          Retroactive expense finder
        </h1>
        <p className="mt-1 max-w-prose text-stone-500">
          Upload a bank or card statement (CSV) and we'll flag transactions that
          look HSA-eligible — money you may be able to reimburse yourself
          tax-free, no matter how long ago you paid.
        </p>
      </header>

      {phase === "idle" && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {!hsaDate && (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
              Tip: set your HSA opening date on the{" "}
              <Link to="/vault" className="underline">vault</Link> or{" "}
              <Link to="/account" className="underline">account</Link> page first —
              we'll automatically skip expenses from before your HSA existed.
            </p>
          )}
          <div
            className="grid place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 px-6 py-12 text-center"
          >
            <SearchIcon className="h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm font-medium text-stone-700">
              Drop in a transaction CSV from your bank or card
            </p>
            <p className="mt-1 max-w-sm text-xs text-stone-500">
              Most banks: Transactions → Download/Export → CSV. We read it right
              here in your browser — the file never touches our servers.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="candor-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                Choose CSV file
              </button>
              <span className="text-xs text-stone-400">or</span>
              <button
                onClick={onConnectBank}
                disabled={connecting}
                className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                {connecting ? "Working…" : "Connect a bank (sandbox)"}
              </button>
              <button
                onClick={onRescan}
                disabled={connecting}
                className="text-xs font-medium text-stone-500 underline hover:text-stone-700 disabled:opacity-60"
              >
                Rescan already-linked banks
              </button>
            </div>
            <p className="mt-2 text-[11px] text-stone-400">
              Bank connection is read-only via Plaid — Candor never moves your
              money. Sandbox mode: test institutions only.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}

      {(phase === "review" || phase === "saving") && result && (
        <div className="mt-6">
          {/* The moment */}
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="px-6 py-5">
              <p className="text-sm font-medium text-stone-500">
                We found
              </p>
              <p className="candor-gradient-text font-display mt-1 text-4xl font-700 tracking-tight">
                {usd(foundTotal)}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                in {result.candidates.length} likely-eligible expense
                {result.candidates.length === 1 ? "" : "s"} you could reimburse
                tax-free
                {result.skippedPreHsa > 0 &&
                  ` (${result.skippedPreHsa} skipped — dated before your HSA opened)`}
                . Review each one below — you decide what's real.
              </p>
            </div>
          </section>

          {/* Review queue */}
          <div className="mt-4 space-y-2">
            {result.candidates.length === 0 && (
              <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-10 text-center text-sm text-stone-500">
                Nothing looked medical in this file. Try a different account's
                export — or add expenses manually in the vault.
              </div>
            )}
            {result.candidates.map((c) => {
              const isDup = dupKeys.has(`${c.date}|${c.amount.toFixed(2)}`);
              const checked = selected.has(c.key);
              return (
                <label
                  key={c.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
                    checked ? "border-stone-400" : "border-stone-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.key)}
                    className="h-4 w-4 shrink-0 rounded border-stone-300 text-candor-red focus:ring-candor-red"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-950">
                      {c.description}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                      {c.date}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                          c.confidence === "high"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-amber-50 text-amber-700 ring-amber-600/20"
                        }`}
                        title={c.reason}
                      >
                        {c.confidence} · {c.reason}
                      </span>
                      {isDup && (
                        <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                          possible duplicate — same date & amount in your vault
                        </span>
                      )}
                    </p>
                  </div>
                  <select
                    value={categories[c.key] || c.category}
                    onChange={(e) =>
                      setCategories((m) => ({ ...m, [c.key]: e.target.value }))
                    }
                    onClick={(e) => e.preventDefault()}
                    className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                  <p className="font-display w-20 text-right font-600 text-stone-950">
                    {usd(c.amount)}
                  </p>
                </label>
              );
            })}
          </div>

          {result.candidates.length > 0 && (
            <div className="sticky bottom-16 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
              <p className="text-sm text-stone-600">
                <span className="font-display font-600 text-stone-950">
                  {usd(selectedTotal)}
                </span>{" "}
                across {selected.size} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPhase("idle");
                    setResult(null);
                  }}
                  className="rounded-xl border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Start over
                </button>
                <button
                  onClick={confirmSelected}
                  disabled={!selected.size || phase === "saving"}
                  className="candor-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {phase === "saving"
                    ? "Adding…"
                    : `Add ${selected.size} to my shoebox`}
                </button>
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-[11px] text-stone-400">
            Suggestions only — not tax advice. Classification rules v{HEURISTICS_VERSION}.
            Your statement is processed entirely in your browser.
          </p>
        </div>
      )}

      {phase === "done" && (
        <div className="mt-6 grid place-items-center rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center shadow-sm">
          <div className="candor-gradient grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm">
            <CheckIcon className="h-6 w-6" />
          </div>
          <p className="font-display mt-4 text-2xl font-700 tracking-tight text-stone-950">
            {usd(savedTotal)} added to your shoebox
          </p>
          <p className="mt-2 max-w-sm text-sm text-stone-500">
            That's money you can now reimburse from your HSA tax-free — today,
            or in 2045. It's waiting in your vault whenever you want it.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="candor-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              See my Claimable Balance
            </button>
            <Link
              to="/vault"
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              <span className="inline-flex items-center gap-1.5">
                <ReceiptIcon className="h-4 w-4" /> Review in vault
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
