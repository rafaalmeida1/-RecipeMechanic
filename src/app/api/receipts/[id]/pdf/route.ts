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
  const raw = await pdf(doc as Parameters<typeof pdf>[0]).toBuffer();
  let bytes: Uint8Array;
  if (raw instanceof ReadableStream) {
    bytes = new Uint8Array(await new Response(raw).arrayBuffer());
  } else {
    const bin = raw as unknown as ArrayBuffer | ArrayBufferView;
    bytes =
      bin instanceof ArrayBuffer
        ? new Uint8Array(bin)
        : new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
  }

  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${receipt.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
