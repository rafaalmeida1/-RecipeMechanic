/**
 * Fila IndexedDB: pacotes “bundle” (wizard + linhas) para fluxo 100% offline,
 * além de filas legadas wizard/lines.
 */

import type { ReceiptLineKind, ReceiptPaymentMethod } from "@prisma/client";

const DB_NAME = "ribeirocar-offline-v2";
const STORE = "receipt-outbox";
const DB_VERSION = 1;

export type WizardSyncPayload = {
  plate: string;
  customerName: string;
  vehicleLabel: string;
  year?: string;
  km?: string;
  serviceDate: string;
  pixKey: string;
  customerEmail: string;
  customerPhone: string;
};

export type BundleLine = {
  kind: ReceiptLineKind;
  description: string;
  qty: number;
  unitCents: number;
};

export type LineSyncPayload = {
  receiptId: string;
  lines: Array<{
    kind: ReceiptLineKind;
    description: string;
    qty: number;
    unitCents: number;
  }>;
  receiptNote?: string;
  paymentMethod?: ReceiptPaymentMethod;
  cardInstallmentCount?: number | null;
  showGrandTotalOnPdf?: boolean;
  clientPaidForParts?: boolean;
};

export type OutboxRecord = {
  localId: string;
  kind: "wizard" | "lines" | "bundle";
  createdAt: number;
  updatedAt: number;
  syncStatus: "pending" | "failed";
  lastError?: string;
  wizard?: WizardSyncPayload;
  /** Linhas do pacote offline (mesmo `localId` = `clientDraftKey`). */
  bundleLines?: BundleLine[];
  lines?: LineSyncPayload;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId" });
      }
    };
  });
}

export async function getDraftById(localId: string): Promise<OutboxRecord | null> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(localId);
      req.onsuccess = () => resolve((req.result as OutboxRecord | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
    });
  } finally {
    db.close();
  }
}

export async function putDraft(record: OutboxRecord): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.objectStore(STORE).put({ ...record, updatedAt: Date.now() });
    });
  } finally {
    db.close();
  }
}

export async function updateDraftRecord(
  localId: string,
  patch: Partial<Pick<OutboxRecord, "syncStatus" | "lastError" | "updatedAt">>,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB update failed"));
      const store = tx.objectStore(STORE);
      const g = store.get(localId);
      g.onsuccess = () => {
        const cur = g.result as OutboxRecord | undefined;
        if (!cur) {
          resolve();
          return;
        }
        store.put({
          ...cur,
          ...patch,
          updatedAt: Date.now(),
        });
      };
      g.onerror = () => reject(g.error ?? undefined);
    });
  } finally {
    db.close();
  }
}

export async function listPendingDrafts(): Promise<OutboxRecord[]> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () =>
        resolve(
          (req.result as OutboxRecord[]).filter(
            (r) => r.syncStatus === "pending" || r.syncStatus === "failed",
          ),
        );
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
  } finally {
    db.close();
  }
}

export async function countPendingDrafts(): Promise<number> {
  const rows = await listPendingDrafts();
  return rows.length;
}

export async function removeDraft(localId: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
      tx.objectStore(STORE).delete(localId);
    });
  } finally {
    db.close();
  }
}

export function linesOutboxId(receiptId: string): string {
  return `lines:${receiptId}`;
}
