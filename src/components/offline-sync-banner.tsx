"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { countPendingDrafts } from "@/lib/offline/outbox";
import { flushReceiptOutbox } from "@/lib/offline/receipt-sync";
import { Button } from "@/components/ui/button";

export function OfflineSyncBanner() {
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [flushing, setFlushing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setQueueCount(await countPendingDrafts());
    } catch {
      setQueueCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onOutbox = () => void refresh();
    window.addEventListener("ribeirocar-outbox-changed", onOutbox);
    return () => window.removeEventListener("ribeirocar-outbox-changed", onOutbox);
  }, [refresh]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => {
      void (async () => {
        setFlushing(true);
        try {
          await flushReceiptOutbox();
        } finally {
          setFlushing(false);
          void refresh();
        }
      })();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  const showQueue = queueCount > 0;
  const showOffline = !online;

  if (!showQueue && !showOffline) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-2">
      {showOffline ? (
        <div
          className="mb-2 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/45 px-3 py-2 text-xs text-amber-50"
          role="status"
        >
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <span>
            Sem internet. O app continua aberto; rascunhos podem ficar neste aparelho e
            sincronizar quando a rede voltar.
          </span>
        </div>
      ) : null}
      {showQueue ? (
        <div className="mb-2 flex flex-col gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2.5 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {flushing ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            )}
            <span>
              <strong className="font-semibold">{queueCount}</strong>{" "}
              {queueCount === 1 ? "pendência" : "pendências"} na fila (sincronização com o
              servidor).
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 touch-manipulation"
            loading={flushing}
            disabled={flushing || !online}
            onClick={() => {
              setFlushing(true);
              void (async () => {
                try {
                  await flushReceiptOutbox();
                } finally {
                  setFlushing(false);
                  void refresh();
                }
              })();
            }}
          >
            Sincronizar agora
          </Button>
        </div>
      ) : null}
    </div>
  );
}
