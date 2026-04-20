"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { sendHtmlEmail, smtpErrorToUserMessage } from "@/lib/mail";
import { signReceiptPdfAccess } from "@/lib/receipt-pdf-token";
import { normalizePlate } from "@/lib/plate";
import { z } from "zod";

const lineSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(9999),
  unitCents: z.number().int().min(0),
});

const step2Schema = z.object({
  plate: z.string().min(5).max(12),
  customerName: z.string().min(1).max(120),
  vehicleLabel: z.string().min(1).max(120),
  year: z.string().optional(),
  km: z.string().optional(),
  serviceDate: z.string().min(8),
  pixKey: z.string().min(1).max(120),
  customerEmail: z.union([z.literal(""), z.string().email()]).default(""),
  customerPhone: z.string().max(40).default(""),
});

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user;
}

export async function lookupPlate(plate: string) {
  await requireUser();
  const normalized = normalizePlate(plate);
  if (normalized.length < 5) return { ok: false as const, error: "Placa inválida" };
  const vehicle = await prisma.vehicle.findUnique({
    where: { plateNormalized: normalized },
    include: { customer: true },
  });
  return {
    ok: true as const,
    normalized,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          label: vehicle.label,
          year: vehicle.year,
          customer: {
            id: vehicle.customer.id,
            name: vehicle.customer.name,
            email: vehicle.customer.email,
            phone: vehicle.customer.phone,
          },
        }
      : null,
  };
}

export async function createReceiptDraft(input: z.infer<typeof step2Schema>) {
  await requireUser();
  const parsed = step2Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Dados inválidos" };
  }
  const data = parsed.data;
  const plate = normalizePlate(data.plate);
  const serviceDate = new Date(`${data.serviceDate}T12:00:00`);
  const yearParsed =
    data.year && data.year.trim()
      ? Number.parseInt(data.year, 10)
      : null;
  const year =
    yearParsed && Number.isFinite(yearParsed) && yearParsed >= 1950 && yearParsed <= 2035
      ? yearParsed
      : null;
  const kmParsed =
    data.km && data.km.trim() ? Number.parseInt(data.km, 10) : null;
  const km =
    kmParsed && Number.isFinite(kmParsed) && kmParsed >= 0 && kmParsed <= 9999999
      ? kmParsed
      : null;

  const receipt = await prisma.$transaction(async (tx) => {
    let vehicle = await tx.vehicle.findUnique({
      where: { plateNormalized: plate },
      include: { customer: true },
    });

    if (!vehicle) {
      const customer = await tx.customer.create({
        data: {
          name: data.customerName,
          email: data.customerEmail || null,
          phone: data.customerPhone || null,
        },
      });
      vehicle = await tx.vehicle.create({
        data: {
          plateNormalized: plate,
          label: data.vehicleLabel,
          year,
          customerId: customer.id,
        },
        include: { customer: true },
      });
    } else {
      await tx.customer.update({
        where: { id: vehicle.customerId },
        data: {
          name: data.customerName,
          email: data.customerEmail || null,
          phone: data.customerPhone || null,
        },
      });
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: {
          label: data.vehicleLabel,
          year,
        },
      });
      vehicle = await tx.vehicle.findUniqueOrThrow({
        where: { id: vehicle.id },
        include: { customer: true },
      });
    }

    return tx.receipt.create({
      data: {
        vehicleId: vehicle.id,
        km,
        serviceDate,
        pixKey: data.pixKey,
        customerNameSnap: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        status: "DRAFT",
      },
    });
  });

  revalidatePath("/receipts");
  return { ok: true as const, receiptId: receipt.id };
}

const draftSchema = z.object({
  receiptId: z.string().min(1),
  lines: z.array(lineSchema).max(200),
  customerNameSnap: z.string().min(1).max(120).optional(),
  customerEmail: z.string().email().optional().or(z.literal("")).optional(),
  customerPhone: z.string().max(40).optional().or(z.literal("")).optional(),
  km: z.number().int().min(0).max(9999999).nullable().optional(),
  pixKey: z.string().min(1).max(120).optional(),
});

export async function saveReceiptDraft(input: z.infer<typeof draftSchema>) {
  await requireUser();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Rascunho inválido" };

  const { receiptId, lines, ...rest } = parsed.data;
  const existing = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!existing || existing.status !== "DRAFT") {
    return { ok: false as const, error: "Recibo não encontrado" };
  }

  const computedLines = lines.map((l, idx) => {
    const lineTotalCents = l.qty * l.unitCents;
    return {
      description: l.description,
      qty: l.qty,
      unitCents: l.unitCents,
      lineTotalCents,
      sortOrder: idx,
    };
  });

  const totalCents = computedLines.reduce((s, l) => s + l.lineTotalCents, 0);

  await prisma.$transaction(async (tx) => {
    await tx.receiptLine.deleteMany({ where: { receiptId } });
    if (computedLines.length) {
      await tx.receiptLine.createMany({
        data: computedLines.map((l) => ({
          receiptId,
          description: l.description,
          qty: l.qty,
          unitCents: l.unitCents,
          lineTotalCents: l.lineTotalCents,
          sortOrder: l.sortOrder,
        })),
      });
    }
    await tx.receipt.update({
      where: { id: receiptId },
      data: {
        totalCents,
        ...(rest.customerNameSnap
          ? { customerNameSnap: rest.customerNameSnap }
          : {}),
        ...(rest.customerEmail !== undefined
          ? { customerEmail: rest.customerEmail || null }
          : {}),
        ...(rest.customerPhone !== undefined
          ? { customerPhone: rest.customerPhone || null }
          : {}),
        ...(rest.km !== undefined ? { km: rest.km } : {}),
        ...(rest.pixKey ? { pixKey: rest.pixKey } : {}),
      },
    });
  });

  return { ok: true as const, totalCents };
}

export async function finalizeReceipt(receiptId: string) {
  await requireUser();
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { lines: true },
  });
  if (!receipt || receipt.status !== "DRAFT") {
    return { ok: false as const, error: "Recibo inválido" };
  }
  if (receipt.lines.length === 0) {
    return { ok: false as const, error: "Adicione ao menos uma peça ou serviço" };
  }

  const totalCents = receipt.lines.reduce((s, l) => s + l.lineTotalCents, 0);

  await prisma.receipt.update({
    where: { id: receiptId },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      totalCents,
    },
  });

  revalidatePath(`/receipts/${receiptId}`);
  return { ok: true as const };
}

export async function sendReceiptPdfEmail(receiptId: string) {
  const user = await requireUser();
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { lines: true, vehicle: { include: { customer: true } } },
  });
  if (!receipt || receipt.status !== "FINALIZED") {
    return { ok: false as const, error: "Recibo não finalizado" };
  }
  const to = receipt.customerEmail;
  if (!to) return { ok: false as const, error: "Cliente sem e-mail" };

  const origin =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const token = signReceiptPdfAccess(receiptId);
  const pdfUrl = `${origin}/api/receipts/${receiptId}/pdf?t=${encodeURIComponent(token)}`;

  try {
    await sendHtmlEmail({
      to,
      subject: "Seu recibo RIBEIROCAR",
      html: `
      <p>Olá,</p>
      <p>Segue o link para baixar o PDF do seu recibo:</p>
      <p><a href="${pdfUrl}">Baixar recibo (PDF)</a></p>
      <p>Atenciosamente,<br/>RIBEIROCAR</p>
    `,
      text: `Baixar recibo: ${pdfUrl}`,
    });
  } catch (e) {
    return { ok: false as const, error: smtpErrorToUserMessage(e) };
  }

  await prisma.receipt.update({
    where: { id: receiptId },
    data: { emailSentAt: new Date() },
  });

  revalidatePath(`/receipts/${receiptId}/done`);
  void user;
  return { ok: true as const };
}

export async function suggestParts(query: string) {
  await requireUser();
  const q = query.trim();
  if (q.length < 2) return [] as string[];
  const safe = q.replace(/[%_]/g, "");
  const pattern = `%${safe}%`;
  const rows = await prisma.$queryRaw<{ description: string }[]>(
    Prisma.sql`
      SELECT rl.description AS description
      FROM "ReceiptLine" rl
      INNER JOIN "Receipt" r ON r.id = rl."receiptId"
      WHERE r.status = 'FINALIZED'
        AND rl.description ILIKE ${pattern}
      GROUP BY rl.description
      ORDER BY COUNT(*) DESC
      LIMIT 12
    `,
  );
  return rows.map((r) => r.description);
}

export async function searchClients(query: string) {
  await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];
  const plate = normalizePlate(q);
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        {
          vehicles: {
            some: {
              OR: [
                { plateNormalized: { contains: plate, mode: "insensitive" } },
                { label: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    },
    include: {
      vehicles: {
        include: {
          receipts: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { lines: { take: 5, orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
    take: 15,
  });
  return customers;
}
