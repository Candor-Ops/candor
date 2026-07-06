// Auth context + route guard (Week 2).
//
// Exposes { session, user, loading, configured } plus signUp,
// signInWithPassword, signInWithMagicLink, signOut.
//
// PRIVACY GUARDRAIL: Sentry user context is the opaque Supabase UUID only —
// never email, name, or any PII. This preserves the Week 1 privacy posture
// (masked replays, scrubbed events) that is part of the product.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

const AuthContext = createContext({
  session: null,
  user: null,
  loading: false,
  configured: false,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  // Only show a loading state if there's a Supabase client to wait on.
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession ?? null);
      setLoading(false);
      // Opaque UUID only — NOT email, NOT name (privacy guardrail).
      Sentry.setUser(nextSession?.user ? { id: nextSession.user.id } : null);
    });

    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,
      signUp: (email, password) =>
        supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/account` },
        }),
      signInWithPassword: (email, password) =>
        supabase.auth.signInWithPassword({ email, password }),
      signInWithMagicLink: (email) =>
        supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/vault` },
        }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Neutral splash while the session restores — avoids flashing the login screen. */
function SessionSplash() {
  return (
    <div className="grid min-h-[50dvh] place-items-center">
      <div className="h-8 w-8 animate-pulse rounded-[9px] bg-stone-200" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * Route guard: renders children only with a signed-in session.
 * While the session is restoring, shows a neutral splash.
 * Signed out (or Supabase not configured) → redirect to /account.
 */
export function RequireAuth({ children }) {
  const { user, loading, configured } = useAuth();
  const location = useLocation();

  if (loading) return <SessionSplash />;
  if (!configured || !user) {
    return <Navigate to="/account" replace state={{ from: location.pathname }} />;
  }
  return children;
}
