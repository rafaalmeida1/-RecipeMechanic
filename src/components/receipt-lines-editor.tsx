"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  finalizeReceipt,
  saveReceiptDraft,
  suggestParts,
} from "@/server/receipts/actions";
import { formatCentsBRL, parseMoneyToCents } from "@/lib/money";
import { CircleDollarSign, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DraftLine = {
  clientId: string;
  description: string;
  unitMoney: string;
  qty: string;
};

function newLine(): DraftLine {
  return {
    clientId: Math.random().toString(36).slice(2),
    description: "",
    unitMoney: "",
    qty: "1",
  };
}

function linesSignature(lines: DraftLine[]) {
  return JSON.stringify(
    lines.map((l) => ({
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
    description: string;
    qty: number;
    unitCents: number;
  }>;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (!initialLines.length) return [newLine()];
    return initialLines.map((l) => ({
      clientId: Math.random().toString(36).slice(2),
      description: l.description,
      unitMoney: (l.unitCents / 100).toFixed(2).replace(".", ","),
      qty: String(l.qty),
    }));
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const lastSavedSig = useRef<string | null>(null);

  const totalsPreview = useMemo(() => {
    let total = 0;
    for (const l of lines) {
      const unit = parseMoneyToCents(l.unitMoney);
      const qty = Number.parseInt(l.qty, 10);
      if (!unit || !Number.isFinite(qty) || qty <= 0) continue;
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
        if (!l.description.trim() || !unitCents || !Number.isFinite(qty) || qty <= 0) {
          return null;
        }
        return { description: l.description.trim(), qty, unitCents };
      })
      .filter(Boolean) as Array<{ description: string; qty: number; unitCents: number }>;

    setSaving(true);
    try {
      const res = await saveReceiptDraft({ receiptId, lines: parsedLines });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
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
      setError("Erro ao salvar o rascunho.");
      return false;
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
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Salvando…
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Rascunho salvo
            </>
          )}
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
          <div className="flex items-center gap-2 text-sm">
            <CircleDollarSign className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-muted-foreground">Total (prévia)</span>
            <span className="text-lg font-bold tabular-nums text-foreground">
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
            disabled={pending}
            onClick={() => router.push("/")}
          >
            Voltar ao início
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
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
    unitCents && Number.isFinite(qty) && qty > 0 ? unitCents * qty : 0;

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <Label htmlFor={`d-${line.clientId}`}>Peça / serviço</Label>
          <Input
            id={`d-${line.clientId}`}
            value={line.description}
            onChange={(e) => onChange({ ...line, description: e.target.value })}
            list={`suggestions-${line.clientId}`}
            placeholder="Ex.: Kit pastilha dianteira"
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
          <div className="flex h-11 items-center rounded-md border border-input bg-background px-3 text-sm font-semibold tabular-nums text-foreground">
            {formatCentsBRL(lineTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
