import Redis from "ioredis";

let client: Redis | null = null;

function attachErrorHandler(r: Redis) {
  r.on("error", (err) => {
    console.error("[redis]", err.message);
  });
}

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    attachErrorHandler(client);
  }
  return client;
}
