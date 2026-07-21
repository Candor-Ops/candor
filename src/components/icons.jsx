// Minimal inline icon set so the MVP ships with zero icon dependencies.
// Each icon takes standard SVG props (className, etc.). Stroke-based, 1.6 width.

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const StoreIcon = (p) => (
  <svg {...base} {...p}><path d="M3 9.5 4.2 5a1 1 0 0 1 1-.7h13.6a1 1 0 0 1 1 .7L21 9.5" /><path d="M3 9.5h18v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" /><path d="M5 12.5V20h14v-7.5" /><path d="M10 20v-4h4v4" /></svg>
);

export const VaultIcon = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M8 14h5" /><path d="M8 17h8" /></svg>
);

export const DashboardIcon = (p) => (
  <svg {...base} {...p}><rect x="3" y="3" width="8" height="9" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="11" width="8" height="10" rx="1.5" /><rect x="3" y="15" width="8" height="6" rx="1.5" /></svg>
);

export const TaxIcon = (p) => (
  <svg {...base} {...p}><path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" /><path d="M9 13l6-6" /><circle cx="9.5" cy="8.5" r="1" /><circle cx="14.5" cy="13.5" r="1" /></svg>
);

export const AccountIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
);

export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);

export const AdvisorIcon = (p) => (
  <svg {...base} {...p}><path d="M21 11.5a8 8 0 0 1-11.6 7.2L4 20l1.3-5.4A8 8 0 1 1 21 11.5Z" /><path d="M9 10h6" /><path d="M9 13.5h4" /></svg>
);

export const CheckIcon = (p) => (
  <svg {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>
);

export const ShieldIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);

export const ReceiptIcon = (p) => (
  <svg {...base} {...p}><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21Z" /><path d="M9 8h6" /><path d="M9 12h6" /></svg>
);

export const CloseIcon = (p) => (
  <svg {...base} {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

export const ArrowRight = (p) => (
  <svg {...base} {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
);

export const ClockIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
