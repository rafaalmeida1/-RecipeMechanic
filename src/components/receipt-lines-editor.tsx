"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouterWithLoading } from "@/components/navigation-progress";
import { finalizeReceipt, saveReceiptDraft } from "@/server/receipts/actions";
import { OFFLINE_SYNC_EVENT, enqueueLinesDraft } from "@/lib/offline/receipt-sync";
import { formatCentsBRL, parseMoneyToCents } from "@/lib/money";
import { getClientAmountDueCents } from "@/lib/receipt-totals";
import { ReceiptLineKind, ReceiptPaymentMethod } from "@prisma/client";
import { CircleDollarSign, Loader2, Plus } from "lucide-react";
import {
  DraftLine,
  LineRow,
  linesSignature,
  newReceiptLine,
} from "@/components/receipt-line-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ReceiptLinesEditor({
  receiptId,
  initialLines,
  initialReceiptNote,
  initialPaymentMethod,
  initialCardInstallmentCount,
  initialShowGrandTotalOnPdf,
  initialClientPaidForParts,
}: {
  receiptId: string;
  initialLines: Array<{
    kind: ReceiptLineKind;
    description: string;
    qty: number;
    unitCents: number;
  }>;
  initialReceiptNote: string;
  initialPaymentMethod: ReceiptPaymentMethod;
  initialCardInstallmentCount: number | null;
  initialShowGrandTotalOnPdf: boolean;
  initialClientPaidForParts: boolean;
}) {
  const router = useRouterWithLoading();
  const [pending, startTransition] = useTransition();
  const [backPending, startBackTransition] = useTransition();
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (!initialLines.length) return [newReceiptLine()];
    return initialLines.map((l) => ({
      clientId: Math.random().toString(36).slice(2),
      kind: l.kind,
      description: l.description,
      unitMoney: (l.unitCents / 100).toFixed(2).replace(".", ","),
      qty: String(l.qty),
    }));
  });
  const [receiptNote, setReceiptNote] = useState(initialReceiptNote);
  const [paymentMethod, setPaymentMethod] = useState<ReceiptPaymentMethod>(initialPaymentMethod);
  const [cardInstallmentCount, setCardInstallmentCount] = useState(
    String(initialCardInstallmentCount && initialCardInstallmentCount > 0 ? initialCardInstallmentCount : 1),
  );
  const [showGrandTotalOnPdf, setShowGrandTotalOnPdf] = useState(
    initialShowGrandTotalOnPdf,
  );
  const [clientPaidForParts, setClientPaidForParts] = useState(
    initialClientPaidForParts,
  );
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

  const clientDuePreviewCents = useMemo(() => {
    const withTotals = lines
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
        return { kind: l.kind, lineTotalCents: unitCents * qty };
      })
      .filter(Boolean) as Array<{
        kind: ReceiptLineKind;
        lineTotalCents: number;
      }>;
    return getClientAmountDueCents(
      clientPaidForParts,
      withTotals.reduce((s, l) => s + l.lineTotalCents, 0),
      withTotals,
    );
  }, [lines, clientPaidForParts]);

  const buildDraftPayload = useCallback(() => {
    const sig = linesSignature(lines);
    const noteSig = `${receiptNote}|${paymentMethod}|${cardInstallmentCount}|${showGrandTotalOnPdf}|${clientPaidForParts}`;
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
    return { sig, noteSig, parsedLines };
  }, [lines, receiptNote, paymentMethod, cardInstallmentCount, showGrandTotalOnPdf, clientPaidForParts]);

  const persist = useCallback(async () => {
    const { sig, noteSig, parsedLines } = buildDraftPayload();
    if (`${sig}|${noteSig}` === lastSavedSig.current) return true;

    const nInstallments = Math.min(
      12,
      Math.max(1, Number.parseInt(cardInstallmentCount, 10) || 1),
    );
    const meta = {
      receiptNote: receiptNote.slice(0, 2000),
      paymentMethod,
      cardInstallmentCount:
        paymentMethod === ReceiptPaymentMethod.CARTAO ? nInstallments : null,
      showGrandTotalOnPdf,
      clientPaidForParts,
    };

    setSaving(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueLinesDraft({
          receiptId,
          lines: parsedLines,
          ...meta,
        });
        setOfflineQueued(true);
        lastSavedSig.current = `${sig}|${noteSig}`;
        setError(null);
        try {
          localStorage.setItem(
            `ribeirocar:draft:${receiptId}`,
            JSON.stringify({ lines, receiptNote, meta, savedAt: Date.now() }),
          );
        } catch {
          // ignore
        }
        return true;
      }

      const res = await saveReceiptDraft({
        receiptId,
        lines: parsedLines,
        ...meta,
      });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      setOfflineQueued(false);
      lastSavedSig.current = `${sig}|${noteSig}`;
      setError(null);
      try {
        localStorage.setItem(
          `ribeirocar:draft:${receiptId}`,
          JSON.stringify({ lines, receiptNote, meta, savedAt: Date.now() }),
        );
      } catch {
        // ignore
      }
      return true;
    } catch {
      try {
        await enqueueLinesDraft({ receiptId, lines: parsedLines, ...meta });
        setOfflineQueued(true);
        lastSavedSig.current = `${sig}|${noteSig}`;
        setError(
          "Sem conexão: alterações na fila deste aparelho. Sincronizam ao voltar a internet.",
        );
        try {
          localStorage.setItem(
            `ribeirocar:draft:${receiptId}`,
            JSON.stringify({ lines, receiptNote, meta, savedAt: Date.now() }),
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
  }, [
    buildDraftPayload,
    cardInstallmentCount,
    lines,
    paymentMethod,
    receiptId,
    receiptNote,
    showGrandTotalOnPdf,
    clientPaidForParts,
  ]);

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
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Etapa 3</p>
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
                if (prev.length === 1) return [newReceiptLine()];
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
            onClick={() => setLines((prev) => [...prev, newReceiptLine()])}
          >
            <Plus className="h-4 w-4" />
            Adicionar linha
          </Button>
          <div className="flex flex-col items-end gap-0.5 text-sm md:text-sm">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="text-muted-foreground">Soma dos itens (prévia)</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCentsBRL(totalsPreview)}
              </span>
            </div>
            {clientPaidForParts ? (
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-muted-foreground">A pagar pelo cliente (prévia):</span>
                <span className="font-semibold tabular-nums text-primary">
                  {formatCentsBRL(clientDuePreviewCents)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-5">
          <h2 className="text-sm font-semibold text-foreground">Observação no recibo (opcional)</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Esta nota aparece <strong className="text-foreground">no PDF, por baixo dos itens</strong>.
            Use para avisos, garantia ou lembretes — o cliente e a oficina veem o que você
            escrever aqui.
          </p>
          <textarea
            id="receipt-note"
            name="receiptNote"
            value={receiptNote}
            onChange={(e) => setReceiptNote(e.target.value)}
            maxLength={2000}
            rows={4}
            className={cn(
              "flex w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            placeholder="Ex.: Prazo de garantia da peça: 90 dias. Freios alinhados; recomendar troca de fluido no próximo serviço…"
          />
        </div>

        <div className="space-y-4 border-t border-border/60 pt-5">
          <h2 className="text-sm font-semibold text-foreground">Pagamento e totais no PDF</h2>
          <p className="text-xs text-muted-foreground">
            A forma de pagamento sai no recibo com o <strong className="text-foreground">valor a
            pagar pelo cliente</strong> (total a pagar, parcelas no cartão, etc.). Ajuste abaixo
            se as peças já foram quitas à parte.
          </p>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={clientPaidForParts}
              onChange={(e) => setClientPaidForParts(e.target.checked)}
            />
            <span className="text-sm leading-snug text-foreground">
              <span className="font-medium">O cliente já pagou as peças?</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Se sim, o recibo considera que ele só ainda paga a <em>mão de obra (serviços)</em> —
                total a pagar, parcelas e a mensagem de partilha usam esse valor (as peças
                permanecem listadas no PDF, como referência).
              </span>
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            Cartão: informe em quantas vezes a cobrança (sobre o valor a pagar pelo cliente).
          </p>
          <div className="space-y-2">
            <Label htmlFor="payment-method">Como o cliente pagou</Label>
            <select
              id="payment-method"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as ReceiptPaymentMethod)}
            >
              <option value={ReceiptPaymentMethod.PIX}>PIX</option>
              <option value={ReceiptPaymentMethod.CARTAO}>Cartão</option>
              <option value={ReceiptPaymentMethod.OUTRO}>Outro (dinheiro, transferência…)</option>
            </select>
          </div>
          {paymentMethod === ReceiptPaymentMethod.CARTAO ? (
            <div className="space-y-2">
              <Label htmlFor="card-installments">Quantas vezes (parcelas no cartão)</Label>
              <Input
                id="card-installments"
                inputMode="numeric"
                value={cardInstallmentCount}
                onChange={(e) => setCardInstallmentCount(e.target.value.replace(/\D/g, ""))}
                placeholder="1 a 12"
                min={1}
                max={12}
              />
              <p className="text-[11px] text-muted-foreground">1 = à vista no cartão. De 2 a 12 = parcelado.</p>
            </div>
          ) : null}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input"
              checked={showGrandTotalOnPdf}
              onChange={(e) => setShowGrandTotalOnPdf(e.target.checked)}
            />
            <span className="text-sm leading-snug text-foreground">
              <span className="font-medium">Mostrar &quot;Total geral&quot; e resumo de pagamento no recibo (PDF)</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Desative só se o documento não puder exibir o valor fechado (o padrão é mostrar;
                as peças e serviços continuam discriminados com subtotais em qualquer caso).
              </span>
            </span>
          </label>
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
