import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";
import { ReceiptEditForm } from "@/components/receipt-edit-form";
import { toDateInputValue } from "@/lib/receipt-dates";

export default async function ReceiptEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      vehicle: { include: { customer: true } },
    },
  });
  if (!receipt) notFound();
  if (receipt.status !== "FINALIZED") {
    redirect(`/receipts/${receipt.id}`);
  }

  return (
    <ReceiptEditForm
      receiptId={receipt.id}
      serviceDate={toDateInputValue(receipt.serviceDate)}
      totalCents={receipt.totalCents}
      receiptNote={receipt.receiptNote}
      paymentMethod={receipt.paymentMethod}
      cardInstallmentCount={receipt.cardInstallmentCount}
      showGrandTotalOnPdf={receipt.showGrandTotalOnPdf}
      clientPaidForParts={receipt.clientPaidForParts}
      customerNameSnap={receipt.customerNameSnap}
      customerEmail={receipt.customerEmail}
      customerPhone={receipt.customerPhone}
      km={receipt.km}
      pixKey={receipt.pixKey}
      initialLines={receipt.lines.map((l) => ({
        kind: l.kind,
        description: l.description,
        qty: l.qty,
        unitCents: l.unitCents,
      }))}
      vehicle={receipt.vehicle}
    />
  );
}
