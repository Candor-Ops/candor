import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import {
  StoreIcon,
  VaultIcon,
  DashboardIcon,
  TaxIcon,
  AccountIcon,
  CheckIcon,
} from "./icons.jsx";

/** Candor wordmark: a "verified" stamp mark + the name in Space Grotesk. */
export function Wordmark({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="candor-gradient relative grid h-7 w-7 place-items-center rounded-[9px] text-white shadow-sm">
        <CheckIcon className="h-4 w-4" />
      </span>
      <span className="font-display text-[19px] font-700 leading-none tracking-tight text-stone-950">
        Candor
      </span>
    </span>
  );
}

const TABS = [
  { to: "/store", label: "Store", Icon: StoreIcon },
  { to: "/vault", label: "Vault", Icon: VaultIcon },
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/tax", label: "Tax", Icon: TaxIcon },
  { to: "/account", label: "Account", Icon: AccountIcon },
];

export default function Layout() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <div className="min-h-dvh bg-white text-stone-950">
      {/* ---- Top nav ---- */}
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Candor home" className="shrink-0">
            <Wordmark />
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            {TABS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-stone-950"
                      : "text-stone-500 hover:text-stone-950"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          <Link
            to="/"
            className="candor-gradient hidden rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-candor-red sm:inline-flex"
          >
            {isLanding ? "Get early access" : "Waitlist"}
          </Link>
        </nav>
      </header>

      {/* ---- Routed page ---- */}
      <main className="pb-24 md:pb-0">
        <Outlet />
      </main>

      {/* ---- Mobile bottom tab bar ---- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? "text-candor-red" : "text-stone-400"
                }`
              }
            >
              <Icon className="h-[22px] w-[22px]" />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

/** Shown by the Sentry ErrorBoundary in main.jsx when a render throws. */
export function ErrorFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-white px-6 text-center">
      <div className="max-w-md">
        <Wordmark className="mb-6 justify-center" />
        <h1 className="font-display text-2xl font-700 text-stone-950">
          This page hit a snag.
        </h1>
        <p className="mt-3 text-stone-500">
          We logged the error and we're looking into it. Reload to try again —
          anything you've saved locally is still here.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="candor-gradient mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
