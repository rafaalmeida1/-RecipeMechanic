import { getRedis } from "./redis";

export async function rateLimitOrThrow(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const k = `rl:${key}`;
  try {
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, windowSeconds);
    if (n > limit) {
      throw new Error(
        "Muitas tentativas. Aguarde um pouco e tente novamente.",
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Muitas tentativas")) {
      throw e;
    }
    console.error("[rate-limit] redis indisponível ou credenciais inválidas:", e);
    return;
  }
}
