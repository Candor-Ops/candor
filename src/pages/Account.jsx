// /account — the auth surface (Week 2).
// Signed out: sign in / create account / magic link. Signed in: account info + sign out.
// Email/password + magic link only — no social logins, no custom SMTP (sprint guardrail).

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { loadProfile, saveHsaDate } from "../lib/profile.js";
import { AccountIcon, CheckIcon } from "../components/icons.jsx";

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-950 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200";

export default function Account() {
  const { user, loading, configured } = useAuth();

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <header className="mb-6 text-center">
        <div className="candor-gradient mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm">
          <AccountIcon className="h-6 w-6" />
        </div>
        <h1 className="font-display mt-4 text-2xl font-700 tracking-tight text-stone-950">
          {user ? "Your account" : "Sign in to Candor"}
        </h1>
        <p className="mt-1 text-stone-500">
          {user
            ? "Your receipts are private to you — protected by row-level security."
            : "Your vault, on every device. No ads, ever — and we never sell or share your data."}
        </p>
      </header>

      {!configured ? (
        <NotConfigured />
      ) : loading ? (
        <div className="grid place-items-center rounded-2xl border border-stone-200 bg-white p-10 shadow-sm">
          <div className="h-6 w-6 animate-pulse rounded-lg bg-stone-200" aria-hidden />
        </div>
      ) : user ? (
        <SignedIn />
      ) : (
        <AuthForm />
      )}
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
      <p className="font-semibold">Accounts aren't switched on yet.</p>
      <p className="mt-1">
        This deploy is missing its Supabase configuration. Once it's connected,
        you'll be able to sign in and your vault will follow you across devices.
      </p>
    </div>
  );
}

function SignedIn() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-stone-500">Signed in as</dt>
          <dd className="mt-0.5 font-medium text-stone-950">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-stone-500">Member since</dt>
          <dd className="mt-0.5 text-stone-700">
            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
        <CheckIcon className="h-3.5 w-3.5 shrink-0" />
        Receipts now save to your account and sync across devices.
      </div>

      <HsaDateField userId={user.id} />

      <DataControls />

      <button
        onClick={async () => {
          setBusy(true);
          await signOut();
          setBusy(false);
        }}
        disabled={busy}
        className="mt-5 w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

/**
 * Data export + delete, self-serve (trust covenant: no data hostage-taking).
 * Export = full JSON of receipts + profile. Delete = wipes receipts, photos,
 * bank links, and profile via RLS-scoped deletes, then signs out.
 */
function DataControls() {
  const { user, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const { default: supabaseAdapter } = await import("../lib/supabaseAdapter.js");
      const { loadProfile } = await import("../lib/profile.js");
      const [receipts, profile] = await Promise.all([
        supabaseAdapter.load(user.id),
        loadProfile(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        account: { id: user.id, email: user.email },
        profile,
        receipts,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `candor-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEverything() {
    if (confirmText !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      const { supabase } = await import("../lib/supabaseClient.js");
      const { default: supabaseAdapter } = await import("../lib/supabaseAdapter.js");
      // Wipes receipts + their photos via the adapter's reconcile path.
      await supabaseAdapter.load(user.id);
      await supabaseAdapter.save(user.id, []);
      await supabase.from("plaid_items").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("user_id", user.id);
      await signOut();
    } catch {
      setError("Deletion hit a snag — try again, or contact support.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-stone-100 pt-5">
      <p className="text-xs font-medium text-stone-500">Your data</p>
      <p className="mt-1 text-xs text-stone-400">
        Export everything anytime, or erase it all. No hostage-taking — trust
        is the product.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={exportData}
          disabled={busy}
          className="rounded-xl border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          Export all my data (JSON)
        </button>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-xl border border-red-200 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Delete my data
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "DELETE"'
              className="w-32 rounded-xl border border-red-200 px-3 py-2 text-sm"
            />
            <button
              onClick={deleteEverything}
              disabled={busy || confirmText !== "DELETE"}
              className="rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Erasing…" : "Erase everything"}
            </button>
          </span>
        )}
      </div>
      {confirming && (
        <p className="mt-2 text-xs text-red-600">
          Permanently erases all receipts, photos, bank links, and settings,
          then signs you out. Your sign-in email remains until you ask us to
          remove it entirely. This cannot be undone.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** View + edit the HSA establishment date (drives per-receipt eligibility flags). */
function HsaDateField({ userId }) {
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile().then((p) => setDate(p?.hsa_established_date ?? ""));
  }, [userId]);

  async function onSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveHsaDate(userId, date);
      setSaved(true);
    } catch {
      setError("Couldn't save — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-stone-100 pt-5">
      <p className="text-xs font-medium text-stone-500">HSA opened on</p>
      <p className="mt-1 text-xs text-stone-400">
        Used to automatically flag which receipts are reimbursable — the IRS only
        allows reimbursing expenses paid after your HSA was established.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => {
            setDate(e.target.value);
            setSaved(false);
          }}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
        <button
          onClick={onSave}
          disabled={busy || !date}
          className="rounded-xl border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <CheckIcon className="h-4 w-4 text-emerald-600" />}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AuthForm() {
  const { signUp, signInWithPassword, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from || "/vault";

  const [mode, setMode] = useState("signin"); // 'signin' | 'signup' | 'magic'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "magic") {
        const { error: err } = await signInWithMagicLink(email);
        if (err) throw err;
        setNotice("Check your email — your sign-in link is on the way.");
      } else if (mode === "signup") {
        const { data, error: err } = await signUp(email, password);
        if (err) throw err;
        if (data?.session) navigate(dest, { replace: true });
        else setNotice("Almost there — check your email to confirm your account.");
      } else {
        const { error: err } = await signInWithPassword(email, password);
        if (err) throw err;
        navigate(dest, { replace: true });
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const cta =
    mode === "magic"
      ? "Email me a magic link"
      : mode === "signup"
        ? "Create account"
        : "Sign in";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {/* Mode tabs */}
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 text-sm font-medium">
        {[
          ["signin", "Sign in"],
          ["signup", "Sign up"],
          ["magic", "Magic link"],
        ].map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setMode(v);
              setError(null);
              setNotice(null);
            }}
            className={`rounded-lg px-2 py-1.5 transition-colors ${
              mode === v ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-950"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@example.com"
          />
        </label>

        {mode !== "magic" && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            />
          </label>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/20">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="candor-gradient w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {busy ? "One moment…" : cta}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-stone-400">
        {mode === "magic"
          ? "No password needed — we'll email you a one-time sign-in link."
          : "Prefer not to use a password? Try the magic link."}
      </p>
    </div>
  );
}
