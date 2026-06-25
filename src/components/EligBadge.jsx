/**
 * Eligibility badge.
 *
 * @param {Object}  props
 * @param {('eligible'|'lmn'|'dpc')} props.kind  Bucket signal:
 *        'eligible' = Bucket A direct (green) · 'lmn' = Bucket B, LMN required (amber)
 *        · 'dpc' = Bucket A but capped (orange).
 * @param {string}  [props.capLabel]  Cap text shown for DPC items (e.g. "$150/mo individual cap").
 * @param {('sm'|'md')} [props.size]  Visual size. Default 'sm'.
 */
export default function EligBadge({ kind = "eligible", capLabel, size = "sm" }) {
  const styles = {
    eligible: {
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      dot: "bg-emerald-500",
      label: "HSA-eligible",
    },
    lmn: {
      cls: "bg-amber-50 text-amber-700 ring-amber-600/20",
      dot: "bg-amber-500",
      label: "LMN required",
    },
    dpc: {
      cls: "bg-orange-50 text-orange-700 ring-orange-600/20",
      dot: "bg-orange-500",
      label: capLabel ? `DPC · ${capLabel}` : "DPC · capped",
    },
  };

  const s = styles[kind] ?? styles.eligible;
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${s.cls} ${pad}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
