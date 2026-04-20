import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret() {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado");
  return s;
}

export function signReceiptPdfAccess(receiptId: string, ttlSeconds = 60 * 60 * 24 * 30) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${receiptId}.${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

export function verifyReceiptPdfAccess(token: string): { receiptId: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 3) return null;
    const [receiptId, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!receiptId || !Number.isFinite(exp) || !sig) return null;
    if (Date.now() / 1000 > exp) return null;
    const payload = `${receiptId}.${exp}`;
    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { receiptId };
  } catch {
    return null;
  }
}
