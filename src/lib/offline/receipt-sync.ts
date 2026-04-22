"use client";

import { createReceiptDraft, saveReceiptDraft } from "@/server/receipts/actions";
import {
  type OutboxRecord,
  putDraft,
  getDraftById,
  removeDraft,
  listPendingDrafts,
  updateDraftRecord,
  type WizardSyncPayload,
  type LineSyncPayload,
  type BundleLine,
  linesOutboxId,
} from "@/lib/offline/outbox";

export type OfflineSyncDetail =
  | { kind: "wizard"; receiptId: string; clientDraftKey: string }
  | { kind: "bundle"; receiptId: string; clientDraftKey: string }
  | { kind: "lines"; receiptId: string };

const EVENT = "ribeirocar-offline-sync";

export function dispatchOfflineSync(detail: OfflineSyncDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

function notifyOutboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ribeirocar-outbox-changed"));
  }
}

/** Pacote offline (wizard + linhas) no mesmo `localId` = `clientDraftKey`. */
export async function enqueueOfflineBundle(
  localId: string,
  wizard: WizardSyncPayload,
  bundleLines: BundleLine[] = [],
): Promise<void> {
  const rec: OutboxRecord = {
    localId,
    kind: "bundle",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncStatus: "pending",
    wizard,
    bundleLines,
  };
  await putDraft(rec);
  notifyOutboxChanged();
}

/** Compat: grava como `bundle` com linhas vazias. */
export async function enqueueWizardDraft(
  localId: string,
  wizard: WizardSyncPayload,
): Promise<void> {
  await enqueueOfflineBundle(localId, wizard, []);
}

export async function upsertOfflineBundleLines(
  localId: string,
  bundleLines: BundleLine[],
): Promise<void> {
  const cur = await getDraftById(localId);
  if (!cur || !cur.wizard) return;
  const next: OutboxRecord = {
    ...cur,
    kind: "bundle",
    bundleLines,
    updatedAt: Date.now(),
    syncStatus: cur.syncStatus === "failed" ? "pending" : cur.syncStatus,
  };
  await putDraft(next);
  notifyOutboxChanged();
}

export async function enqueueLinesDraft(payload: LineSyncPayload): Promise<void> {
  const localId = linesOutboxId(payload.receiptId);
  const rec: OutboxRecord = {
    localId,
    kind: "lines",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncStatus: "pending",
    lines: payload,
  };
  await putDraft(rec);
  notifyOutboxChanged();
}

export async function flushReceiptOutbox(): Promise<{
  synced: number;
  errors: string[];
}> {
  const records = await listPendingDrafts();
  const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);
  let synced = 0;
  const errors: string[] = [];

  for (const r of sorted) {
    try {
      if (r.kind === "bundle" && r.wizard) {
        const res = await createReceiptDraft({
          ...r.wizard,
          clientDraftKey: r.localId,
        });
        if (!res.ok) {
          await updateDraftRecord(r.localId, { syncStatus: "failed", lastError: res.error });
          errors.push(res.error);
          continue;
        }
        const linesPayload = (r.bundleLines ?? []).map((l) => ({
          kind: l.kind,
          description: l.description,
          qty: l.qty,
          unitCents: l.unitCents,
        }));
        if (linesPayload.length > 0) {
          const save = await saveReceiptDraft({
            receiptId: res.receiptId,
            lines: linesPayload,
          });
          if (!save.ok) {
            await updateDraftRecord(r.localId, { syncStatus: "failed", lastError: save.error });
            errors.push(save.error);
            continue;
          }
        }
        await removeDraft(r.localId);
        synced += 1;
        dispatchOfflineSync({
          kind: "bundle",
          receiptId: res.receiptId,
          clientDraftKey: r.localId,
        });
      } else if (r.kind === "wizard" && r.wizard) {
        const res = await createReceiptDraft({
          ...r.wizard,
          clientDraftKey: r.localId,
        });
        if (!res.ok) {
          await updateDraftRecord(r.localId, { syncStatus: "failed", lastError: res.error });
          errors.push(res.error);
          continue;
        }
        await removeDraft(r.localId);
        synced += 1;
        dispatchOfflineSync({
          kind: "wizard",
          receiptId: res.receiptId,
          clientDraftKey: r.localId,
        });
      } else if (r.kind === "lines" && r.lines) {
        const { lines, receiptId, ...meta } = r.lines;
        const res = await saveReceiptDraft({
          receiptId,
          lines,
          ...meta,
        });
        if (!res.ok) {
          await updateDraftRecord(r.localId, { syncStatus: "failed", lastError: res.error });
          errors.push(res.error);
          continue;
        }
        await removeDraft(r.localId);
        synced += 1;
        dispatchOfflineSync({ kind: "lines", receiptId: r.lines.receiptId });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro de rede";
      await updateDraftRecord(r.localId, { syncStatus: "failed", lastError: msg });
      errors.push(msg);
    }
  }

  if (synced > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("ribeirocar-outbox-changed"));
  }

  return { synced, errors };
}

export const OFFLINE_SYNC_EVENT = EVENT;
