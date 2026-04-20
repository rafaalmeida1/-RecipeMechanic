"use server";

import { revalidatePath } from "next/cache";
import { ReceiptPdfTheme } from "@prisma/client";
import { auth } from "@/auth";
import prisma from "@/lib/db";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user;
}

export async function setReceiptPdfTheme(receiptId: string, pdfTheme: ReceiptPdfTheme) {
  await requireUser();
  const existing = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!existing) {
    return { ok: false as const, error: "Recibo não encontrado" };
  }
  await prisma.receipt.update({
    where: { id: receiptId },
    data: { pdfTheme },
  });
  revalidatePath(`/receipts/${receiptId}`);
  revalidatePath(`/receipts/${receiptId}/done`);
  return { ok: true as const };
}
