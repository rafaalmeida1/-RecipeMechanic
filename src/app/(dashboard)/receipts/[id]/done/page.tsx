import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";
import { ReceiptDonePanel } from "@/components/receipt-done-panel";
import { getClientAmountDueCents } from "@/lib/receipt-totals";
import { signReceiptPdfAccess } from "@/lib/receipt-pdf-token";

export default async function ReceiptDonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { vehicle: true, lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!receipt) notFound();
  if (receipt.status !== "FINALIZED") redirect(`/receipts/${id}`);

  const origin =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const token = signReceiptPdfAccess(receipt.id);
  const pdfUrl = `${origin}/api/receipts/${receipt.id}/pdf?t=${encodeURIComponent(token)}`;

  const clientAmountDueCents = getClientAmountDueCents(
    receipt.clientPaidForParts,
    receipt.totalCents,
    receipt.lines,
  );

  return (
    <ReceiptDonePanel
      receiptId={receipt.id}
      customerEmail={receipt.customerEmail}
      plateNormalized={receipt.vehicle.plateNormalized}
      serviceDateISO={receipt.serviceDate.toISOString()}
      totalCents={receipt.totalCents}
      clientAmountDueCents={clientAmountDueCents}
      pdfUrl={pdfUrl}
      pdfTheme={receipt.pdfTheme}
    />
  );
}
