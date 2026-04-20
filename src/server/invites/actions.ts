"use server";

import { createHash, randomBytes } from "node:crypto";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";

function hashInviteToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Sem permissão");
  }
  return session.user;
}

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MECHANIC"]),
});

export async function createInvite(input: z.infer<typeof createSchema>) {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };

  const email = parsed.data.email.toLowerCase();
  const token = randomBytes(24).toString("hex");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.invite.deleteMany({ where: { email, consumedAt: null } });

  await prisma.invite.create({
    data: {
      email,
      role: parsed.data.role as Role,
      tokenHash,
      expiresAt,
      createdById: admin.id,
    },
  });

  const origin =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const url = `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
  return { ok: true as const, url };
}

export async function listInvites() {
  await requireAdmin();
  return prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

const acceptSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6).max(72),
});

export async function acceptInvite(input: z.infer<typeof acceptSchema>) {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };

  const tokenHash = hashInviteToken(parsed.data.token);
  const invite = await prisma.invite.findFirst({
    where: {
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!invite) return { ok: false as const, error: "Convite inválido ou expirado" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { email: invite.email },
      create: {
        email: invite.email,
        role: invite.role,
        passwordHash,
      },
      update: {
        role: invite.role,
        passwordHash,
      },
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date() },
    });
  });

  return { ok: true as const };
}
