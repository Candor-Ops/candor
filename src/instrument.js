// Sentry must be initialized BEFORE the app renders, so this file is imported
// first in main.jsx. Docs: https://docs.sentry.io/platforms/javascript/guides/react/
//
// PRIVACY NOTE — Candor handles sensitive health + financial data and the whole
// pitch is "no ads, no data selling." This config is deliberately conservative:
//   - Session Replay records ONLY on errors (no always-on session recording), and
//     masks all text + blocks all media so receipt amounts, card last-4, merchant
//     names, and emails never reach Sentry as readable content.
//   - beforeSend scrubs obvious PII from the URL/query before any event is sent.
// Revisit these settings with privacy counsel before public launch.

import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

// Only initialize when a DSN is configured (keeps local dev quiet unless you opt in).
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
    ],

    // Performance tracing. Dial down (e.g. 0.2) once real traffic arrives.
    tracesSampleRate: import.meta.env.MODE === "production" ? 0.2 : 1.0,
    tracePropagationTargets: ["localhost", /^https:\/\/candorhsa\.com/],

    // Replay: never record normal sessions; capture only when an error fires.
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,

    // Don't ship noisy local errors.
    enabled: import.meta.env.MODE !== "development" || Boolean(dsn),

    // Last-line PII scrub. Keeps query strings (which may carry emails from the
    // waitlist) out of Sentry even if something accidentally puts them there.
    beforeSend(event) {
      try {
        if (event.request?.url) {
          event.request.url = event.request.url.split("?")[0];
        }
        if (event.request?.query_string) {
          delete event.request.query_string;
        }
      } catch {
        // never let scrubbing throw
      }
      return event;
    },
  });
}

export default Sentry;
