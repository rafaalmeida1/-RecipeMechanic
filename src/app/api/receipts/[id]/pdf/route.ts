import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { ReceiptPdfDocument } from "@/pdf/receipt-document";
import { verifyReceiptPdfAccess } from "@/lib/receipt-pdf-token";

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

  const doc = React.createElement(ReceiptPdfDocument, {
    business: {
      legalName: business.legalName,
      cnpj: business.cnpj,
      phone: business.phone,
      email: business.email,
    },
    receipt,
  });
  const buf = await pdf(doc).toBuffer();

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${receipt.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
