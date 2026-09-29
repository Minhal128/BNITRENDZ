import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { prisma } from "./prisma";

// OWASP-recommended scrypt cost: N=2^15, r=8, p=3 (~32 MiB per hash).
const SCRYPT: ScryptOptions = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

const derive = (password: string, salt: Buffer, length: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, length, SCRYPT, (err, key) => (err ? reject(err) : resolve(key))),
  );

// ponytail: cost params are fixed, so the stored format is just "salt:hash"; add a version prefix if they ever change.
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await derive(password, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  return timingSafeEqual(await derive(password, Buffer.from(salt, "hex"), expected.length), expected);
}

/**
 * Fixed-window counter kept in Postgres so every serverless instance shares it.
 * Returns false once `key` has been seen more than `limit` times in the window.
 * ponytail: one upsert per request is fine for spam/brute-force protection; move to Redis if traffic makes this table hot.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const id = createHash("sha256").update(key).digest("hex"); // never store raw IPs
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${id}, 1, now() + ${windowSeconds}::int * interval '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return row.count <= limit;
}

// Vercel overwrites x-forwarded-for with the real client address.
export const clientIp = (headers: Headers) =>
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";

/** CSRF check for cookie-authenticated mutations, mirroring Next.js's own Server Action origin check. */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // browsers always send Origin on cross-site mutations; other clients carry no session cookie
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
