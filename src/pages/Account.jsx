import Placeholder from "./Placeholder.jsx";
import { AccountIcon } from "../components/icons.jsx";

export default function Account() {
  return (
    <Placeholder
      Icon={AccountIcon}
      when="Coming Week 2"
      title="Accounts & sign-in"
      blurb="Email and magic-link sign-in arrives next week, backed by Supabase with row-level security so your receipts are yours alone. For now, the vault saves to this device. No ads, ever — and we never sell or share your data."
      cta={{ to: "/", label: "Join the waitlist" }}
    />
  );
}
