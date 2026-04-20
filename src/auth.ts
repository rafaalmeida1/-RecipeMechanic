import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db";
import { authConfig } from "@/auth.config";
import { authNodeCallbacks, authProviders } from "@/auth.providers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  ...authConfig,
  providers: authProviders,
  callbacks: {
    ...authConfig.callbacks,
    async signIn(...args) {
      return authNodeCallbacks.signIn(...args);
    },
    async jwt(...args) {
      return authNodeCallbacks.jwt(...args);
    },
  },
});
