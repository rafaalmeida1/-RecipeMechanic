import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { renderFinalizedReceiptPdfBuffer } from "@/lib/pdf/render-receipt-pdf-server";
import { verifyReceiptPdfAccess } from "@/lib/receipt-pdf-token";

/** @react-pdf/renderer precisa do runtime Node (fs, Buffer, layout). Edge quebra o PDF. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const t = url.searchParams.get("t");

  const session = await auth();
  const publicAccess = t ? verifyReceiptPdfAccess(t) : null;
  const allowedByToken = publicAccess?.receiptId === id;
  const allowedBySession = Boolean(session?.user?.id);

  if (!allowedByToken && !allowedBySession) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      vehicle: { include: { customer: true } },
    },
  });

  if (!receipt || receipt.status !== "FINALIZED") {
    return new NextResponse("Recibo não encontrado", { status: 404 });
  }

  const business = await prisma.businessProfile.findFirst();
  if (!business) {
    return new NextResponse("Configuração incompleta", { status: 500 });
  }

  try {
    const buffer = await renderFinalizedReceiptPdfBuffer(receipt, {
      legalName: business.legalName,
      cnpj: business.cnpj,
      phone: business.phone,
      email: business.email,
    });

    if (!buffer.byteLength) {
      return new NextResponse("PDF vazio", { status: 500 });
    }

    // TS 5.9+ generic Buffer/Uint8Array don't match BodyInit in Next's types; runtime is valid.
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-${receipt.id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[api/receipts/pdf]", e);
    return new NextResponse("Erro ao gerar PDF", { status: 500 });
  }
}
