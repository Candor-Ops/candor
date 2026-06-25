import { Link } from "react-router-dom";
import { DashboardIcon } from "../components/icons.jsx";

/** Shared "coming soon" page — honest about what lands when, with a useful next step. */
export function Placeholder({ Icon = DashboardIcon, title, when, blurb, cta }) {
  return (
    <div className="mx-auto grid min-h-[60dvh] max-w-xl place-items-center px-6 text-center">
      <div>
        <div className="candor-gradient mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm">
          <Icon className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-candor-red">
          {when}
        </p>
        <h1 className="font-display mt-1 text-2xl font-700 tracking-tight text-stone-950">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-prose text-stone-500">{blurb}</p>
        {cta && (
          <Link
            to={cta.to}
            className="mt-6 inline-flex rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export default Placeholder;
