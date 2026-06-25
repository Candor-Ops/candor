import Placeholder from "./Placeholder.jsx";
import { TaxIcon } from "../components/icons.jsx";

export default function Tax() {
  return (
    <Placeholder
      Icon={TaxIcon}
      when="Coming Week 3"
      title="Form 8889, done in three steps"
      blurb="Review your receipts, confirm your distributions, and export — TurboTax CSV, H&R Block CSV, an accountant XLSX, and a printable receipt bundle. Every line maps to Form 8889 so you can see exactly where it goes. This isn't tax advice; check with a qualified professional."
      cta={{ to: "/vault", label: "Open your vault" }}
    />
  );
}
