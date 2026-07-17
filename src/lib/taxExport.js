// Tax export engine (Week 5) — pure functions, no React, node-testable.
//
// Feeds the Form 8889 wizard. Distributions = receipts paid from the HSA
// card plus out-of-pocket receipts marked reimbursed in the tax year. The
// deferred shoebox is NOT a distribution — it's reported nowhere on 8889
// until the user actually reimburses (that's the whole strategy).
//
// Outputs: TurboTax CSV, H&R Block CSV, accountant workbook (Excel 2003 XML
// — opens in Excel/Numbers/Sheets with zero dependencies; true .xlsx is a
// post-MVP upgrade), printable HTML receipt bundle. Accountant workbook
// carries the "Prepared with Candor" CPA referral footer (PRD distribution
// hook). All informational — not tax advice.

const usd = (n) => (Number(n) || 0).toFixed(2);

export function receiptsForYear(receipts, year) {
  const y = String(year);
  const inYear = (receipts ?? []).filter((r) => String(r.date).startsWith(y));
  return {
    fromHsaCard: inYear.filter((r) => r.paySource === "hsa-card"),
    reimbursed: inYear.filter((r) => r.status === "reimbursed"),
    deferred: inYear.filter(
      (r) => r.paySource === "out-of-pocket" && r.status === "deferred" && r.hsaOpenAtTime
    ),
  };
}

/** Distributions + qualified expense totals → Form 8889 line mapping. */
export function form8889Summary(receipts, year) {
  const { fromHsaCard, reimbursed, deferred } = receiptsForYear(receipts, year);
  const distributions = [...fromHsaCard, ...reimbursed];
  const total = (list) => list.reduce((s, r) => s + (Number(r.total) || 0), 0);
  return {
    year,
    distributionRows: distributions,
    deferredRows: deferred,
    line14a: total(distributions), // total distributions (should match 1099-SA)
    line15: total(distributions), // qualified medical expenses (all rows are QMEs)
    line16: 0, // taxable amount — zero when 15 covers 14a
    deferredTotal: total(deferred),
  };
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

export function turboTaxCsv(summary) {
  return csv([
    ["Date", "Description", "Category", "Amount", "Payment Source", "Qualified Medical Expense"],
    ...summary.distributionRows.map((r) => [
      r.date,
      r.product || "Medical expense",
      r.category || "Medical",
      usd(r.total),
      r.paySource === "hsa-card" ? "HSA distribution" : "HSA reimbursement",
      "Yes",
    ]),
    [],
    ["Form 8889 Line 14a (total distributions)", "", "", usd(summary.line14a)],
    ["Form 8889 Line 15 (qualified medical expenses)", "", "", usd(summary.line15)],
    ["Form 8889 Line 16 (taxable amount)", "", "", usd(summary.line16)],
  ]);
}

export function hrBlockCsv(summary) {
  return csv([
    ["Transaction Date", "Payee", "Expense Type", "Distribution Amount", "Qualified (Y/N)"],
    ...summary.distributionRows.map((r) => [
      r.date,
      r.merchant || r.product || "Medical provider",
      r.category || "Medical",
      usd(r.total),
      "Y",
    ]),
    [],
    ["TOTAL DISTRIBUTIONS (8889 line 14a)", "", "", usd(summary.line14a), ""],
    ["QUALIFIED MEDICAL EXPENSES (8889 line 15)", "", "", usd(summary.line15), ""],
  ]);
}

// ---------------------------------------------------------------------------
// Accountant workbook — Excel 2003 SpreadsheetML (no dependencies).
// ---------------------------------------------------------------------------
const xmlEsc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function accountantWorkbookXml(summary, { referralUrl = "https://candorhsa.com" } = {}) {
  const cell = (v, type = "String") => `<Cell><Data ss:Type="${type}">${xmlEsc(v)}</Data></Cell>`;
  const row = (cells) => `<Row>${cells.join("")}</Row>`;

  const distRows = summary.distributionRows
    .map((r) =>
      row([
        cell(r.date),
        cell(r.product || "Medical expense"),
        cell(r.merchant || ""),
        cell(r.category || ""),
        cell(r.paySource === "hsa-card" ? "HSA card" : "Reimbursed from HSA"),
        cell(Number(r.total) || 0, "Number"),
      ])
    )
    .join("");

  const defRows = summary.deferredRows
    .map((r) =>
      row([
        cell(r.date),
        cell(r.product || "Medical expense"),
        cell(r.merchant || ""),
        cell(r.category || ""),
        cell("Deferred — NOT distributed (no 8889 impact this year)"),
        cell(Number(r.total) || 0, "Number"),
      ])
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Form 8889 (${summary.year})">
<Table>
${row([cell(`Candor HSA tax workbook — ${summary.year}`)])}
${row([cell("Client HSA distributions and qualified medical expenses. Cross-check line 14a against the custodian's 1099-SA.")])}
${row([cell("")])}
${row([cell("Form 8889 line"), cell("Description"), cell(""), cell(""), cell(""), cell("Amount")])}
${row([cell("14a"), cell("Total distributions"), cell(""), cell(""), cell(""), cell(summary.line14a, "Number")])}
${row([cell("15"), cell("Unreimbursed qualified medical expenses"), cell(""), cell(""), cell(""), cell(summary.line15, "Number")])}
${row([cell("16"), cell("Taxable HSA distributions"), cell(""), cell(""), cell(""), cell(summary.line16, "Number")])}
${row([cell("")])}
${row([cell("DISTRIBUTIONS"), cell(""), cell(""), cell(""), cell(""), cell("")])}
${row([cell("Date"), cell("Item"), cell("Merchant"), cell("Category"), cell("Type"), cell("Amount")])}
${distRows}
${row([cell("")])}
${row([cell("DEFERRED SHOEBOX (informational — future tax-free reimbursements)"), cell(""), cell(""), cell(""), cell(""), cell("")])}
${row([cell("Date"), cell("Item"), cell("Merchant"), cell("Category"), cell("Status"), cell("Amount")])}
${defRows}
${row([cell("")])}
${row([cell(`Prepared with Candor (${referralUrl}) — the client-side HSA system of record. Receipts and audit trail available on request.`)])}
${row([cell("Informational only — not tax advice. Verify against source documents.")])}
</Table>
</Worksheet>
</Workbook>`;
}

// ---------------------------------------------------------------------------
// Printable HTML receipt bundle (audit defense)
// ---------------------------------------------------------------------------
export function receiptBundleHtml(summary, { email = "" } = {}) {
  const section = (title, rows) => `
  <h2>${xmlEsc(title)}</h2>
  <table><thead><tr><th>Date</th><th>Item</th><th>Merchant</th><th>Category</th><th>Card</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${rows
    .map(
      (r) =>
        `<tr><td>${xmlEsc(r.date)}</td><td>${xmlEsc(r.product || "")}</td><td>${xmlEsc(r.merchant || "")}</td><td>${xmlEsc(r.category || "")}</td><td>${xmlEsc(r.cardLast4 ? `${r.cardBrand} ••${r.cardLast4}` : "")}</td><td style="text-align:right">$${usd(r.total)}</td></tr>`
    )
    .join("")}</tbody></table>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Candor receipt bundle ${summary.year}</title>
<style>body{font-family:system-ui,sans-serif;color:#1c1917;max-width:800px;margin:24px auto;padding:0 16px}h1{letter-spacing:-0.02em}h2{margin-top:28px;font-size:16px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #e7e5e4;padding:6px 8px;text-align:left}tfoot td{font-weight:600}.meta{color:#78716c;font-size:12px}@media print{a{display:none}}</style>
</head><body>
<h1>HSA receipt bundle — ${summary.year}</h1>
<p class="meta">Prepared with Candor (candorhsa.com)${email ? ` for ${xmlEsc(email)}` : ""} on ${new Date().toISOString().slice(0, 10)}. Keep with your tax records. Not tax advice.</p>
<h2>Form 8889 summary</h2>
<table><tbody>
<tr><td>Line 14a — total distributions</td><td style="text-align:right">$${usd(summary.line14a)}</td></tr>
<tr><td>Line 15 — qualified medical expenses</td><td style="text-align:right">$${usd(summary.line15)}</td></tr>
<tr><td>Line 16 — taxable amount</td><td style="text-align:right">$${usd(summary.line16)}</td></tr>
</tbody></table>
${section(`Distributions (${summary.distributionRows.length})`, summary.distributionRows)}
${section(`Deferred shoebox — no distribution taken (${summary.deferredRows.length})`, summary.deferredRows)}
<p class="meta">Deferred expenses are documented for FUTURE tax-free reimbursement under IRS Notice 2004-50 Q&A 39 (no reimbursement deadline). They do not appear on this year's Form 8889.</p>
<p><a href="javascript:print()">Print this bundle</a></p>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Browser download helper
// ---------------------------------------------------------------------------
export function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
