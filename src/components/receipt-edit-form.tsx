"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouterWithLoading } from "@/components/navigation-progress";
import { updateFinalizedReceipt } from "@/server/receipts/actions";
import { formatCentsBRL, parseMoneyToCents } from "@/lib/money";
import { getClientAmountDueCents } from "@/lib/receipt-totals";
import { LineRow, type DraftLine, newReceiptLine } from "@/components/receipt-line-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrazilianDatePicker } from "@/components/brazilian-date-picker";
import {
  ReceiptLineKind,
  ReceiptPaymentMethod,
  type Customer,
  type Vehicle,
} from "@prisma/client";
import { formatPlateDisplay } from "@/lib/plate";
import { CheckCircle2, CircleDollarSign, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  receiptId: string;
  serviceDate: string;
  totalCents: number;
  receiptNote: string | null;
  paymentMethod: ReceiptPaymentMethod;
  cardInstallmentCount: number | null;
  showGrandTotalOnPdf: boolean;
  clientPaidForParts: boolean;
  customerNameSnap: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  km: number | null;
  pixKey: string;
  initialLines: Array<{
    kind: ReceiptLineKind;
    description: string;
    qty: number;
    unitCents: number;
  }>;
  vehicle: Pick<Vehicle, "id" | "label" | "year" | "plateNormalized"> & {
    customer: Pick<Customer, "id" | "name" | "email" | "phone">;
  };
};

export function ReceiptEditForm(props: Props) {
  const router = useRouterWithLoading();
  const [pending, startTransition] = useTransition();
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(
    props.customerNameSnap ?? props.vehicle.customer.name,
  );
  const [vehicleLabel, setVehicleLabel] = useState(props.vehicle.label);
  const [year, setYear] = useState(
    props.vehicle.year != null ? String(props.vehicle.year) : "",
  );
  const [km, setKm] = useState(props.km != null ? String(props.km) : "");
  const [serviceDate, setServiceDate] = useState(props.serviceDate);
  const [pixKey, setPixKey] = useState(props.pixKey);
  const [customerEmail, setCustomerEmail] = useState(props.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(
    props.customerPhone ?? props.vehicle.customer.phone ?? "",
  );

  const [lines, setLines] = useState<DraftLine[]>(
    props.initialLines.length
      ? props.initialLines.map((l) => ({
          clientId: Math.random().toString(36).slice(2),
          kind: l.kind,
          description: l.description,
          unitMoney: (l.unitCents / 100).toFixed(2).replace(".", ","),
          qty: String(l.qty),
        }))
      : [newReceiptLine()],
  );

  const [receiptNote, setReceiptNote] = useState(props.receiptNote ?? "");
  const [paymentMethod, setPaymentMethod] = useState<ReceiptPaymentMethod>(props.paymentMethod);
  const [cardInstallmentCount, setCardInstallmentCount] = useState(
    String(
      props.cardInstallmentCount && props.cardInstallmentCount > 0
        ? props.cardInstallmentCount
        : 1,
    ),
  );
  const [showGrandTotalOnPdf, setShowGrandTotalOnPdf] = useState(props.showGrandTotalOnPdf);
  const [clientPaidForParts, setClientPaidForParts] = useState(props.clientPaidForParts);

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

  const onSave = () => {
    setError(null);
    setOkMsg(null);
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
    if (parsedLines.length === 0) {
      setError("Preencha ao menos uma peça ou serviço com valores válidos.");
      return;
    }
    const kmParsed = km.trim() ? Number.parseInt(km, 10) : null;
    const kmN =
      kmParsed != null && Number.isFinite(kmParsed) && kmParsed >= 0 && kmParsed <= 9999999
        ? kmParsed
        : null;
    const nInst = Math.min(12, Math.max(1, Number.parseInt(cardInstallmentCount, 10) || 1));
    startTransition(() => {
      void (async () => {
        const res = await updateFinalizedReceipt({
          receiptId: props.receiptId,
          lines: parsedLines,
          customerNameSnap: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          vehicleLabel: vehicleLabel.trim(),
          year,
          serviceDate,
          km: kmN,
          pixKey: pixKey.trim(),
          receiptNote: receiptNote.slice(0, 2000),
          paymentMethod,
          cardInstallmentCount:
            paymentMethod === ReceiptPaymentMethod.CARTAO ? nInst : null,
          showGrandTotalOnPdf,
          clientPaidForParts,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setOkMsg(
          "Recibo atualizado. Pode partilhar o PDF de novo — o ficheiro reflete a última gravação.",
        );
        router.refresh();
      })();
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center sm:text-left">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary sm:mx-0">
          <Pencil className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Editar recibo</h1>
        <p className="text-sm text-muted-foreground">
          A placa <span className="font-mono font-medium">{formatPlateDisplay(props.vehicle.plateNormalized)}</span>{" "}
          fica a mesma. Ajuste dados, itens, observação e pagamento, depois guarde. O PDF passa a
          refletir tudo o que grava aqui.
        </p>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href={`/receipts/${props.receiptId}/done`}>Voltar ao ecrã de partilha</a>
        </Button>
      </div>

      <Card className="space-y-4 border-primary/10 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Dados do atendimento</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="edit-cname">Nome do cliente</Label>
            <Input
              id="edit-cname"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="edit-vehicle">Veículo (modelo)</Label>
            <Input
              id="edit-vehicle"
              value={vehicleLabel}
              onChange={(e) => setVehicleLabel(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-year">Ano</Label>
            <Input
              id="edit-year"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-km">Quilometragem</Label>
            <Input
              id="edit-km"
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value)}
            />
          </div>
          <div>
            <Label>Data do serviço</Label>
            <BrazilianDatePicker value={serviceDate} onChange={setServiceDate} />
          </div>
          <div>
            <Label htmlFor="edit-pix">Chave / texto PIX (no recibo)</Label>
            <Input
              id="edit-pix"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-email">E-mail do cliente</Label>
            <Input
              id="edit-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-phone">Telefone do cliente</Label>
            <Input
              id="edit-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 border-primary/10 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Itens (peças e serviços)</h2>
        {lines.map((line, idx) => (
          <LineRow
            key={line.clientId}
            index={idx}
            line={line}
            onChange={(next) =>
              setLines((prev) => prev.map((l) => (l.clientId === line.clientId ? next : l)))
            }
            onRemove={() => {
              setLines((prev) => {
                if (prev.length === 1) return [newReceiptLine()];
                return prev.filter((l) => l.clientId !== line.clientId);
              });
            }}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => setLines((prev) => [...prev, newReceiptLine()])}
        >
          <Plus className="h-4 w-4" />
          Adicionar linha
        </Button>
        <div className="flex flex-col items-end gap-1 border-t border-border/60 pt-3 text-sm">
          <div className="flex items-center justify-end gap-2">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Soma dos itens (prévia):</span>
            <span className="font-semibold tabular-nums">{formatCentsBRL(totalsPreview)}</span>
            {totalsPreview !== props.totalCents ? (
              <span className="text-xs text-muted-foreground">(o guardar actualiza o recibo)</span>
            ) : null}
          </div>
          {clientPaidForParts ? (
            <div className="text-xs">
              <span className="text-muted-foreground">A pagar pelo cliente: </span>
              <span className="font-semibold tabular-nums text-primary">
                {formatCentsBRL(clientDuePreviewCents)}
              </span>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 border-primary/10 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Observação e pagamento no recibo</h2>
        <div>
          <Label htmlFor="edit-note">Observação no recibo (opcional)</Label>
          <p className="mb-1 text-xs text-muted-foreground">
            Aparece no PDF, por baixo dos itens.
          </p>
          <textarea
            id="edit-note"
            value={receiptNote}
            onChange={(e) => setReceiptNote(e.target.value)}
            maxLength={2000}
            rows={4}
            className={cn(
              "flex w-full min-h-[88px] rounded-md border border-input bg-transparent px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Forma de pagamento</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as ReceiptPaymentMethod)}
          >
            <option value={ReceiptPaymentMethod.PIX}>PIX</option>
            <option value={ReceiptPaymentMethod.CARTAO}>Cartão</option>
            <option value={ReceiptPaymentMethod.OUTRO}>Outro</option>
          </select>
        </div>
        {paymentMethod === ReceiptPaymentMethod.CARTAO ? (
          <div>
            <Label htmlFor="edit-insto">Parcelas (cartão)</Label>
            <Input
              id="edit-insto"
              inputMode="numeric"
              value={cardInstallmentCount}
              onChange={(e) => setCardInstallmentCount(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        ) : null}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded"
            checked={showGrandTotalOnPdf}
            onChange={(e) => setShowGrandTotalOnPdf(e.target.checked)}
          />
          <span className="text-sm">Mostrar total geral e resumo de pagamento no PDF</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded"
            checked={clientPaidForParts}
            onChange={(e) => setClientPaidForParts(e.target.checked)}
          />
          <span className="text-sm leading-relaxed">
            <span className="font-medium">O cliente já pagou as peças</span> — o recibo calcula
            o que ainda paga (só mão de obra / serviços) e a mensagem de partilha usa esse valor
          </span>
        </label>
      </Card>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p
          className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          {okMsg}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="w-full gap-2 sm:w-auto"
        loading={pending}
        disabled={pending}
        onClick={onSave}
      >
        Guardar alterações no recibo
      </Button>
    </div>
  );
}
