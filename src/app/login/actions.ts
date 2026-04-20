"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/db";
import { rateLimitOrThrow } from "@/lib/rate-limit";

export async function sendMagicLink(email: string) {
  const normalized = email.trim().toLowerCase();
  await rateLimitOrThrow(`magic:${normalized}`, 5, 60 * 30);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return { ok: false as const, error: "E-mail não autorizado" };
  try {
    await signIn("email", { email: normalized, redirect: false });
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false as const, error: e.message };
    }
    return {
      ok: false as const,
      error:
        "Não foi possível enviar o e-mail agora. Verifique SMTP_HOST, SMTP_USER e SMTP_FROM_EMAIL.",
    };
  }
}
