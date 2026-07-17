// Form 8889 Tax Export Wizard (Week 5) — the monetization event.
// 3 steps: review → confirm 8889 mapping → export. Browsable free;
// the four export formats unlock with Tax Pass (entitlement tier).

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import supabaseAdapter from "../lib/supabaseAdapter.js";
import { loadProfile, saveProfileFields } from "../lib/profile.js";
import {
  form8889Summary,
  turboTaxCsv,
  hrBlockCsv,
  accountantWorkbookXml,
  receiptBundleHtml,
  download,
} from "../lib/taxExport.js";
import { CheckIcon, ShieldIcon } from "../components/icons.jsx";

const usd = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function Tax() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [receipts, setReceipts] = useState(null);
  const [profile, setProfile] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([supabaseAdapter.load(user.id), loadProfile()]).then(([list, p]) => {
      if (!alive) return;
      setReceipts(list);
      setProfile(p);
    });
    return () => {
      alive = false;
    };
  }, [user.id]);

  // Returning from Stripe checkout (?upgraded=1): grant the entitlement.
  // DEMO-GRADE: production must grant via Stripe webhook verification, not
  // a client redirect (see stripe-checkout.js TODO).
  useEffect(() => {
    if (params.get("upgraded") === "1" && profile && profile.tier === "free") {
      saveProfileFields(user.id, { tier: "tax_pass" }).then((p) => {
        setProfile(p);
        setNotice("Tax Pass unlocked — exports are ready.");
      });
    }
  }, [params, profile, user.id]);

  const tier = profile?.tier ?? "free";
  const unlocked = tier === "tax_pass" || tier === "plus";
  const summary = useMemo(
    () => form8889Summary(receipts ?? [], year),
    [receipts, year]
  );

  async function startCheckout() {
    setBusy(true);
    setNotice(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/.netlify/functions/stripe-checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 503) {
        // Payments not configured on this deploy → clearly-labeled demo unlock.
        const p = await saveProfileFields(user.id, { tier: "tax_pass" });
        setProfile(p);
        setNotice("Demo mode: payments aren't wired up yet, so Tax Pass was unlocked for free.");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Checkout failed.");
      window.location.assign(json.url);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }

  const exports = [
    {
      label: "TurboTax CSV",
      run: () => download(`candor-turbotax-${year}.csv`, turboTaxCsv(summary), "text/csv"),
    },
    {
      label: "H&R Block CSV",
      run: () => download(`candor-hrblock-${year}.csv`, hrBlockCsv(summary), "text/csv"),
    },
    {
      label: "Accountant workbook (Excel)",
      run: () =>
        download(
          `candor-8889-workbook-${year}.xls`,
          accountantWorkbookXml(summary, { referralUrl: "https://candorhsa.com" }),
          "application/vnd.ms-excel"
        ),
    },
    {
      label: "Printable receipt bundle",
      run: () => {
        const html = receiptBundleHtml(summary, { email: user.email });
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
        }
      },
    },
  ];

  const loading = receipts === null;
  const years = [...new Set((receipts ?? []).map((r) => String(r.date).slice(0, 4)).filter(Boolean))]
    .sort()
    .reverse();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-2xl font-700 tracking-tight text-stone-950">
          Tax export
        </h1>
        <p className="mt-1 text-stone-500">
          Turn your vault into Form 8889-ready numbers — with the receipts to
          back every line.
        </p>
      </header>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2 text-xs font-medium">
        {["Review", "Confirm 8889", "Export"].map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i + 1)}
            className={`rounded-full px-3 py-1.5 ring-1 ring-inset transition-colors ${
              step === i + 1
                ? "bg-stone-950 text-white ring-stone-950"
                : "bg-white text-stone-500 ring-stone-200"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="ml-auto rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm"
        >
          {(years.length ? years : [String(new Date().getFullYear())]).map((y) => (
            <option key={y} value={y}>
              Tax year {y}
            </option>
          ))}
        </select>
      </div>

      {notice && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-stone-200 p-12">
          <div className="h-6 w-6 animate-pulse rounded-lg bg-stone-200" />
        </div>
      ) : step === 1 ? (
        <StepReview summary={summary} onNext={() => setStep(2)} />
      ) : step === 2 ? (
        <StepConfirm summary={summary} onNext={() => setStep(3)} />
      ) : (
        <StepExport
          unlocked={unlocked}
          exports={exports}
          busy={busy}
          onUnlock={startCheckout}
          summary={summary}
        />
      )}
    </div>
  );
}

function RowList({ rows, empty }) {
  if (!rows.length)
    return <p className="px-4 py-6 text-center text-sm text-stone-400">{empty}</p>;
  return (
    <ul className="divide-y divide-stone-100">
      {rows.map((r) => (
        <li
          key={r.id ?? `${r.date}-${r.product}`}
          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
        >
          <span className="min-w-0 truncate text-stone-700">
            {r.date} · {r.product || "Medical expense"}
            {r.merchant ? ` · ${r.merchant}` : ""}
          </span>
          <span className="font-display font-600 text-stone-950">{usd(r.total)}</span>
        </li>
      ))}
    </ul>
  );
}

function StepReview({ summary, onNext }) {
  return (
    <div className="mt-6 space-y-4">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-4 py-3">
          <p className="font-display font-600 text-stone-950">
            Distributions in {summary.year} — {usd(summary.line14a)}
          </p>
          <p className="text-xs text-stone-500">
            HSA-card purchases plus expenses you marked reimbursed. These are
            what Form 8889 reports.
          </p>
        </div>
        <RowList
          rows={summary.distributionRows}
          empty="No distributions this year — nothing to report on 8889 lines 14–16."
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-4 py-3">
          <p className="font-display font-600 text-stone-950">
            Staying in the shoebox — {usd(summary.deferredTotal)}
          </p>
          <p className="text-xs text-stone-500">
            Deferred expenses appear NOWHERE on this year's return. They keep
            compounding until you choose to reimburse (Notice 2004-50, Q&A 39).
          </p>
        </div>
        <RowList rows={summary.deferredRows} empty="Nothing deferred this year." />
      </section>

      <button
        onClick={onNext}
        className="candor-gradient w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        Looks right — map it to Form 8889
      </button>
      <p className="text-center text-xs text-stone-400">
        Fix anything first in the{" "}
        <Link to="/vault" className="underline">
          vault
        </Link>{" "}
        — edits flow straight through.
      </p>
    </div>
  );
}

function StepConfirm({ summary, onNext }) {
  const lines = [
    [
      "14a",
      "Total distributions from your HSA",
      summary.line14a,
      "Cross-check against the 1099-SA your custodian sends.",
    ],
    [
      "15",
      "Unreimbursed qualified medical expenses",
      summary.line15,
      "Every distribution in Candor is receipt-backed.",
    ],
    [
      "16",
      "Taxable HSA distributions",
      summary.line16,
      summary.line16 === 0
        ? "Zero — all distributions were qualified. No tax, no penalty."
        : "Non-qualified amount — taxed plus a 20% penalty.",
    ],
  ];
  return (
    <div className="mt-6 space-y-4">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-4 py-3">
          <p className="font-display font-600 text-stone-950">Form 8889, line by line</p>
          <p className="text-xs text-stone-500">
            Shown for transparency — you (or your preparer) stay in control.
          </p>
        </div>
        <ul className="divide-y divide-stone-100">
          {lines.map(([line, label, amount, note]) => (
            <li key={line} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-950">
                  Line {line} — {label}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">{note}</p>
              </div>
              <span className="font-display shrink-0 font-600 text-stone-950">
                {usd(amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <button
        onClick={onNext}
        className="candor-gradient w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        Confirm — take me to exports
      </button>
      <p className="text-center text-xs text-stone-400">
        Informational, not tax advice. Contribution lines (1–13) come from your
        custodian and payroll records.
      </p>
    </div>
  );
}

function StepExport({ unlocked, exports, busy, onUnlock, summary }) {
  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display font-600 text-stone-950">
            Exports for {summary.year}
          </p>
          {unlocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <CheckIcon className="h-3.5 w-3.5" /> Tax Pass
            </span>
          ) : (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500">
              Locked
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {exports.map((e) => (
            <button
              key={e.label}
              onClick={unlocked ? e.run : undefined}
              disabled={!unlocked}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                unlocked
                  ? "border-stone-200 text-stone-700 hover:bg-stone-50"
                  : "cursor-not-allowed border-stone-100 text-stone-300"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {!unlocked && (
          <div className="mt-5 rounded-xl bg-stone-50 p-4 text-center">
            <p className="font-display font-600 text-stone-950">
              Unlock Tax Pass — $39, one season
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500">
              All four export formats plus the audit-defense receipt bundle.
              Your ledger, vault, finder, and advisor stay free forever — this
              only gates the exports.
            </p>
            <button
              onClick={onUnlock}
              disabled={busy}
              className="candor-gradient mt-3 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {busy ? "One moment…" : "Unlock exports"}
            </button>
          </div>
        )}
      </section>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
        <ShieldIcon className="h-3.5 w-3.5" />
        Payments never touch HSA funds. Exports are informational, not tax advice.
      </p>
    </div>
  );
}
