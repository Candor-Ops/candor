import { useEffect, useMemo, useState, useCallback } from "react";
import { ReceiptIcon, CloseIcon, CheckIcon, ClockIcon } from "./icons.jsx";

/**
 * ReceiptVault — capture out-of-pocket medical spend and track the "shoebox"
 * deferred-reimbursement balance (IRS Notice 2004-50 Q&A 39: no deadline to
 * reimburse, as long as the HSA was open when the expense was incurred).
 *
 * @param {Object} props
 * @param {{load:(userId:string)=>Promise<any[]>, save:(userId:string, list:any[])=>Promise<void>}} props.storageAdapter
 *        Persistence backend. Supabase in Week 2; localStorage remains the fallback.
 * @param {string} [props.userId]   Owner key (Supabase user UUID).
 * @param {Object} [props.prefill]  Optional receipt fields to pre-open the capture
 *        form with — used by checkout auto-capture in Week 3.
 *
 * GUARDRAIL: the capture form stores card brand + last 4 digits ONLY. It never
 * accepts or stores a full card number, expiry, or CVV.
 *
 * MONEY MODEL: "Total paid" is the load-bearing, required number — what the
 * user actually paid out of pocket AFTER discounts (that's the IRS-reimbursable
 * amount). Subtotal / discount / tax are optional context that suggest the total.
 */

const CATEGORIES = [
  "OTC",
  "Vision",
  "Dental",
  "Diagnostics",
  "First Aid",
  "Family",
  "DPC",
  "Telehealth",
  "Recovery",
  "Other",
];
const CARD_BRANDS = ["Visa", "Mastercard", "Amex", "Discover", "HSA debit", "Other"];

const usd = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

// Forgiving money parser: accepts "$1,234.50", "12,50", " 15 ", etc.
// Returns a number, or null when the field is empty/unparseable.
export function parseMoney(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/[$\s]/g, "").replace(/,/g, (m, i, str) =>
    // "1,234.56" thousands → drop; "12,50" decimal comma → dot
    str.includes(".") ? "" : str.indexOf(",") === str.length - 3 ? "." : ""
  );
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Suggested total = subtotal − discount + tax (only when at least one part is set).
function suggestedTotal(form) {
  const sub = parseMoney(form.subtotal);
  const disc = parseMoney(form.discount);
  const tax = parseMoney(form.tax);
  if (sub === null && disc === null && tax === null) return null;
  const n = (sub ?? 0) - (disc ?? 0) + (tax ?? 0);
  return n >= 0 ? Math.round(n * 100) / 100 : null;
}

const blankForm = {
  product: "",
  merchant: "",
  date: new Date().toISOString().slice(0, 10),
  subtotal: "",
  discount: "",
  tax: "",
  total: "",
  category: "OTC",
  paySource: "out-of-pocket", // 'out-of-pocket' | 'hsa-card'
  cardBrand: "Visa",
  cardLast4: "",
  hsaOpenAtTime: true,
  notes: "",
  photo: null, // data URL (fresh) or signed URL (loaded from server)
  photoPath: null, // Storage object path — round-trips through the adapter
};

// Downscale a chosen photo to a small thumbnail before storing (honors the
// "receipt photos are downscaled client-side" guardrail and protects storage quota).
function downscaleImage(file, maxDim = 700, quality = 0.6) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB cap for PDF attachments

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Attachment type helper — works for fresh data URLs and loaded photoPaths.
export function isPdfAttachment(r) {
  return (
    (typeof r.photoPath === "string" && r.photoPath.endsWith(".pdf")) ||
    (typeof r.photo === "string" && r.photo.startsWith("data:application/pdf"))
  );
}

export default function ReceiptVault({
  storageAdapter,
  userId = "demo-user",
  prefill,
  hsaEstablishedDate = null, // "YYYY-MM-DD" from the user's profile (or null)
}) {
  const [receipts, setReceipts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(Boolean(prefill));
  const [filter, setFilter] = useState("all"); // all | deferred | reimbursed
  const [form, setForm] = useState({ ...blankForm, ...(prefill || {}) });
  const [editingId, setEditingId] = useState(null);
  const [totalTouched, setTotalTouched] = useState(false);
  const [hsaTouched, setHsaTouched] = useState(false);
  const [photoError, setPhotoError] = useState(null);

  // Was the HSA open on a given expense date? ("YYYY-MM-DD" strings compare
  // correctly lexicographically.) Without a profile date, default to open.
  const hsaOpenFor = useCallback(
    (expenseDate) =>
      hsaEstablishedDate && expenseDate ? expenseDate >= hsaEstablishedDate : true,
    [hsaEstablishedDate]
  );

  // Load persisted receipts on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      const list = storageAdapter ? await storageAdapter.load(userId) : [];
      if (alive) {
        setReceipts(Array.isArray(list) ? list : []);
        setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storageAdapter, userId]);

  // Persist whenever receipts change (after initial load).
  useEffect(() => {
    if (loaded && storageAdapter) storageAdapter.save(userId, receipts);
  }, [receipts, loaded, storageAdapter, userId]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-suggest the total while the user hasn't typed in the Total field.
  useEffect(() => {
    if (totalTouched) return;
    const s = suggestedTotal(form);
    if (s !== null && String(s) !== String(form.total)) {
      setForm((f) => ({ ...f, total: String(s) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subtotal, form.discount, form.tax, totalTouched]);

  // Auto-set "HSA was open" from the expense date vs. the profile's
  // establishment date, until the user toggles the checkbox themselves.
  useEffect(() => {
    if (hsaTouched || !hsaEstablishedDate) return;
    const open = hsaOpenFor(form.date);
    if (open !== form.hsaOpenAtTime) {
      setForm((f) => ({ ...f, hsaOpenAtTime: open }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, hsaTouched, hsaEstablishedDate]);

  // Deferred (reimbursable) balance: out-of-pocket, HSA-open-at-time, not yet reimbursed.
  const deferred = useMemo(
    () =>
      receipts
        .filter(
          (r) =>
            r.paySource === "out-of-pocket" &&
            r.hsaOpenAtTime &&
            r.status !== "reimbursed"
        )
        .reduce((sum, r) => sum + (Number(r.total) || 0), 0),
    [receipts]
  );
  const reimbursedTotal = useMemo(
    () =>
      receipts
        .filter((r) => r.status === "reimbursed")
        .reduce((sum, r) => sum + (Number(r.total) || 0), 0),
    [receipts]
  );
  const excludedCount = useMemo(
    () =>
      receipts.filter(
        (r) =>
          r.paySource === "out-of-pocket" &&
          !r.hsaOpenAtTime &&
          r.status !== "reimbursed"
      ).length,
    [receipts]
  );

  const visible = useMemo(() => {
    const sorted = [...receipts].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (filter === "deferred") return sorted.filter((r) => r.status !== "reimbursed");
    if (filter === "reimbursed") return sorted.filter((r) => r.status === "reimbursed");
    return sorted;
  }, [receipts, filter]);

  const onPhoto = useCallback(async (file) => {
    setPhotoError(null);
    if (!file) return setField("photo", null);
    if (file.type === "application/pdf") {
      if (file.size > MAX_PDF_BYTES) {
        setPhotoError("That PDF is over 5 MB — try a smaller export or a photo instead.");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      setField("photo", dataUrl);
      return;
    }
    const thumb = await downscaleImage(file);
    setField("photo", thumb);
  }, []);

  function openAdd() {
    setForm({ ...blankForm, hsaOpenAtTime: hsaOpenFor(blankForm.date) });
    setEditingId(null);
    setTotalTouched(false);
    setHsaTouched(false);
    setPhotoError(null);
    setShowForm(true);
  }

  function openEdit(r) {
    setHsaTouched(true); // editing: keep the saved flag unless the user changes it
    setForm({
      ...blankForm,
      ...r,
      subtotal: r.subtotal ?? "",
      discount: r.discount ?? "",
      tax: r.tax ?? "",
      total: r.total ?? "",
    });
    setEditingId(r.id);
    setTotalTouched(true); // editing: don't clobber the saved total with suggestions
    setPhotoError(null);
    setShowForm(true);
  }

  function submitReceipt(e) {
    e.preventDefault();
    const total = parseMoney(form.total) ?? suggestedTotal(form);
    if (total === null || total < 0) return; // input is required; belt and suspenders

    const base = {
      ...form,
      total,
      subtotal: parseMoney(form.subtotal) ?? "",
      discount: parseMoney(form.discount) ?? "",
      tax: parseMoney(form.tax) ?? "",
      cardLast4: (form.cardLast4 || "").replace(/\D/g, "").slice(0, 4),
    };

    if (editingId) {
      setReceipts((list) =>
        list.map((r) => {
          if (r.id !== editingId) return r;
          // Preserve reimbursed status unless the pay source changed.
          const status =
            base.paySource === "hsa-card"
              ? "paid-from-hsa"
              : r.status === "reimbursed"
                ? "reimbursed"
                : "deferred";
          return { ...r, ...base, id: r.id, createdAt: r.createdAt, status };
        })
      );
    } else {
      const receipt = {
        ...base,
        id: `r_${Date.now()}`,
        status: form.paySource === "hsa-card" ? "paid-from-hsa" : "deferred",
        createdAt: new Date().toISOString(),
      };
      setReceipts((list) => [receipt, ...list]);
    }

    setForm({ ...blankForm });
    setEditingId(null);
    setTotalTouched(false);
    setShowForm(false);
  }

  function toggleReimbursed(id) {
    setReceipts((list) =>
      list.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "reimbursed" ? "deferred" : "reimbursed" }
          : r
      )
    );
  }

  function remove(id) {
    setReceipts((list) => list.filter((r) => r.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Shoebox balance */}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <p className="text-sm font-medium text-stone-500">
            Ready to reimburse, tax-free
          </p>
          <p className="font-display mt-1 text-4xl font-700 tracking-tight text-stone-950">
            {usd(deferred)}
          </p>
          <p className="mt-2 max-w-prose text-sm text-stone-500">
            Out-of-pocket medical spend you can pull from your HSA whenever you like.
            There's no IRS deadline as long as your HSA was open when you paid
            <span className="text-stone-400"> (Notice 2004-50, Q&A 39)</span>.
          </p>
          {excludedCount > 0 && (
            <p className="mt-2 inline-flex rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
              {excludedCount} receipt{excludedCount > 1 ? "s" : ""} not counted —
              marked as paid before your HSA was open. Edit a receipt to change that.
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 divide-x divide-stone-100 text-center">
          <Stat label="Receipts" value={receipts.length} />
          <Stat label="Reimbursed" value={usd(reimbursedTotal)} />
          <div className="flex items-center justify-center p-4">
            <button
              onClick={openAdd}
              className="candor-gradient w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Add a receipt
            </button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-2">
        {[
          ["all", "All"],
          ["deferred", "Deferred"],
          ["reimbursed", "Reimbursed"],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
              filter === v
                ? "bg-stone-950 text-white ring-stone-950"
                : "bg-white text-stone-600 ring-stone-200 hover:ring-stone-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Receipt list */}
      <div className="mt-4 space-y-3">
        {!loaded ? (
          <EmptyState>Loading your vault…</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>
            No receipts yet. Add one above — it'll stay here across refreshes.
          </EmptyState>
        ) : (
          visible.map((r) => (
            <ReceiptRow
              key={r.id}
              r={r}
              onToggle={toggleReimbursed}
              onRemove={remove}
              onEdit={openEdit}
            />
          ))
        )}
      </div>

      {showForm && (
        <CaptureForm
          form={form}
          setField={setField}
          onPhoto={onPhoto}
          onSubmit={submitReceipt}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
            setTotalTouched(false);
            setHsaTouched(false);
          }}
          onTotalTouched={() => setTotalTouched(true)}
          onHsaTouched={() => setHsaTouched(true)}
          editing={Boolean(editingId)}
          photoError={photoError}
          hsaEstablishedDate={hsaEstablishedDate}
        />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-4">
      <p className="font-display text-lg font-600 text-stone-950">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12 text-center">
      <ReceiptIcon className="h-8 w-8 text-stone-300" />
      <p className="mt-3 text-sm text-stone-500">{children}</p>
    </div>
  );
}

function AttachmentBadge({ r }) {
  if (!r.photo) return null;
  const pdf = isPdfAttachment(r);
  const canOpen = typeof r.photo === "string" && r.photo.startsWith("http");
  const chip = (
    <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 ring-1 ring-inset ring-stone-200">
      {pdf ? "PDF" : "IMG"}
    </span>
  );
  // Signed URLs open in a new tab; fresh data URLs can't (browser-blocked) —
  // they become openable after the next vault load.
  return canOpen ? (
    <a href={r.photo} target="_blank" rel="noreferrer" title="Open receipt attachment">
      {chip}
    </a>
  ) : (
    chip
  );
}

function ReceiptRow({ r, onToggle, onRemove, onEdit }) {
  const reimbursed = r.status === "reimbursed";
  const fromHsa = r.paySource === "hsa-card";
  // Out-of-pocket but flagged "HSA wasn't open yet" → excluded from the
  // reimbursable balance (IRS rule). Say so instead of silently not counting.
  const excluded = !reimbursed && !fromHsa && !r.hsaOpenAtTime;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-50 text-stone-400">
        {r.photo && !isPdfAttachment(r) ? (
          <img src={r.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <ReceiptIcon className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-stone-950">
          {r.product || "Untitled receipt"} <AttachmentBadge r={r} />
        </p>
        <p className="truncate text-sm text-stone-500">
          {[r.merchant, r.category, r.date].filter(Boolean).join(" · ")}
          {r.cardLast4 ? ` · ${r.cardBrand} ••${r.cardLast4}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display font-600 text-stone-950">{usd(r.total)}</p>
        <span
          title={
            excluded
              ? "Marked as paid before your HSA was open, so it can't be reimbursed (IRS rule). Use Edit if that's wrong."
              : undefined
          }
          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
            reimbursed
              ? "bg-stone-100 text-stone-500 ring-stone-200"
              : fromHsa
                ? "bg-sky-50 text-sky-700 ring-sky-600/20"
                : excluded
                  ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
          }`}
        >
          {reimbursed ? (
            <>
              <CheckIcon className="h-3 w-3" /> Reimbursed
            </>
          ) : fromHsa ? (
            "Paid from HSA"
          ) : excluded ? (
            "Not counted — HSA not open"
          ) : (
            <>
              <ClockIcon className="h-3 w-3" /> Deferred
            </>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {!fromHsa && (
          <button
            onClick={() => onToggle(r.id)}
            className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            {reimbursed ? "Undo" : "Mark reimbursed"}
          </button>
        )}
        <button
          onClick={() => onEdit(r)}
          className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
        >
          Edit
        </button>
        <button
          onClick={() => onRemove(r.id)}
          aria-label="Delete receipt"
          className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-400 hover:bg-stone-50 hover:text-stone-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function CaptureForm({
  form,
  setField,
  onPhoto,
  onSubmit,
  onClose,
  onTotalTouched,
  onHsaTouched,
  editing,
  photoError,
  hsaEstablishedDate,
}) {
  const formPdf = isPdfAttachment(form);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-700 text-stone-950">
            {editing ? "Edit receipt" : "Add a receipt"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Product / service">
            <input
              required
              value={form.product}
              onChange={(e) => setField("product", e.target.value)}
              className={inputCls}
              placeholder="Omron blood pressure monitor"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Merchant">
              <input
                value={form.merchant}
                onChange={(e) => setField("merchant", e.target.value)}
                className={inputCls}
                placeholder="Amazon"
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Subtotal">
              <input
                inputMode="decimal"
                value={form.subtotal}
                onChange={(e) => setField("subtotal", e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Discount">
              <input
                inputMode="decimal"
                value={form.discount}
                onChange={(e) => setField("discount", e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Tax">
              <input
                inputMode="decimal"
                value={form.tax}
                onChange={(e) => setField("tax", e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field label="Total paid — after discounts">
            <input
              required
              inputMode="decimal"
              value={form.total}
              onChange={(e) => {
                onTotalTouched();
                setField("total", e.target.value);
              }}
              className={inputCls}
              placeholder="0.00"
              aria-describedby="total-help"
            />
          </Field>
          <p id="total-help" className="-mt-2 text-xs text-stone-400">
            What actually left your pocket — this is the amount you can reimburse.
            We'll suggest it from subtotal − discount + tax.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Paid with">
              <select
                value={form.paySource}
                onChange={(e) => setField("paySource", e.target.value)}
                className={inputCls}
              >
                <option value="out-of-pocket">Out of pocket</option>
                <option value="hsa-card">HSA card</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Card brand">
              <select
                value={form.cardBrand}
                onChange={(e) => setField("cardBrand", e.target.value)}
                className={inputCls}
              >
                {CARD_BRANDS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Card last 4 only">
              <input
                inputMode="numeric"
                maxLength={4}
                value={form.cardLast4}
                onChange={(e) =>
                  setField("cardLast4", e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className={inputCls}
                placeholder="1234"
                aria-describedby="card-help"
              />
            </Field>
          </div>
          <p id="card-help" className="-mt-2 text-xs text-stone-400">
            We only ever store the last 4 digits and brand — never the full number, expiry, or CVV.
          </p>

          <label className="flex items-center gap-2.5 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.hsaOpenAtTime}
              onChange={(e) => {
                onHsaTouched();
                setField("hsaOpenAtTime", e.target.checked);
              }}
              className="h-4 w-4 rounded border-stone-300 text-candor-red focus:ring-candor-red"
            />
            My HSA was open when I paid this
          </label>
          <p className="-mt-2 text-xs text-stone-400">
            {hsaEstablishedDate
              ? `Set automatically from your HSA start date (${hsaEstablishedDate}) and the expense date — override if needed. `
              : ""}
            If unchecked, this receipt won't count toward your reimbursable
            balance — the IRS only allows reimbursement of expenses paid after
            your HSA was opened.
          </p>

          <Field label="Receipt photo or PDF (optional)">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => onPhoto(e.target.files?.[0])}
              className="block w-full text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-700"
            />
            {photoError && <p className="mt-2 text-xs text-red-600">{photoError}</p>}
            {form.photo && formPdf && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600">
                <ReceiptIcon className="h-4 w-4 text-stone-400" /> PDF attached
              </p>
            )}
            {form.photo && !formPdf && (
              <img
                src={form.photo}
                alt="Receipt preview"
                className="mt-2 h-24 rounded-lg border border-stone-200 object-cover"
              />
            )}
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Anything worth remembering for tax time."
            />
          </Field>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="candor-gradient flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            {editing ? "Save changes" : "Save to vault"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-950 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-500">{label}</span>
      {children}
    </label>
  );
}
