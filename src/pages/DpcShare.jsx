// Public DPC cap calculator (/dpc) — the co-brand distribution hook (Week 5).
// DPC physicians share this with patients: /dpc?practice=Acme+Health&ref=acme
// renders their practice name on the page. No auth, no data stored — a
// calculator plus a funnel. Caps come from the rules engine.

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DPC_CAPS } from "../data/eligibilityRules.js";
import { ShieldIcon } from "../components/icons.jsx";

const usd = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function DpcShare() {
  const [params] = useSearchParams();
  const practice = (params.get("practice") || "").slice(0, 60);
  const refCode = (params.get("ref") || "").slice(0, 40);

  const [fee, setFee] = useState("");
  const [coverage, setCoverage] = useState("self");
  const [employerPaid, setEmployerPaid] = useState(false);

  const cap = coverage === "family" ? DPC_CAPS.familyMonthly : DPC_CAPS.selfMonthly;
  const amount = Number(String(fee).replace(/[$,\s]/g, "")) || 0;
  const over = amount > cap;
  const signupHref = refCode ? `/?ref=${encodeURIComponent(refCode)}` : "/";

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      {practice && (
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-stone-400">
          Shared by {practice}
        </p>
      )}
      <h1 className="font-display text-center text-2xl font-700 tracking-tight text-stone-950">
        Is your DPC membership HSA-qualified?
      </h1>
      <p className="mx-auto mt-2 max-w-md text-center text-stone-500">
        Since 2026, Direct Primary Care fees qualify — up to a monthly cap.
        Check yours in five seconds.
      </p>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">
              Monthly membership fee
            </span>
            <input
              inputMode="decimal"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="e.g. 129"
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">Coverage</span>
            <select
              value={coverage}
              onChange={(e) => setCoverage(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="self">Just me</option>
              <option value="family">My family</option>
            </select>
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2.5 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={employerPaid}
            onChange={(e) => setEmployerPaid(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300"
          />
          My employer pays the fee
        </label>

        {amount > 0 && (
          <div
            className={`mt-4 rounded-xl p-4 text-sm ring-1 ring-inset ${
              employerPaid || over
                ? "bg-red-50 text-red-700 ring-red-600/20"
                : "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
            }`}
          >
            {employerPaid ? (
              <>
                <strong>Not HSA-qualified.</strong> Employer-paid DPC never
                qualifies — only fees you pay yourself count (IRS Notice 2026-05).
              </>
            ) : over ? (
              <>
                <strong>{usd(amount)}/mo is over the {usd(cap)} cap — and the cap is a
                cliff.</strong>{" "}
                The entire arrangement is disqualifying for any month you exceed it,
                not just the overage. Ask your practice about restructuring.
              </>
            ) : (
              <>
                <strong>Qualified — {usd(amount)}/mo fits under the {usd(cap)} cap.</strong>{" "}
                You can pay it out of pocket and reimburse from your HSA tax-free,
                now or years from now. {usd(cap - amount)}/mo of headroom.
              </>
            )}
          </div>
        )}

        <p className="mt-3 text-xs text-stone-400">
          2026 caps: {usd(DPC_CAPS.selfMonthly)}/mo self · {usd(DPC_CAPS.familyMonthly)}/mo
          family ({DPC_CAPS.source}). Inflation-adjusted annually. Not tax advice.
        </p>
      </div>

      <div className="candor-gradient mt-5 rounded-2xl p-[1px]">
        <div className="rounded-2xl bg-white p-5 text-center">
          <p className="font-display font-600 text-stone-950">
            Track it automatically with Candor
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
            Cap warnings before the cliff, receipts vaulted, and a claimable
            balance that grows every month. Free forever.
          </p>
          <Link
            to={signupHref}
            className="candor-gradient mt-3 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            Get started free
          </Link>
        </div>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
        <ShieldIcon className="h-3.5 w-3.5" /> No ads. Your data is never sold or shared.
      </p>
    </div>
  );
}
