import ReceiptVault from "../components/ReceiptVault.jsx";
import localStorageAdapter from "../lib/localStorageAdapter.js";

export default function Vault() {
  return (
    <div>
      <header className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <h1 className="font-display text-2xl font-700 tracking-tight text-stone-950">
          Receipt vault
        </h1>
        <p className="mt-1 text-stone-500">
          Every eligible expense, in one place — with the shoebox balance you can
          reimburse on your own timeline.
        </p>
      </header>

      {/* userId is a placeholder until Supabase auth lands in Week 2. */}
      <ReceiptVault storageAdapter={localStorageAdapter} userId="demo-user" />
    </div>
  );
}
