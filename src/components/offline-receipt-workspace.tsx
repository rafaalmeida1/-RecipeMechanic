"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouterWithLoading } from "@/components/navigation-progress";
import {
  OFFLINE_SYNC_EVENT,
  upsertOfflineBundleLines,
  type OfflineSyncDetail,
} from "@/lib/offline/receipt-sync";
import { getDraftById, type BundleLine, type OutboxRecord } from "@/lib/offline/outbox";
import { readCachedBusiness, writeCachedBusiness } from "@/lib/offline/business-cache";
import { downloadOfflineReceiptPdf } from "@/lib/pdf/download-receipt-pdf-browser";
import { formatCentsBRL, parseMoneyToCents } from "@/lib/money";
import { ReceiptLineKind } from "@prisma/client";
import { getBusinessProfileSnapshot } from "@/server/receipts/actions";
import {
  ArrowLeft,
  CircleDollarSign,
  FileDown,
  Loader2,
  Plus,
  Trash2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPlateDisplay, normalizePlate } from "@/lib/plate";

type DraftLine = {
  clientId: string;
  kind: ReceiptLineKind;
  description: string;
  unitMoney: string;
  qty: string;
};

function newLine(): DraftLine {
  return {
    clientId: Math.random().toString(36).slice(2),
    kind: ReceiptLineKind.PRODUCT,
    description: "",
    unitMoney: "",
    qty: "1",
  };
}

function linesSignature(lines: DraftLine[]) {
  return JSON.stringify(
    lines.map((l) => ({
      k: l.kind,
      d: l.description,
      u: l.unitMoney,
      q: l.qty,
    })),
  );
}

function bundleLinesFromDraft(lines: DraftLine[]): BundleLine[] {
  return lines
    .map((l) => {
      const unitCents = parseMoneyToCents(l.unitMoney);
      const qty = Number.parseInt(l.qty, 10);
      if (
        !l.description.trim() ||
        unitCents === null ||
        !Number.isFinite(qty) ||
        qty <= 0
      ) {
        return null;
      }
      return {
        kind: l.kind,
        description: l.description.trim(),
        qty,
        unitCents,
      };
    })
    .filter(Boolean) as BundleLine[];
}

export function OfflineReceiptWorkspace({ draftKey }: { draftKey: string }) {
  const router = useRouterWithLoading();
  const [draft, setDraft] = useState<OutboxRecord | null | undefined>(undefined);
  const [pdfPending, startPdf] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const lastSavedSig = useRef<string | null>(null);

  const reload = useCallback(() => {
    void getDraftById(draftKey).then(setDraft);
  }, [draftKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onChange = () => reload();
    window.addEventListener("ribeirocar-outbox-changed", onChange);
    return () => window.removeEventListener("ribeirocar-outbox-changed", onChange);
  }, [reload]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void getBusinessProfileSnapshot().then((b) => {
        if (b) writeCachedBusiness(b);
      });
    }
  }, []);

  useEffect(() => {
    const onSynced = (e: Event) => {
      const d = (e as CustomEvent<OfflineSyncDetail>).detail;
      if (
        (d.kind === "bundle" || d.kind === "wizard") &&
        d.clientDraftKey === draftKey
      ) {
        router.push(`/receipts/${d.receiptId}`);
      }
    };
    window.addEventListener(OFFLINE_SYNC_EVENT, onSynced);
    return () => window.removeEventListener(OFFLINE_SYNC_EVENT, onSynced);
  }, [draftKey, router]);

  const wizard = draft?.wizard;

  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const linesInitialized = useRef(false);

  useEffect(() => {
    if (!draft || !wizard || linesInitialized.current) return;
    const raw = draft.bundleLines ?? [];
    linesInitialized.current = true;
    if (!raw.length) {
      setLines([newLine()]);
      return;
    }
    setLines(
      raw.map((l) => ({
        clientId: Math.random().toString(36).slice(2),
        kind: l.kind,
        description: l.description,
        unitMoney: (l.unitCents / 100).toFixed(2).replace(".", ","),
        qty: String(l.qty),
      })),
    );
  }, [draft, wizard]);

  const persist = useCallback(async () => {
    if (!wizard) return;
    const sig = linesSignature(lines);
    if (sig === lastSavedSig.current) return;
    const bl = bundleLinesFromDraft(lines);
    await upsertOfflineBundleLines(draftKey, bl);
    lastSavedSig.current = sig;
  }, [draftKey, lines, wizard]);

  useEffect(() => {
    if (!wizard) return;
    const t = window.setTimeout(() => {
      void persist();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [persist, wizard]);

  const totalsPreview = useMemo(() => {
    let total = 0;
    for (const l of lines) {
      const unit = parseMoneyToCents(l.unitMoney);
      const qty = Number.parseInt(l.qty, 10);
      if (unit === null || !Number.isFinite(qty) || qty <= 0) continue;
      total += unit * qty;
    }
    return total;
  }, [lines]);

  const plateDisplay = wizard ? formatPlateDisplay(normalizePlate(wizard.plate)) : "";

  if (draft === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando rascunho…
      </div>
    );
  }

  if (!draft || !wizard || draft.kind === "lines") {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Rascunho offline não encontrado neste aparelho ou a chave é inválida.
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Modo offline
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Peças e valores
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Os dados ficam neste aparelho até sincronizar. Você pode gerar um PDF de rascunho
            para o cliente mesmo sem internet.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-xs text-amber-50">
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
            Pendente de sincronização
          </div>
        </div>
      </header>

      <Card className="space-y-3 border-primary/10 px-4 py-3 text-sm">
        <div className="font-medium text-foreground">{wizard.customerName}</div>
        <div className="text-muted-foreground">
          {wizard.vehicleLabel}
          {plateDisplay ? (
            <>
              {" "}
              · <span className="font-mono text-foreground">{plateDisplay}</span>
            </>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 border-primary/10">
        {lines.map((line, idx) => (
          <OfflineLineRow
            key={line.clientId}
            index={idx}
            line={line}
            onChange={(next) => {
              setLines((prev) => prev.map((l) => (l.clientId === line.clientId ? next : l)));
            }}
            onRemove={() => {
              setLines((prev) => {
                if (prev.length === 1) return [newLine()];
                return prev.filter((l) => l.clientId !== line.clientId);
              });
            }}
          />
        ))}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            <Plus className="h-4 w-4" />
            Adicionar linha
          </Button>
          <div className="flex items-center gap-2 text-base md:text-sm">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-muted-foreground">Total (prévia)</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatCentsBRL(totalsPreview)}
            </span>
          </div>
        </div>

        {error ? (
          <p
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => router.push("/receipts/new")}
          >
            <ArrowLeft className="h-4 w-4" />
            Novo recibo
          </Button>
          <Button
            type="button"
            className="gap-2"
            loading={pdfPending}
            disabled={pdfPending}
            onClick={() => {
              setError(null);
              startPdf(async () => {
                try {
                  await persist();
                  const bl = bundleLinesFromDraft(lines);
                  if (!bl.length) {
                    setError("Adicione ao menos uma linha válida (descrição, valor e quantidade).");
                    return;
                  }
                  const cached = readCachedBusiness();
                  await downloadOfflineReceiptPdf({
                    wizard,
                    bundleLines: bl,
                    draftKey,
                    cachedBusiness: cached,
                  });
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
                }
              });
            }}
          >
            {!pdfPending ? <FileDown className="h-4 w-4" aria-hidden /> : null}
            Baixar PDF (rascunho)
          </Button>
        </div>
      </Card>
    </div>
  );
}

function OfflineLineRow({
  index,
  line,
  onChange,
  onRemove,
}: {
  index: number;
  line: DraftLine;
  onChange: (next: DraftLine) => void;
  onRemove: () => void;
}) {
  const unitCents = parseMoneyToCents(line.unitMoney);
  const qty = Number.parseInt(line.qty, 10);
  const lineTotal =
    unitCents !== null && Number.isFinite(qty) && qty > 0 ? unitCents * qty : 0;

  return (
    <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Item {index + 1}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remover
        </Button>
      </div>

      <div className="mb-3">
        <Label className="mb-2 block text-xs text-muted-foreground">
          É peça ou serviço?
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={line.kind === ReceiptLineKind.PRODUCT ? "default" : "outline"}
            className="h-12 w-full touch-manipulation text-sm font-medium"
            onClick={() => onChange({ ...line, kind: ReceiptLineKind.PRODUCT })}
          >
            Peça
          </Button>
          <Button
            type="button"
            variant={line.kind === ReceiptLineKind.SERVICE ? "default" : "outline"}
            className="h-12 w-full touch-manipulation text-sm font-medium"
            onClick={() => onChange({ ...line, kind: ReceiptLineKind.SERVICE })}
          >
            Serviço
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <Label htmlFor={`d-${line.clientId}`}>Peça / serviço</Label>
          <Input
            id={`d-${line.clientId}`}
            value={line.description}
            onChange={(e) => onChange({ ...line, description: e.target.value })}
            placeholder={
              line.kind === ReceiptLineKind.SERVICE
                ? "Ex.: Mão de obra, alinhamento…"
                : "Ex.: Kit pastilha dianteira"
            }
          />
        </div>
        <div className="sm:col-span-3">
          <Label htmlFor={`u-${line.clientId}`}>Valor unitário (R$)</Label>
          <Input
            id={`u-${line.clientId}`}
            inputMode="decimal"
            value={line.unitMoney}
            onChange={(e) => onChange({ ...line, unitMoney: e.target.value })}
            placeholder="115,00"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`q-${line.clientId}`}>Quantidade</Label>
          <Input
            id={`q-${line.clientId}`}
            inputMode="numeric"
            value={line.qty}
            onChange={(e) => onChange({ ...line, qty: e.target.value })}
            placeholder="1"
          />
        </div>
        <div className="sm:col-span-1">
          <Label>Total</Label>
          <div className="flex h-11 items-center rounded-md border border-input bg-muted/30 px-3 py-2 text-base tabular-nums text-foreground shadow-sm md:text-sm">
            {formatCentsBRL(lineTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
