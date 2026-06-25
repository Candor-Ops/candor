import { useMemo, useState } from "react";
import { CATALOG, CATEGORIES } from "../data/catalog.js";
import EligBadge from "../components/EligBadge.jsx";
import { SearchIcon, CloseIcon, ShieldIcon, ArrowRight } from "../components/icons.jsx";

const usd = (n) =>
  (Number(n) || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2,
  });

export default function Store() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [active, setActive] = useState(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((p) => {
      const inCat = cat === "All" || p.category === cat;
      const inQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.merchant.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return inCat && inQuery;
    });
  }, [query, cat]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700 tracking-tight text-stone-950">
            Verified storefront
          </h1>
          <p className="mt-1 text-stone-500">
            Every item is pre-checked against the IRS rules — with the citation, in plain sight.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-500 ring-1 ring-inset ring-stone-200">
          <ShieldIcon className="h-3.5 w-3.5 text-emerald-600" />
          {CATALOG.length} verified items
        </span>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, merchants, categories…"
          className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-950 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
      </div>

      {/* Category chips */}
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
              cat === c
                ? "bg-stone-950 text-white ring-stone-950"
                : "bg-white text-stone-600 ring-stone-200 hover:ring-stone-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {results.length === 0 ? (
        <p className="mt-12 text-center text-stone-500">
          Nothing matches “{query}” in {cat}. Try another search.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <ProductCard key={p.id} p={p} onOpen={() => setActive(p)} />
          ))}
        </div>
      )}

      {active && <ProductDetail p={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function ProductCard({ p, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition-all hover:border-stone-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
    >
      <div className="flex items-start justify-between gap-3">
        <EligBadge kind={p.kind} capLabel={p.capLabel} />
        <span className="text-xs font-medium text-stone-400">{p.category}</span>
      </div>
      <h3 className="mt-3 font-medium leading-snug text-stone-950">{p.name}</h3>
      <p className="mt-1 text-sm text-stone-500">{p.merchant}</p>
      <div className="mt-4 flex items-end justify-between">
        <p className="font-display text-lg font-700 text-stone-950">
          {usd(p.price)}
          {p.unit && <span className="text-sm font-500 text-stone-400">{p.unit}</span>}
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-stone-400 transition-colors group-hover:text-candor-red">
          Details <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function ProductDetail({ p, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <EligBadge kind={p.kind} capLabel={p.capLabel} size="md" />
            <span className="text-xs font-medium text-stone-400">{p.category}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <h2 className="font-display text-xl font-700 leading-snug tracking-tight text-stone-950">
          {p.name}
        </h2>
        <p className="mt-1 text-stone-500">{p.merchant}</p>

        <p className="font-display mt-4 text-3xl font-700 text-stone-950">
          {usd(p.price)}
          {p.unit && <span className="text-base font-500 text-stone-400">{p.unit}</span>}
        </p>

        {/* Why it's eligible — the "stamp" */}
        <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Why it's eligible
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-700">{p.note}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 font-mono text-[11px] font-medium text-stone-600 ring-1 ring-inset ring-stone-200">
            <ShieldIcon className="h-3.5 w-3.5 text-emerald-600" />
            {p.irs}
          </p>
        </div>

        {p.kind === "dpc" && (
          <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            <strong className="font-semibold">Watch the cap.</strong> DPC fees qualify only
            up to {p.capLabel}. Go over in any month and the entire arrangement becomes
            disqualifying coverage for that month — not just the overage. Candor's cap
            tracker (Week 3) warns you before you cross it.
          </div>
        )}
        {p.kind === "lmn" && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <strong className="font-semibold">Needs a Letter of Medical Necessity.</strong>{" "}
            This is a dual-use item — it qualifies only with an LMN tied to a diagnosed
            condition. Guided LMN checkout is coming after launch.
          </div>
        )}

        <button
          onClick={() => {
            /* MVP: affiliate link-out / simulated. Wired to real attribution in Week 3. */
          }}
          className="candor-gradient mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
        >
          View at {p.merchant}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-2 text-center text-xs text-stone-400">
          Affiliate link-out — Candor doesn't process payments or move HSA funds.
          Informational only, not tax advice.
        </p>
      </div>
    </div>
  );
}
