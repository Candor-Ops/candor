import Placeholder from "./Placeholder.jsx";
import { DashboardIcon } from "../components/icons.jsx";

export default function Dashboard() {
  return (
    <Placeholder
      Icon={DashboardIcon}
      when="Coming Week 3"
      title="Your HSA, at a glance"
      blurb="One view of your balance, contributions against the annual limit, invested-vs-cash split, and your shoebox total. It connects to your custodian read-only via Plaid — Candor never moves your money."
      cta={{ to: "/store", label: "Browse the store" }}
    />
  );
}
