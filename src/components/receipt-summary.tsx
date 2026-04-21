import Link from "next/link";
import { FileCheck, Share2 } from "lucide-react";
import { formatCentsBRL } from "@/lib/money";
import { formatPlateDisplay } from "@/lib/plate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Receipt, ReceiptLine, Vehicle, Customer } from "@prisma/client";

export function ReceiptSummary({
  receipt,
  pdfUrl,
}: {
  receipt: Receipt & {
    lines: ReceiptLine[];
    vehicle: Vehicle & { customer: Customer };
  };
  pdfUrl: string;
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Finalizado
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Recibo
        </h1>
        <p className="text-sm text-muted-foreground">
          Placa{" "}
          <span className="font-mono font-medium text-foreground">
            {formatPlateDisplay(receipt.vehicle.plateNormalized)}
          </span>{" "}
          · {receipt.serviceDate.toLocaleDateString("pt-BR")}
        </p>
      </header>

      <Card className="space-y-3 border-border/80">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FileCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <div className="font-semibold text-foreground">
              {receipt.customerNameSnap ?? receipt.vehicle.customer.name}
            </div>
            <div className="text-sm text-muted-foreground">{receipt.vehicle.label}</div>
            <div className="mt-2 text-lg font-bold tabular-nums text-primary">
              {formatCentsBRL(receipt.totalCents)}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="gap-2 sm:flex-1" asChild>
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            <FileCheck className="h-4 w-4" />
            Abrir PDF
          </a>
        </Button>
        <Button variant="secondary" className="gap-2 sm:flex-1" asChild>
          <Link href={`/receipts/${receipt.id}/done`}>
            <Share2 className="h-4 w-4" />
            Compartilhar com cliente
          </Link>
        </Button>
      </div>
    </div>
  );
}
