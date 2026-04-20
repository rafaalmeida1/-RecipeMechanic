import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/db";
import { sendHtmlEmail, smtpErrorToUserMessage } from "@/lib/mail";
import type { Role } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Provedores e lógica que exigem Node (só em `auth.ts`, não no middleware). */
export const authProviders: NextAuthConfig["providers"] = [
  Nodemailer({
    id: "email",
    name: "Email",
    server: {},
    from: process.env.SMTP_FROM_EMAIL
      ? `"${(process.env.SMTP_FROM_NAME ?? "RIBEIROCAR").replace(/["\r\n]/g, "")}" <${process.env.SMTP_FROM_EMAIL}>`
      : (process.env.EMAIL_FROM ?? ""),
    maxAge: 60 * 60 * 24,
    async sendVerificationRequest({ identifier: email, url }) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error("E-mail não autorizado");
      }
      try {
        await sendHtmlEmail({
          to: email,
          subject: "Seu link para entrar no RIBEIROCAR",
          html: `
            <p>Olá,</p>
            <p>Use o link abaixo para entrar no sistema RIBEIROCAR. Ele expira em 24 horas.</p>
            <p><a href="${url}">Entrar no RIBEIROCAR</a></p>
            <p>Se você não solicitou, ignore este e-mail.</p>
          `,
          text: `Entrar no RIBEIROCAR: ${url}`,
        });
      } catch (e) {
        throw new Error(smtpErrorToUserMessage(e));
      }
    },
  }),
  Credentials({
    id: "credentials",
    name: "Senha",
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: user.role,
      };
    },
  }),
];

export const authNodeCallbacks: Required<
  Pick<NonNullable<NextAuthConfig["callbacks"]>, "signIn" | "jwt">
> = {
  async signIn({ user, account }) {
    if (account?.provider === "email" && user.email) {
      const exists = await prisma.user.findUnique({
        where: { email: user.email },
      });
      return Boolean(exists);
    }
    return true;
  },
  async jwt({ token, user, trigger }) {
    if (user) {
      token.sub = user.id;
      const role = (user as { role?: Role }).role;
      if (role) token.role = role;
    }
    if ((!token.role || trigger === "update") && token.sub) {
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { role: true },
      });
      if (dbUser?.role) token.role = dbUser.role;
    }
    return token;
  },
};
