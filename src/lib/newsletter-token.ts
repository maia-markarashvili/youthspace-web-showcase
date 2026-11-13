import "server-only";
import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

/**
 * გამოწერის გაუქმების ხელმოწერილი ბმული (ticket-token.ts-ის იმავე ნიმუშით).
 *
 * payload-ში **მხოლოდ** გამომწერის uuid ზის — მეილი URL-ში არ ხვდება
 * (ბმული ლოგებში/ისტორიაში PII-ს არ ტოვებს). გასაღები SESSION_SECRET-ისგან
 * ნაწარმოებია (domain separation): ეს ტოკენი ვერასდროს გაივლის admin_session
 * JWT-დ ან QR-ბილეთად და პირიქით.
 *
 * ⚠ ვადა განზრახ **არ აქვს** — დაგზავნილი წერილი წლების მერეც უნდა
 * იძლეოდეს გამოწერის გაუქმების საშუალებას (ვადაგასული ბმული = გამომწერი
 * ხაფანგშია). SESSION_SECRET-ის როტაცია ძველ ბმულებს კლავს; fallback
 * ყოველთვის მფლობელთან წერილია info@youthspace.ge-ზე.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unsubscribeKey(): Uint8Array {
  const { SESSION_SECRET } = serverEnv();
  if (!SESSION_SECRET) return new Uint8Array(0);
  return createHmac("sha256", SESSION_SECRET)
    .update("newsletter-unsub-v1")
    .digest();
}

/**
 * სრული ბმული წერილისთვის. `null` = SESSION_SECRET არ არის (ლოკალური dev) —
 * ასეთ დროს წერილი გაუქმების ბმულის გარეშე იგზავნება და არა ტეხილით.
 */
export async function unsubscribeUrl(
  subscriberId: string,
): Promise<string | null> {
  const key = unsubscribeKey();
  if (key.length === 0) return null;

  const token = await new SignJWT({ id: subscriberId, v: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(key);

  return `${siteConfig.url.replace(/\/$/, "")}/unsubscribe?t=${token}`;
}

/** ტოკენი → გამომწერის id; არასწორი/გაყალბებული ტოკენი = null */
export async function verifyUnsubscribeToken(
  token: string,
): Promise<string | null> {
  const key = unsubscribeKey();
  if (key.length === 0) return null;

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const { id, v } = payload as { id?: unknown; v?: unknown };
    if (v !== 1) return null;
    if (typeof id !== "string" || !UUID_RE.test(id)) return null;
    return id;
  } catch {
    return null;
  }
}
