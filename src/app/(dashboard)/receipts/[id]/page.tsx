import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { ReceiptLinesEditor } from "@/components/receipt-lines-editor";
import { ReceiptSummary } from "@/components/receipt-summary";
import { signReceiptPdfAccess } from "@/lib/receipt-pdf-token";

export default async function ReceiptPage({
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

  const origin =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const token = signReceiptPdfAccess(receipt.id);
  const pdfUrl = `${origin}/api/receipts/${receipt.id}/pdf?t=${encodeURIComponent(token)}`;

  if (receipt.status === "DRAFT") {
    return (
      <ReceiptLinesEditor
        receiptId={receipt.id}
        initialLines={receipt.lines.map((l) => ({
          kind: l.kind,
          description: l.description,
          qty: l.qty,
          unitCents: l.unitCents,
        }))}
      />
    );
  }

  return <ReceiptSummary receipt={receipt} pdfUrl={pdfUrl} />;
}
