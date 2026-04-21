"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouterWithLoading } from "@/components/navigation-progress";
import {
  finalizeReceipt,
  saveReceiptDraft,
  suggestParts,
} from "@/server/receipts/actions";
import { OFFLINE_SYNC_EVENT, enqueueLinesDraft } from "@/lib/offline/receipt-sync";
import { formatCentsBRL, parseMoneyToCents } from "@/lib/money";
import { ReceiptLineKind } from "@prisma/client";
import { CircleDollarSign, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DraftLine = {
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

export function ReceiptLinesEditor({
  receiptId,
  initialLines,
}: {
  receiptId: string;
  initialLines: Array<{
    kind: ReceiptLineKind;
    description: string;
    qty: number;
    unitCents: number;
  }>;
}) {
  const router = useRouterWithLoading();
  const [pending, startTransition] = useTransition();
  const [backPending, startBackTransition] = useTransition();
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (!initialLines.length) return [newLine()];
    return initialLines.map((l) => ({
      clientId: Math.random().toString(36).slice(2),
      kind: l.kind,
      description: l.description,
      unitMoney: (l.unitCents / 100).toFixed(2).replace(".", ","),
      qty: String(l.qty),
    }));
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const lastSavedSig = useRef<string | null>(null);

  useEffect(() => {
    const onSynced = (e: Event) => {
      const d = (e as CustomEvent<{ kind?: string; receiptId?: string }>).detail;
      if (d?.kind === "lines" && d.receiptId === receiptId) {
        setOfflineQueued(false);
      }
    };
    window.addEventListener(OFFLINE_SYNC_EVENT, onSynced);
    return () => window.removeEventListener(OFFLINE_SYNC_EVENT, onSynced);
  }, [receiptId]);

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

  const persist = useCallback(async () => {
    const sig = linesSignature(lines);
    if (sig === lastSavedSig.current) return true;

    const parsedLines = lines
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
      .filter(Boolean) as Array<{
        kind: ReceiptLineKind;
        description: string;
        qty: number;
        unitCents: number;
      }>;

    setSaving(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueLinesDraft({ receiptId, lines: parsedLines });
        setOfflineQueued(true);
        lastSavedSig.current = sig;
        setError(null);
        try {
          localStorage.setItem(
            `ribeirocar:draft:${receiptId}`,
            JSON.stringify({ lines, savedAt: Date.now() }),
          );
        } catch {
          // ignore
        }
        return true;
      }

      const res = await saveReceiptDraft({ receiptId, lines: parsedLines });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      setOfflineQueued(false);
      lastSavedSig.current = sig;
      setError(null);
      try {
        localStorage.setItem(
          `ribeirocar:draft:${receiptId}`,
          JSON.stringify({ lines, savedAt: Date.now() }),
        );
      } catch {
        // ignore
      }
      return true;
    } catch {
      try {
        await enqueueLinesDraft({ receiptId, lines: parsedLines });
        setOfflineQueued(true);
        lastSavedSig.current = sig;
        setError(
          "Sem conexão: alterações na fila deste aparelho. Sincronizam ao voltar a internet.",
        );
        try {
          localStorage.setItem(
            `ribeirocar:draft:${receiptId}`,
            JSON.stringify({ lines, savedAt: Date.now() }),
          );
        } catch {
          // ignore
        }
        return true;
      } catch {
        setError("Erro ao salvar o rascunho.");
        return false;
      }
    } finally {
      setSaving(false);
    }
  }, [lines, receiptId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void persist();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [persist]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Etapa 3
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Peças e valores
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Preencha o valor de <strong className="text-foreground">uma unidade</strong>{" "}
            antes da quantidade. O sistema soma tudo e salva o rascunho sozinho.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
          {offlineQueued ? (
            <p className="max-w-xs text-right text-[11px] text-amber-200/90">
              Fila offline: peças guardadas neste aparelho até sincronizar.
            </p>
          ) : null}
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Salvando…
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {offlineQueued ? "Na fila (offline)" : "Rascunho salvo"}
              </>
            )}
          </div>
        </div>
      </header>

      <Card className="space-y-4 border-primary/10">
        {lines.map((line, idx) => (
          <LineRow
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

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            loading={backPending}
            disabled={pending || backPending}
            onClick={() =>
              startBackTransition(() => {
                router.push("/");
              })
            }
          >
            Voltar ao início
          </Button>
          <Button
            type="button"
            loading={pending}
            disabled={pending || backPending}
            onClick={() => {
              setError(null);
              if (typeof navigator !== "undefined" && !navigator.onLine) {
                setError(
                  "É preciso estar online para finalizar o recibo. Conecte-se à internet e tente de novo.",
                );
                return;
              }
              if (offlineQueued) {
                setError(
                  "Sincronize primeiro as peças com o servidor (faixa “Sincronizar agora” no topo) e depois finalize.",
                );
                return;
              }
              startTransition(async () => {
                await persist();
                const res = await finalizeReceipt(receiptId);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                router.push(`/receipts/${receiptId}/done`);
              });
            }}
          >
            Finalizar recibo
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LineRow({
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    const q = line.description.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = window.setTimeout(() => {
      void suggestParts(q).then(setSuggestions).catch(() => setSuggestions([]));
    }, 350);
    return () => window.clearTimeout(t);
  }, [line.description]);

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
            list={`suggestions-${line.clientId}`}
            placeholder={
              line.kind === ReceiptLineKind.SERVICE
                ? "Ex.: Mão de obra, alinhamento…"
                : "Ex.: Kit pastilha dianteira"
            }
          />
          <datalist id={`suggestions-${line.clientId}`}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
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
