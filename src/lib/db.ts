import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

export type D1Credentials = {
  accountId: string;
  databaseId: string;
  token: string;
};

/**
 * A app corre em Node, não em Workers, por isso não existe binding D1 — falamos
 * com o D1 pela API REST da Cloudflare. Cada query é um pedido HTTP, o que conta
 * para o limite global de 1200 pedidos/5 min da API.
 */
export function readD1Credentials(env = process.env): D1Credentials {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const databaseId = env.CLOUDFLARE_DATABASE_ID?.trim();
  const token = env.CLOUDFLARE_D1_TOKEN?.trim();

  const missing = [
    !accountId && "CLOUDFLARE_ACCOUNT_ID",
    !databaseId && "CLOUDFLARE_DATABASE_ID",
    !token && "CLOUDFLARE_D1_TOKEN",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Faltam variáveis de ambiente para ligar ao Cloudflare D1: ${missing.join(", ")}.`,
    );
  }

  return {
    accountId: accountId!,
    databaseId: databaseId!,
    token: token!,
  };
}

/**
 * Cliente avulso para uma base D1 concreta. Os scripts de migração usam isto
 * para apontar ao D1 de ensaio sem tocar na configuração da app.
 */
export function createD1PrismaClient(credentials: D1Credentials): PrismaClient {
  const adapter = new PrismaD1({
    CLOUDFLARE_ACCOUNT_ID: credentials.accountId,
    CLOUDFLARE_DATABASE_ID: credentials.databaseId,
    CLOUDFLARE_D1_TOKEN: credentials.token,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createD1PrismaClient(readD1Credentials());
  }
  return globalForPrisma.prisma;
}

/**
 * O cliente só é construído na primeira utilização. Se fosse construído ao
 * carregar o módulo, o `next build` falhava em qualquer máquina sem as
 * credenciais do D1 — e a compilação não precisa de base de dados.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has: (_target, property) => property in getClient(),
});

export default prisma;
