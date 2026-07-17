// Static eligibility page generator — runs AFTER `vite build` (see package.json).
//
// Stamps out one SEO-indexable HTML page per rules-engine item at
// /eligibility/<slug>/, plus a category index, sitemap.xml, and robots.txt.
// Pages are fully static (no JS required) with JSON-LD structured data —
// Netlify serves real files, which win over the SPA redirect.
//
// Usage: node scripts/generate-eligibility-pages.mjs [outDir=dist]

import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import {
  RULES,
  RULES_VERSION,
  RULES_LAST_VERIFIED,
  BUCKET_META,
} from "../src/data/eligibilityRules.js";

const SITE = "https://candorhsa.com";
const outDir = process.argv[2] || "dist";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const BUCKET_STYLE = {
  A: { bg: "#ecfdf5", fg: "#047857", ring: "#04785733", verdict: "Yes — HSA-eligible" },
  B: { bg: "#fffbeb", fg: "#b45309", ring: "#b4530933", verdict: "Only with a Letter of Medical Necessity" },
  C: { bg: "#fef2f2", fg: "#b91c1c", ring: "#b91c1c33", verdict: "No — not HSA-eligible" },
};

const CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Inter, system-ui, -apple-system, sans-serif; color: #0c0a09; background: #fff; line-height: 1.6; }
  .wrap { max-width: 680px; margin: 0 auto; padding: 32px 20px 64px; }
  .brand { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: #0c0a09; font-weight: 700; font-size: 19px; letter-spacing: -0.02em; }
  .mark { width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, #E5484D, #F97316); display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; }
  h1 { font-size: 30px; line-height: 1.2; letter-spacing: -0.02em; margin-top: 36px; }
  .verdict { display: inline-block; margin-top: 16px; padding: 8px 14px; border-radius: 999px; font-weight: 600; font-size: 15px; }
  .summary { margin-top: 18px; font-size: 17px; color: #44403c; }
  .card { margin-top: 22px; border: 1px solid #e7e5e4; border-radius: 16px; padding: 18px 20px; }
  .card h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; margin-bottom: 6px; }
  .card p { color: #44403c; font-size: 15px; }
  .caveat { border-color: #fcd34d66; background: #fffbeb80; }
  .meta { margin-top: 22px; font-size: 13px; color: #a8a29e; }
  .related { margin-top: 30px; }
  .related h2 { font-size: 15px; margin-bottom: 10px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { text-decoration: none; font-size: 13px; color: #44403c; border: 1px solid #e7e5e4; border-radius: 999px; padding: 6px 12px; }
  .chip:hover { border-color: #a8a29e; }
  .cta { margin-top: 34px; border-radius: 16px; padding: 22px; background: linear-gradient(135deg, #E5484D0d, #F973160d); border: 1px solid #f9731633; }
  .cta a.btn { display: inline-block; margin-top: 12px; background: linear-gradient(135deg, #E5484D, #F97316); color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 18px; border-radius: 12px; }
  .foot { margin-top: 40px; padding-top: 18px; border-top: 1px solid #e7e5e4; font-size: 12px; color: #a8a29e; }
  .foot a { color: #78716c; }
  .idx-cat { margin-top: 28px; }
  .idx-cat h2 { font-size: 18px; margin-bottom: 10px; }
  ul.items { list-style: none; padding: 0; display: grid; gap: 6px; }
  ul.items a { text-decoration: none; color: #292524; font-size: 15px; }
  ul.items a:hover { text-decoration: underline; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 99px; margin-right: 8px; }
`;

function shell({ title, description, canonical, jsonLd, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
<style>${CSS}</style>
</head>
<body><div class="wrap">
<a class="brand" href="${SITE}/"><span class="mark">✓</span>Candor</a>
${body}
<div class="foot">
  <p>Informational only — not tax, legal, or medical advice. Consult a qualified tax professional about your situation. Rules version ${RULES_VERSION}, last verified ${esc(RULES_LAST_VERIFIED)}.</p>
  <p style="margin-top:6px"><a href="${SITE}/eligibility/">All eligibility answers</a> · <a href="${SITE}/">Candor — the HSA shoebox</a></p>
</div>
</div></body></html>`;
}

function itemPage(rule) {
  const style = BUCKET_STYLE[rule.bucket];
  const title = `Is ${rule.name} HSA-eligible? — ${style.verdict.split(" — ")[0]}`;
  const related = RULES.filter((r) => r.category === rule.category && r.slug !== rule.slug).slice(0, 6);
  const canonical = `${SITE}/eligibility/${rule.slug}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${rule.name} HSA-eligible?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${style.verdict}. ${rule.summary}${rule.caveats ? " " + rule.caveats : ""} (${rule.citation})`,
        },
      },
    ],
  };

  const body = `
<h1>Is ${esc(rule.name)} HSA-eligible?</h1>
<span class="verdict" style="background:${style.bg};color:${style.fg};box-shadow:inset 0 0 0 1px ${style.ring}">${style.verdict}</span>
<p class="summary">${esc(rule.summary)}</p>
<div class="card"><h2>IRS authority</h2><p>${esc(rule.citation)}${rule.effectiveFrom ? ` · effective ${esc(rule.effectiveFrom)}` : ""}</p></div>
${rule.caveats ? `<div class="card caveat"><h2>Worth knowing</h2><p>${esc(rule.caveats)}</p></div>` : ""}
${rule.bucket === "B" ? `<div class="card"><h2>How the LMN path works</h2><p>A licensed provider documents that this expense treats or mitigates a specific diagnosed condition, before you buy. Keep the letter with your receipt — it's your audit defense.</p></div>` : ""}
<p class="meta">Category: ${esc(rule.category)} · Bucket ${rule.bucket} (${esc(BUCKET_META[rule.bucket].label)})</p>
${related.length ? `<div class="related"><h2>Related answers</h2><div class="chips">${related.map((r) => `<a class="chip" href="${SITE}/eligibility/${r.slug}/">${esc(r.name)}</a>`).join("")}</div></div>` : ""}
<div class="cta">
  <strong>Paying out of pocket?</strong>
  <p style="font-size:14px;color:#57534e;margin-top:4px">Vault the receipt in Candor and reimburse yourself tax-free — this year or in 20 years. No deadline (IRS Notice 2004-50, Q&A 39).</p>
  <a class="btn" href="${SITE}/">Start your shoebox — free</a>
</div>`;

  return shell({ title, description: `${style.verdict}. ${rule.summary}`.slice(0, 155), canonical, jsonLd, body });
}

function indexPage() {
  const cats = [...new Set(RULES.map((r) => r.category))];
  const dot = { A: "#059669", B: "#d97706", C: "#dc2626" };
  const body = `
<h1>Is it HSA-eligible?</h1>
<p class="summary">Every answer cited to the IRS rule it comes from. Green = eligible, amber = needs a Letter of Medical Necessity, red = not eligible.</p>
${cats
    .map(
      (cat) => `<div class="idx-cat"><h2>${esc(cat)}</h2><ul class="items">${RULES.filter((r) => r.category === cat)
        .map((r) => `<li><a href="${SITE}/eligibility/${r.slug}/"><span class="dot" style="background:${dot[r.bucket]}"></span>${esc(r.name)}</a></li>`)
        .join("")}</ul></div>`
    )
    .join("")}
<div class="cta">
  <strong>Don't see your item?</strong>
  <p style="font-size:14px;color:#57534e;margin-top:4px">Ask Candor's eligibility advisor inside the app — every answer grounded in these same rules.</p>
  <a class="btn" href="${SITE}/">Open Candor — free</a>
</div>`;
  return shell({
    title: "Is it HSA-eligible? Every answer, with IRS citations | Candor",
    description: `${RULES.length} HSA eligibility answers with IRS citations — OTC meds, vision, dental, telehealth, DPC, fitness, and more. Last verified ${RULES_LAST_VERIFIED}.`,
    canonical: `${SITE}/eligibility/`,
    jsonLd: null,
    body,
  });
}

function sitemap() {
  const urls = [
    `${SITE}/`,
    `${SITE}/eligibility/`,
    ...RULES.map((r) => `${SITE}/eligibility/${r.slug}/`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${RULES_VERSION}</lastmod></url>`).join("\n")}
</urlset>
`;
}

// ---------------------------------------------------------------------------
async function main() {
  try {
    await access(outDir);
  } catch {
    console.error(`Output dir "${outDir}" doesn't exist — run vite build first.`);
    process.exit(1);
  }

  for (const rule of RULES) {
    const dir = join(outDir, "eligibility", rule.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), itemPage(rule));
  }
  await writeFile(join(outDir, "eligibility", "index.html"), indexPage());
  await writeFile(join(outDir, "sitemap.xml"), sitemap());
  await writeFile(
    join(outDir, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`
  );
  console.log(`✓ Generated ${RULES.length} eligibility pages + index + sitemap (rules ${RULES_VERSION})`);
}

main();
