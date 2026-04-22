"use client";

import { useEffect, useState } from "react";
import { suggestParts } from "@/server/receipts/actions";
import { formatCentsBRL, parseMoneyToCents } from "@/lib/money";
import { ReceiptLineKind } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DraftLine = {
  clientId: string;
  kind: ReceiptLineKind;
  description: string;
  unitMoney: string;
  qty: string;
};

export function newReceiptLine(): DraftLine {
  return {
    clientId: Math.random().toString(36).slice(2),
    kind: ReceiptLineKind.PRODUCT,
    description: "",
    unitMoney: "",
    qty: "1",
  };
}

export function linesSignature(lines: DraftLine[]) {
  return JSON.stringify(
    lines.map((l) => ({
      k: l.kind,
      d: l.description,
      u: l.unitMoney,
      q: l.qty,
    })),
  );
}

export function LineRow({
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
        <Label className="mb-2 block text-xs text-muted-foreground">É peça ou serviço?</Label>
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
