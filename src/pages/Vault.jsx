import ReceiptVault from "../components/ReceiptVault.jsx";
import supabaseAdapter from "../lib/supabaseAdapter.js";
import { useAuth } from "../lib/AuthContext.jsx";

// Route is wrapped in <RequireAuth> (App.jsx), so `user` is always present here.
// Week 2: persistence moved from localStorage to Supabase (receipts table + RLS).
// localStorageAdapter stays in the repo as the reference implementation/fallback.
export default function Vault() {
  const { user } = useAuth();

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
      </header>

      <ReceiptVault storageAdapter={supabaseAdapter} userId={user.id} />
    </div>
  );
}
