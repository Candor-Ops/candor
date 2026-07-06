// Supabase persistence adapter for <ReceiptVault /> (Week 2).
//
// Implements the SAME two-method contract as localStorageAdapter:
//   load(userId)        -> Promise<Receipt[]>
//   save(userId, list)  -> Promise<void>
// so the vault component does not change — only the adapter passed to it.
//
// RLS does the real scoping: every query runs as the signed-in user and the
// database only returns/accepts that user's rows. `userId` is still used for
// Storage object paths and explicit user_id columns (belt and suspenders).
//
// Photos: the component produces small downscaled JPEG data URLs (client-side
// downscaling is a guardrail — keep it). This adapter uploads them to the
// PRIVATE `receipt-photos` bucket at "<userId>/<receiptId>.jpg", stores the
// object path in receipts.photo_path, and hands the component a short-lived
// signed URL in `photo` on load.
//
// TECH DEBT (known, accepted for Week 2): the component saves the WHOLE list
// on every change, so save() reconciles — upsert everything present, delete
// what's gone. Two tabs editing in parallel can clobber each other. Fix is
// per-row callbacks on the component (see week2 handoff §6); not this sprint.

import * as Sentry from "@sentry/react";
import { supabase } from "./supabaseClient.js";

const BUCKET = "receipt-photos";
const SIGNED_URL_TTL = 60 * 60; // 1 hour — vault reloads re-sign on mount

// SAFETY LATCH: if load() ever fails, the component ends up holding an empty
// list — and its whole-list save() would then delete every server row. save()
// is a no-op until a load has succeeded in this session.
let loadSucceeded = false;

const numOrNull = (v) => {
  const n = Number(v);
  return v === "" || v === null || v === undefined || Number.isNaN(n) ? null : n;
};

function toClient(row, signedUrl) {
  return {
    id: row.id,
    product: row.product ?? "",
    merchant: row.merchant ?? "",
    date: row.date ?? "",
    subtotal: row.subtotal ?? "",
    tax: row.tax ?? "",
    discount: row.discount ?? "",
    total: Number(row.total) || 0,
    category: row.category ?? "Other",
    paySource: row.pay_source ?? "out-of-pocket",
    cardBrand: row.card_brand ?? "",
    cardLast4: row.card_last4 ?? "",
    hsaOpenAtTime: Boolean(row.hsa_open_at_time),
    notes: row.notes ?? "",
    photo: signedUrl ?? null, // displayable signed URL (or null)
    photoPath: row.photo_path ?? null, // round-trips so save() keeps the link
    status: row.status ?? "deferred",
    createdAt: row.created_at,
  };
}

function toRow(userId, r) {
  return {
    id: r.id,
    user_id: userId,
    product: r.product || "Untitled receipt",
    merchant: r.merchant || null,
    date: r.date || null,
    subtotal: numOrNull(r.subtotal),
    discount: numOrNull(r.discount),
    tax: numOrNull(r.tax),
    total: numOrNull(r.total) ?? 0,
    category: r.category || null,
    pay_source: r.paySource || "out-of-pocket",
    card_brand: r.cardBrand || null,
    // GUARDRAIL: last 4 digits only — also enforced by a DB check constraint.
    card_last4: (r.cardLast4 || "").replace(/\D/g, "").slice(0, 4) || null,
    hsa_open_at_time: Boolean(r.hsaOpenAtTime),
    notes: r.notes || null,
    photo_path: r.photoPath || null,
    status: r.status || "deferred",
    created_at: r.createdAt || new Date().toISOString(),
  };
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

export const supabaseAdapter = {
  async load(userId) {
    if (!supabase) return [];
    try {
      const { data: rows, error } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false }); // RLS scopes to the caller
      if (error) throw error;

      // Batch-sign URLs for every stored photo.
      const paths = rows.map((r) => r.photo_path).filter(Boolean);
      const urlByPath = new Map();
      if (paths.length) {
        const { data: signed, error: signErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(paths, SIGNED_URL_TTL);
        if (signErr) {
          Sentry.captureException(signErr);
        } else {
          for (const s of signed ?? []) {
            if (s?.signedUrl && !s.error) urlByPath.set(s.path, s.signedUrl);
          }
        }
      }

      loadSucceeded = true;
      return rows.map((row) => toClient(row, urlByPath.get(row.photo_path)));
    } catch (err) {
      Sentry.captureException(err);
      console.error("[supabaseAdapter] load failed:", err);
      loadSucceeded = false;
      return [];
    }
  },

  async save(userId, list) {
    if (!supabase || !loadSucceeded) return;
    try {
      const receipts = Array.isArray(list) ? list : [];

      // 1. Upload any NEW attachments (still data URLs) — JPEG thumbnails or
      //    PDFs. Attachments loaded from the server are signed https URLs and
      //    are skipped — no re-upload loop.
      const prepared = await Promise.all(
        receipts.map(async (r) => {
          if (typeof r.photo === "string" && r.photo.startsWith("data:")) {
            const isPdf = r.photo.startsWith("data:application/pdf");
            const ext = isPdf ? "pdf" : "jpg";
            const contentType = isPdf ? "application/pdf" : "image/jpeg";
            const path = `${userId}/${r.id}.${ext}`;
            const blob = await dataUrlToBlob(r.photo);
            const { error } = await supabase.storage
              .from(BUCKET)
              .upload(path, blob, { contentType, upsert: true });
            if (error) {
              Sentry.captureException(error);
              return r; // keep receipt; photo just won't persist server-side
            }
            return { ...r, photoPath: path };
          }
          return r;
        })
      );

      // 2. Upsert everything present (reconcile, don't blindly clobber).
      if (prepared.length) {
        const { error } = await supabase
          .from("receipts")
          .upsert(prepared.map((r) => toRow(userId, r)));
        if (error) throw error;
      }

      // 3. Delete rows (and their photos) no longer in the list.
      const keep = new Set(prepared.map((r) => r.id));
      const { data: existing, error: readErr } = await supabase
        .from("receipts")
        .select("id, photo_path");
      if (readErr) throw readErr;

      const stale = (existing ?? []).filter((row) => !keep.has(row.id));
      if (stale.length) {
        const { error: delErr } = await supabase
          .from("receipts")
          .delete()
          .in("id", stale.map((row) => row.id));
        if (delErr) throw delErr;

        const stalePhotos = stale.map((row) => row.photo_path).filter(Boolean);
        if (stalePhotos.length) {
          await supabase.storage.from(BUCKET).remove(stalePhotos);
        }
      }
    } catch (err) {
      Sentry.captureException(err);
      console.error("[supabaseAdapter] save failed:", err);
    }
  },
};

export default supabaseAdapter;
