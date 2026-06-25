import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  CheckIcon,
  ShieldIcon,
  ReceiptIcon,
  ArrowRight,
  ClockIcon,
  StoreIcon,
  VaultIcon,
  TaxIcon,
} from "../components/icons";
import EligBadge from "../components/EligBadge";

/* -------------------------------------------------------------------------- */
/*  Waitlist capture — the page's primary conversion goal.                    */
/*  Posts to Web3Forms (https://web3forms.com). The access key lives in       */
/*  VITE_WEB3FORMS_KEY (set in Netlify env, never committed).                 */
/* -------------------------------------------------------------------------- */
function WaitlistForm({ idPrefix = "wl", tone = "light" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [message, setMessage] = useState("");

  const accessKey = import.meta.env.VITE_WEB3FORMS_KEY;

  async function handleSubmit(e) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("error");
      setMessage("That email doesn't look right — mind checking it?");
      return;
    }
    if (!accessKey) {
      // Misconfiguration guard so a missing key fails loudly in dev, gracefully in prod.
      setStatus("error");
      setMessage("Waitlist isn't wired up yet. Add VITE_WEB3FORMS_KEY and redeploy.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          email: value,
          subject: "New Candor waitlist signup",
          from_name: "Candor waitlist",
          botcheck: "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setMessage("Something went sideways on our end. Try again in a moment?");
      }
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  const dark = tone === "dark";

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${
          dark ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-900"
        }`}
        role="status"
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            dark ? "bg-white/20" : "bg-emerald-600 text-white"
          }`}
        >
          <CheckIcon className="h-5 w-5" />
        </span>
        <div className="text-sm leading-snug">
          <p className="font-semibold">You're on the list.</p>
          <p className={dark ? "text-white/70" : "text-emerald-700"}>
            We'll email you the moment early access opens.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor={`${idPrefix}-email`} className="sr-only">
            Email address
          </label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            aria-invalid={status === "error"}
            className={`h-12 w-full rounded-xl border px-4 text-base outline-none transition focus:ring-4 ${
              dark
                ? "border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/10"
                : "border-stone-300 bg-white text-stone-950 placeholder:text-stone-400 focus:border-candor-red focus:ring-candor-red/15"
            }`}
          />
          {/* Honeypot — hidden from humans, catches bots. */}
          <input
            type="checkbox"
            name="botcheck"
            tabIndex={-1}
            autoComplete="off"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
            aria-hidden="true"
          />
        </div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="candor-gradient inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-candor-red/25 disabled:opacity-60"
        >
          {status === "submitting" ? "Joining…" : "Get early access"}
          {status !== "submitting" && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
      <p
        className={`mt-2 min-h-[1.25rem] text-sm ${
          status === "error"
            ? dark
              ? "text-red-200"
              : "text-candor-red"
            : dark
              ? "text-white/55"
              : "text-stone-500"
        }`}
      >
        {status === "error" ? message : "No spam. Just one email when we go live."}
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  HSA ledger — the hero's signature visual. A live, auto-captured receipt   */
/*  ledger: rows reveal in sequence, the tax-advantaged total counts up, and  */
/*  a Form 8889 "ready" stamp sits in the corner. Every row is real-world     */
/*  eligible with its IRS citation shown — the two OBBB-2026 tags land on the */
/*  categories that ACTUALLY became eligible (DPC + telehealth), never on     */
/*  fitness/gym (which the final OBBB law did NOT make broadly eligible).     */
/*  Triggers on scroll-into-view; fully static under reduced-motion.          */
/* -------------------------------------------------------------------------- */
const LEDGER_ROWS = [
  {
    merch: "Direct Primary Care",
    amount: 89.0,
    cat: "Pub. 502 · DPC",
    tag: "OBBB 2026",
    status: "Eligible",
  },
  {
    merch: "Prescription refill",
    amount: 24.5,
    cat: "Rx · Pub. 502",
    status: "Filed",
  },
  {
    merch: "Telehealth visit",
    amount: 45.0,
    cat: "§71306 · telehealth",
    tag: "OBBB 2026",
    status: "Eligible",
  },
];
const LEDGER_TOTAL = 158.5; // sum of the rows above

const money = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function HsaLedger() {
  const ref = useRef(null);
  const [visibleRows, setVisibleRows] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const timers = [];

    const run = () => {
      if (prefersReduced) {
        setVisibleRows(LEDGER_ROWS.length);
        setTotal(LEDGER_TOTAL);
        return;
      }
      LEDGER_ROWS.forEach((_, i) => {
        timers.push(
          window.setTimeout(
            () => setVisibleRows((n) => Math.max(n, i + 1)),
            260 + i * 220,
          ),
        );
      });
      const startAt = 260 + LEDGER_ROWS.length * 220;
      timers.push(
        window.setTimeout(() => {
          const dur = 850;
          const t0 = performance.now();
          const tick = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
            setTotal(LEDGER_TOTAL * eased);
            if (p < 1) raf = requestAnimationFrame(tick);
            else setTotal(LEDGER_TOTAL);
          };
          raf = requestAnimationFrame(tick);
        }, startAt),
      );
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-sm select-none"
      aria-hidden="true"
    >
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-wide text-stone-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-candor-orange opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-candor-orange" />
            </span>
            Candor ledger · 2026
          </span>
          <span className="rounded-md border border-candor-red/15 bg-candor-red/5 px-2 py-1 font-mono text-[0.62rem] font-semibold tracking-wide text-candor-red">
            auto-captured
          </span>
        </div>

        {/* Rows */}
        {LEDGER_ROWS.map((row, i) => (
          <div
            key={row.merch}
            className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-stone-100 px-5 py-3.5 transition-all duration-500 ease-out ${
              i < visibleRows ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <span className="flex items-center gap-1.5 text-[0.92rem] font-semibold text-stone-900">
              {row.merch}
              {row.tag && (
                <span className="rounded border border-candor-orange/40 px-1.5 py-px font-mono text-[0.55rem] font-semibold uppercase tracking-wide text-candor-orange">
                  {row.tag}
                </span>
              )}
            </span>
            <span className="text-right font-mono text-[0.92rem] font-bold text-stone-900">
              {money(row.amount)}
            </span>
            <span className="font-mono text-[0.66rem] uppercase tracking-wide text-stone-400">
              {row.cat}
            </span>
            <span className="flex items-center justify-end gap-1 font-mono text-[0.62rem] text-stone-700">
              {row.status}
              <CheckIcon className="h-3 w-3 text-emerald-600" />
            </span>
          </div>
        ))}

        {/* Footer: running total + Form 8889 stamp */}
        <div className="flex items-end justify-between bg-stone-50 px-5 py-4">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-wide text-stone-500">
              Tax-advantaged this year
            </p>
            <p className="font-display text-3xl font-bold leading-none text-candor-red">
              {money(total)}
            </p>
          </div>
          <div className="rotate-[-4deg] rounded-lg border-2 border-emerald-600/70 bg-emerald-50/90 px-2.5 py-1.5 text-right">
            <p className="font-display text-[0.7rem] font-bold uppercase leading-tight tracking-wide text-emerald-700">
              Form 8889
              <br />
              ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                      */
/* -------------------------------------------------------------------------- */
function Pillar({ Icon, kicker, title, body }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-stone-300 hover:shadow-sm">
      <span className="candor-gradient grid h-11 w-11 place-items-center rounded-xl text-white">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-[0.72rem] font-semibold uppercase tracking-wide text-candor-red">
        {kicker}
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold text-stone-950">{title}</h3>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-stone-600">{body}</p>
    </div>
  );
}

function TrustItem({ children }) {
  return (
    <li className="flex items-center gap-2 text-sm font-medium text-stone-600">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
      {children}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */
export default function Landing() {
  return (
    <div className="bg-white">
      {/* ----------------------------- Hero ----------------------------- */}
      <section className="relative overflow-hidden">
        {/* soft gradient wash behind the hero */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] opacity-[0.07]"
          style={{
            background:
              "radial-gradient(60% 80% at 75% 0%, #f97316 0%, rgba(249,115,22,0) 60%), radial-gradient(50% 70% at 15% 10%, #e5484d 0%, rgba(229,72,77,0) 55%)",
          }}
          aria-hidden="true"
        />
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:pt-20 lg:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Copy + capture */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-wide text-stone-600">
                <ShieldIcon className="h-3.5 w-3.5 text-candor-red" />
                Verified HSA storefront
              </span>

              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                Spend your HSA with
                <br className="hidden sm:block" /> total{" "}
                <span className="candor-gradient-text">candor</span>.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
                Every product checked against the IRS rules — with the citation right there on
                the label. No guessing what qualifies, no surprises at tax time, no fine print
                quietly working against you.
              </p>

              <div className="mt-8 max-w-lg">
                <WaitlistForm idPrefix="hero" />
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
                <TrustItem>No ads, ever</TrustItem>
                <TrustItem>We never sell your data</TrustItem>
                <TrustItem>Citations on every item</TrustItem>
              </ul>
            </div>

            {/* Signature visual */}
            <div className="relative">
              <HsaLedger />
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Pillars --------------------------- */}
      <section className="border-t border-stone-100 bg-stone-50/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
              Three things, done honestly.
            </h2>
            <p className="mt-3 text-lg text-stone-600">
              Candor isn't a wallet or a bank. It's the layer that tells you what your HSA
              actually covers — and helps you claim every dollar you're owed.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Pillar
              Icon={StoreIcon}
              kicker="Shop"
              title="A storefront you can trust"
              body="Browse everyday health products — allergy meds, contacts, first aid, diagnostics — each one verified eligible with the rule it falls under shown right on the card."
            />
            <Pillar
              Icon={VaultIcon}
              kicker="Track"
              title="The shoebox, digitized"
              body="Snap a photo of any medical receipt — even old ones. Candor keeps a tidy, searchable record so nothing slips through the cracks before tax season."
            />
            <Pillar
              Icon={TaxIcon}
              kicker="File"
              title="Tax export, made simple"
              body="When it's time for Form 8889, export clean records for TurboTax, H&R Block, or your accountant in a couple of clicks. (Coming soon.)"
            />
          </div>
        </div>
      </section>

      {/* --------------------- OBBB 2026 first-mover -------------------- */}
      <section className="border-t border-stone-100">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-candor-red">
                New for 2026
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
                The rules just changed in your favor.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-stone-600">
                Recent legislation opened up categories most HSA tools haven't caught up on yet.
                Candor surfaces them the moment they apply to you — with the caveats that matter,
                not just the headline.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* DPC */}
              <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5">
                <EligBadge kind="dpc" capLabel="capped" />
                <h3 className="mt-3 font-display text-lg font-semibold text-stone-950">
                  Direct Primary Care
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  Monthly membership fees now qualify — up to{" "}
                  <span className="font-semibold text-stone-800">$150/mo</span> individual,{" "}
                  <span className="font-semibold text-stone-800">$300/mo</span> family.
                </p>
                <p className="mt-2 text-[0.8rem] leading-relaxed text-orange-700">
                  It's a cliff, not a ceiling: go a dollar over and the whole month is
                  disqualified. Candor tracks the cap so you don't.
                </p>
              </div>

              {/* Telehealth */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                <EligBadge kind="eligible" />
                <h3 className="mt-3 font-display text-lg font-semibold text-stone-950">
                  Pre-deductible telehealth
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  Virtual visits before you've hit your deductible are now permanently HSA-safe —
                  retroactive to January 2025.
                </p>
                <p className="mt-2 font-mono text-[0.72rem] text-stone-500">
                  OBBB Act 2026 · §71306
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Shoebox --------------------------- */}
      <section className="border-t border-stone-100 bg-stone-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-wide text-white/80">
                <ClockIcon className="h-3.5 w-3.5" />
                Most people don't know this
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                There's no expiration date on a receipt.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-white/70">
                Paid out of pocket for a doctor visit three years ago? If your HSA was open at the
                time, you can still reimburse yourself today — completely tax-free. Most people
                leave this money sitting on the table simply because they lost the paperwork.
              </p>
              <p className="mt-4 text-base leading-relaxed text-white/60">
                Candor is built around that receipt drawer. Keep every qualified expense in one
                place, and pull the money out whenever you want — this year, or a decade from now.
              </p>
              <p className="mt-5 font-mono text-[0.78rem] text-white/45">
                Basis: IRS Notice 2004-50, Q&amp;A 39
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10">
                  <ReceiptIcon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="text-sm text-white/60">Deferred and reimbursable</p>
                  <p className="font-display text-2xl font-semibold">$1,284.50</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Urgent care visit", "Mar 2023", "$175.00"],
                  ["Prescription glasses", "Nov 2023", "$329.00"],
                  ["Dental cleaning", "Jun 2024", "$140.00"],
                ].map(([label, date, amt]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-white/50">{date}</p>
                    </div>
                    <p className="font-display text-base font-semibold text-white">{amt}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-white/40">
                Illustrative — your records, kept private and searchable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------- How it works ------------------------ */}
      <section className="border-t border-stone-100">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
              How the verification works
            </h2>
            <p className="mt-3 text-lg text-stone-600">
              No black boxes. Every eligibility call traces back to a published rule you can read
              yourself.
            </p>
          </div>

          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "We check the rule",
                b: "Each product is matched to the IRS publication, notice, or statute that makes it eligible — Pub. 502, the CARES Act, the 2026 OBBB Act, and more.",
              },
              {
                n: "02",
                t: "We show our work",
                b: "That citation rides along on the product card and detail page. If it's eligible only with a Letter of Medical Necessity, we say so in plain language.",
              },
              {
                n: "03",
                t: "You stay covered",
                b: "Save the receipt to your shoebox at checkout. When tax season comes, your records and citations are already organized for Form 8889.",
              },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl border border-stone-200 bg-white p-6">
                <span className="font-display text-3xl font-bold text-stone-200">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-semibold text-stone-950">{s.t}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-stone-600">{s.b}</p>
              </li>
            ))}
          </ol>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-stone-400">
            Candor surfaces published IRS guidance to help you decide. It is informational and not
            tax advice — for your specific situation, check with a qualified tax professional.
          </p>
        </div>
      </section>

      {/* --------------------------- Final CTA -------------------------- */}
      <section className="border-t border-stone-100 bg-stone-50/60">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-20">
          <h2 className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            Be first through the door.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-stone-600">
            We're opening early access in waves. Add your email and we'll bring you in as soon as
            your spot is ready.
          </p>
          <div className="mx-auto mt-7 max-w-lg">
            <WaitlistForm idPrefix="footer-cta" />
          </div>
        </div>
      </section>

      {/* ----------------------------- Footer --------------------------- */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2">
                <span className="candor-gradient grid h-7 w-7 place-items-center rounded-lg text-white">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span className="font-display text-lg font-bold text-stone-950">Candor</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                The verified HSA storefront. Spend with clarity, track every receipt, and keep
                more of what's yours.
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
              <Link to="/store" className="text-stone-600 transition hover:text-stone-950">
                Store
              </Link>
              <Link to="/vault" className="text-stone-600 transition hover:text-stone-950">
                Receipt vault
              </Link>
              <Link to="/dashboard" className="text-stone-600 transition hover:text-stone-950">
                Dashboard
              </Link>
              <Link to="/tax" className="text-stone-600 transition hover:text-stone-950">
                Tax export
              </Link>
            </nav>
          </div>

          <div className="mt-10 border-t border-stone-100 pt-6">
            <p className="text-xs leading-relaxed text-stone-400">
              © {new Date().getFullYear()} Candor · candorhsa.com. Candor is not a bank, insurer,
              or tax advisor and does not move or hold funds. Eligibility information is drawn from
              published IRS guidance and is provided for general informational purposes only — it
              is not tax or legal advice. Rules change and individual circumstances vary; consult a
              qualified professional before making decisions about your HSA.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
