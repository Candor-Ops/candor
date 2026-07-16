// CSV statement import + eligibility classification (Week 3).
//
// The CSV path is the Plaid-less fallback for the Retroactive Expense Finder:
// users export transactions from their bank/card site and upload the file.
// We parse generically (column auto-detection), classify each row against the
// versioned heuristics in src/data/eligibilityHeuristics.js, and hand back
// CANDIDATES for the user to confirm — never auto-asserted (guardrail).
//
// Pure functions, no React — unit-testable in plain node.

import {
  MERCHANT_PATTERNS,
  EXCLUDE_PATTERNS,
  HEURISTICS_VERSION,
} from "../data/eligibilityHeuristics.js";

export { HEURISTICS_VERSION };

// ---------------------------------------------------------------------------
// CSV parsing — handles quoted fields, escaped quotes (""), CRLF, BOM.
// ---------------------------------------------------------------------------
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = String(text ?? "").replace(/^﻿/, ""); // strip BOM

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

// ---------------------------------------------------------------------------
// Column detection — banks disagree on headers; find date/description/amount.
// ---------------------------------------------------------------------------
const DATE_HEADERS = /^(date|trans(action)?\s*date|posted?\s*(date)?|posting\s*date)$/i;
const DESC_HEADERS = /^(description|merchant|name|payee|memo|details?|transaction)$/i;
const AMOUNT_HEADERS = /^(amount|debit|transaction\s*amount|charge)$/i;

function looksLikeDate(v) {
  return (
    /^\d{4}-\d{2}-\d{2}/.test(v) || // ISO
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(v) // US
  );
}
function looksLikeAmount(v) {
  return /^-?\$?\(?\d[\d,]*(\.\d{1,2})?\)?$/.test(String(v).trim());
}

export function detectColumns(rows) {
  if (!rows.length) return null;
  const header = rows[0].map((h) => h.trim());
  let dateIdx = header.findIndex((h) => DATE_HEADERS.test(h));
  let descIdx = header.findIndex((h) => DESC_HEADERS.test(h));
  let amountIdx = header.findIndex((h) => AMOUNT_HEADERS.test(h));
  const hasHeader = dateIdx !== -1 || descIdx !== -1 || amountIdx !== -1;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const sample = dataRows.slice(0, 5);

  // Fall back to shape-sniffing on the sample rows.
  if (dateIdx === -1) {
    dateIdx = indexWhere(sample, looksLikeDate);
  }
  if (amountIdx === -1) {
    amountIdx = indexWhere(sample, looksLikeAmount, dateIdx);
  }
  if (descIdx === -1) {
    // Longest average text field that isn't date/amount.
    let best = -1;
    let bestLen = 0;
    const width = Math.max(...sample.map((r) => r.length), 0);
    for (let i = 0; i < width; i++) {
      if (i === dateIdx || i === amountIdx) continue;
      const avg =
        sample.reduce((sum, r) => sum + String(r[i] ?? "").trim().length, 0) /
        (sample.length || 1);
      if (avg > bestLen) {
        bestLen = avg;
        best = i;
      }
    }
    descIdx = best;
  }

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) return null;
  return { dateIdx, descIdx, amountIdx, dataRows };
}

function indexWhere(sample, test, skipIdx = -1) {
  if (!sample.length) return -1;
  const width = Math.max(...sample.map((r) => r.length));
  for (let i = 0; i < width; i++) {
    if (i === skipIdx) continue;
    if (sample.every((r) => test(String(r[i] ?? "").trim()))) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------
export function normalizeDate(v) {
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    const yyyy = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${yyyy}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  return null;
}

export function normalizeAmount(v) {
  let s = String(v).trim().replace(/[$,\s]/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
export function classifyDescription(description) {
  const d = String(description ?? "");
  if (EXCLUDE_PATTERNS.some((p) => p.test(d))) return null;
  for (const rule of MERCHANT_PATTERNS) {
    if (rule.pattern.test(d)) {
      return { category: rule.category, confidence: rule.confidence, reason: rule.reason };
    }
  }
  return null;
}

/**
 * Plaid transactions → candidate expenses (same shape as the CSV path).
 * Positive amounts are money out (Plaid convention). Heuristics match on the
 * merchant name; Plaid's own MEDICAL categorization backstops as medium
 * confidence when our patterns miss.
 */
export function candidatesFromTransactions(transactions, hsaEstablishedDate = null) {
  const candidates = [];
  let skippedPreHsa = 0;
  for (const t of transactions ?? []) {
    if (t.pending) continue;
    const amount = Number(t.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue; // outflows only
    const date = normalizeDate(t.date);
    const description = String(t.description ?? "").trim();
    if (!date || !description) continue;

    let match = classifyDescription(description);
    if (!match && t.plaidCategory === "MEDICAL") {
      match = {
        category: "Other",
        confidence: "medium",
        reason: "Bank categorized as medical",
      };
    }
    if (!match) continue;

    if (hsaEstablishedDate && date < hsaEstablishedDate) {
      skippedPreHsa++;
      continue;
    }

    candidates.push({
      key: `${date}|${description}|${amount}`,
      date,
      description: t.institution ? `${description} (${t.institution})` : description,
      amount,
      category: match.category,
      confidence: match.confidence,
      reason: match.reason,
    });
  }

  const seen = new Set();
  const deduped = candidates
    .filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true)))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return { candidates: deduped, skippedPreHsa, rowCount: (transactions ?? []).length, error: null };
}

/**
 * Full pipeline: CSV text → candidate expenses.
 *
 * @param {string} text                CSV file contents
 * @param {string|null} hsaEstablishedDate  "YYYY-MM-DD" — candidates dated
 *        before it are excluded entirely (hard IRS rule) and counted.
 * @returns {{ candidates, skippedPreHsa, rowCount, error }}
 */
export function findCandidates(text, hsaEstablishedDate = null) {
  const rows = parseCsv(text);
  if (!rows.length) return { candidates: [], skippedPreHsa: 0, rowCount: 0, error: "The file looks empty." };

  const cols = detectColumns(rows);
  if (!cols) {
    return {
      candidates: [],
      skippedPreHsa: 0,
      rowCount: rows.length,
      error:
        "Couldn't find date, description, and amount columns. Export a standard transaction CSV from your bank and try again.",
    };
  }

  const candidates = [];
  let skippedPreHsa = 0;
  for (const r of cols.dataRows) {
    const date = normalizeDate(r[cols.dateIdx]);
    const description = String(r[cols.descIdx] ?? "").trim();
    const amountRaw = normalizeAmount(r[cols.amountIdx]);
    if (!date || !description || amountRaw === null) continue;

    // Charges only. Card exports list charges positive; bank exports list
    // debits negative — treat either sign as a charge, use the magnitude.
    const amount = Math.abs(amountRaw);
    if (amount === 0) continue;

    const match = classifyDescription(description);
    if (!match) continue;

    // Hard IRS rule: expenses before HSA establishment are not reimbursable.
    if (hsaEstablishedDate && date < hsaEstablishedDate) {
      skippedPreHsa++;
      continue;
    }

    candidates.push({
      key: `${date}|${description}|${amount}`,
      date,
      description,
      amount,
      category: match.category,
      confidence: match.confidence,
      reason: match.reason,
    });
  }

  // Newest first; de-dupe identical rows (same key).
  const seen = new Set();
  const deduped = candidates
    .filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true)))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return { candidates: deduped, skippedPreHsa, rowCount: cols.dataRows.length, error: null };
}
