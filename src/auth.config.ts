import type { NextAuthConfig } from "next-auth";

/** Papéis espelhados do Prisma — sem importar `@prisma/client` (Edge). */
export type AppRole = "ADMIN" | "MECHANIC";

/**
 * Configuração compatível com **Edge** (middleware).
 * Sem Prisma, bcrypt ou nodemailer — só JWT/sessão.
 * Provedores e adapter ficam em `src/auth.ts`.
 */
export const authConfig = {
  /** Sessão expira em 24 h; cookie some e o middleware manda de volta ao `/login`. */
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        const role = (user as { role?: AppRole }).role;
        if (role) token.role = role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as AppRole) ?? "MECHANIC";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
