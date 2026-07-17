// AI Eligibility Advisor (PRD Feature 5) — rules-engine-FIRST architecture.
//
// Deterministic path: every question is matched against the versioned rules
// database (instant, cited, free, works signed-out). The LLM layer is a
// FALLBACK for unmatched free-form questions only, requires sign-in, and is
// grounded in the same rules — it never freestyles eligibility claims.
// Every answer links to the public eligibility page (SEO reinforcement).

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import {
  findRule,
  searchRules,
  RULES_VERSION,
  BUCKET_META,
} from "../data/eligibilityRules.js";
import { ShieldIcon } from "../components/icons.jsx";

const EXAMPLES = [
  "Is a gym membership HSA-eligible?",
  "Can I buy sunscreen with my HSA?",
  "Is Ozempic covered?",
  "What about an Oura ring?",
  "Are massages eligible?",
];

const BUCKET_STYLES = {
  A: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  B: "bg-amber-50 text-amber-700 ring-amber-600/20",
  C: "bg-red-50 text-red-700 ring-red-600/20",
};

// Strip filler words so "can I buy sunscreen with my HSA" matches "sunscreen".
function extractTopic(q) {
  return String(q)
    .toLowerCase()
    .replace(/[?.!,\-]/g, " ")
    .replace(
      /\b(is|are|a|an|the|my|can|i|buy|use|with|hsa|fsa|funds?|money|eligible|covered|for|what|about|does|do|qualify|qualifies|reimburse|reimbursable|pay|purchase|get|it|on|from|kids?|husband|wife|spouse|son|daughter)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

// Naive depluralizer for lookup fallback ("massages" → "massage").
const singular = (s) => s.replace(/s\b/g, "");

export default function Advisor() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  function push(msg) {
    setMessages((m) => [...m, msg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function ask(raw) {
    const question = String(raw ?? input).trim();
    if (!question || busy) return;
    setInput("");
    push({ role: "user", text: question });

    // ---- Deterministic rules-engine path (always first) ----
    const topic = extractTopic(question);
    const rule = findRule(topic) || findRule(singular(topic)) || findRule(question);
    if (rule) {
      const related = searchRules(topic).filter((r) => r.slug !== rule.slug).slice(0, 3);
      push({ role: "bot", kind: "rule", rule, related });
      return;
    }
    const near = searchRules(topic).length ? searchRules(topic) : searchRules(singular(topic));
    if (near.length) {
      push({ role: "bot", kind: "suggestions", question, suggestions: near.slice(0, 5) });
      return;
    }

    // ---- LLM fallback (grounded, signed-in only) ----
    if (!user) {
      push({
        role: "bot",
        kind: "text",
        text: "That one isn't in my rules database yet. Sign in and I can reason about free-form questions — or browse every cited answer at /eligibility/.",
      });
      return;
    }
    setBusy(true);
    push({ role: "bot", kind: "thinking" });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/.netlify/functions/advisor-ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question }),
      });
      const json = await res.json().catch(() => ({}));
      setMessages((m) => m.filter((x) => x.kind !== "thinking"));
      if (!res.ok) throw new Error(json.error || "Advisor unavailable.");
      push({ role: "bot", kind: "text", text: json.answer, slugs: json.matchedSlugs || [] });
    } catch (err) {
      setMessages((m) => m.filter((x) => x.kind !== "thinking"));
      push({
        role: "bot",
        kind: "text",
        text: `${err.message} In the meantime, the full cited database is at /eligibility/.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-2xl font-700 tracking-tight text-stone-950">
          Eligibility advisor
        </h1>
        <p className="mt-1 text-stone-500">
          Ask whether anything is HSA-eligible. Answers come from a versioned
          rules database with IRS citations — never guesses.
        </p>
      </header>

      <div className="mt-6 flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <ShieldIcon className="h-4 w-4 text-candor-red" /> Try one of these
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => ask(ex)}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 hover:border-stone-300"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="candor-gradient max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-medium text-white shadow-sm">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <BotMessage m={m} onAsk={ask} />
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="sticky bottom-16 mt-6 flex gap-2 rounded-2xl border border-stone-200 bg-white/95 p-2 shadow-lg backdrop-blur md:bottom-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Ask anything — "Is acupuncture eligible?"'
          className="flex-1 rounded-xl border-0 bg-transparent px-3 py-2 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="candor-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          Ask
        </button>
      </form>

      <p className="mt-3 text-center text-[11px] text-stone-400">
        Informational, not tax advice. Rules v{RULES_VERSION} · Browse all
        answers at{" "}
        <a href="/eligibility/" className="underline">
          /eligibility
        </a>
      </p>
    </div>
  );
}

function BotMessage({ m, onAsk }) {
  if (m.kind === "thinking") {
    return (
      <p className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-400 shadow-sm">
        Checking the edge cases…
      </p>
    );
  }

  if (m.kind === "rule") {
    const { rule, related } = m;
    return (
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-stone-200 bg-white p-4 shadow-sm">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${BUCKET_STYLES[rule.bucket]}`}
        >
          {BUCKET_META[rule.bucket].label}
        </span>
        <p className="font-display mt-2 font-600 text-stone-950">{rule.name}</p>
        <p className="mt-1 text-sm text-stone-600">{rule.summary}</p>
        {rule.caveats && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-600/20">
            {rule.caveats}
          </p>
        )}
        <p className="mt-2 text-xs text-stone-400">
          {rule.citation} ·{" "}
          <a
            href={`/eligibility/${rule.slug}/`}
            className="underline hover:text-stone-600"
          >
            full answer page
          </a>
        </p>
        {related?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {related.map((r) => (
              <button
                key={r.slug}
                onClick={() => onAsk(r.name)}
                className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-500 hover:border-stone-300"
              >
                {r.name}?
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (m.kind === "suggestions") {
    return (
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-stone-600">
          I don't have an exact match — did you mean one of these?
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.suggestions.map((r) => (
            <button
              key={r.slug}
              onClick={() => onAsk(r.name)}
              className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:border-stone-300"
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-stone-200 bg-white p-4 shadow-sm">
      <p className="whitespace-pre-wrap text-sm text-stone-600">{m.text}</p>
      {m.slugs?.length > 0 && (
        <p className="mt-2 text-xs text-stone-400">
          Sources:{" "}
          {m.slugs.map((s, i) => (
            <span key={s}>
              {i > 0 && " · "}
              <a href={`/eligibility/${s}/`} className="underline">
                {s}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
