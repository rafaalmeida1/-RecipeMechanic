"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { isValidUserPassword } from "@/lib/auth-password";
import { sendHtmlEmail, smtpErrorToUserMessage } from "@/lib/mail";

const RESET_TTL_MS = 60 * 60 * 1000;

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export async function requestPasswordReset(
  emailRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.string().email().safeParse(emailRaw.trim().toLowerCase());
  if (!parsed.success) {
    return { ok: false, error: "E-mail inválido." };
  }
  const email = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Mesma mensagem para não revelar e-mails
    return { ok: true };
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, token, expires },
    }),
  ]);

  const link = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendHtmlEmail({
      to: user.email,
      subject: "Redefinir senha — RIBEIROCAR",
      html: `
        <p>Olá,</p>
        <p>Alguém pediu uma nova senha para esta conta. Se fosse você, clique no link (válido por 1 hora):</p>
        <p><a href="${link}">Criar nova senha</a></p>
        <p>Se não pediu, ignore este e-mail. A senha continua a mesma.</p>
        <p><small>Se o botão não abrir, copie e cole no browser:<br/>${link}</small></p>
      `,
      text: `Criar nova senha: ${link}`,
    });
  } catch (e) {
    return { ok: false, error: smtpErrorToUserMessage(e) };
  }
  return { ok: true };
}

const resetSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(1),
});

export async function resetPasswordWithToken(
  data: z.infer<typeof resetSchema>,
): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const parsed = resetSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { token, newPassword } = parsed.data;
  const val = isValidUserPassword(newPassword);
  if (!val.ok) return { ok: false, error: val.error };

  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!row || row.expires < new Date()) {
    return {
      ok: false,
      error: "O link expirou ou é inválido. Peça outro e-mail em «Esqueci minha senha».",
    };
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: hash },
    }),
    prisma.passwordResetToken.delete({ where: { id: row.id } }),
  ]);

  return { ok: true };
}

const changeSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(1),
});

export async function changePassword(
  data: z.infer<typeof changeSchema>,
): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Sessão inválida." };

  const parsed = changeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { newPassword, currentPassword } = parsed.data;
  const val = isValidUserPassword(newPassword);
  if (!val.ok) return { ok: false, error: val.error };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Utilizador não encontrado." };

  if (user.passwordHash) {
    const cur = (currentPassword ?? "").trim();
    if (!cur) {
      return {
        ok: false,
        error: "Digite a senha actual para a substituir.",
      };
    }
    const match = await bcrypt.compare(cur, user.passwordHash);
    if (!match) {
      return { ok: false, error: "Senha actual incorreta." };
    }
  }
  // Sem senha ainda: só o utilizador autenticado (e-mail) pode definir
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
  return { ok: true };
}
