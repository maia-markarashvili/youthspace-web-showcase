import "server-only";
import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

/**
 * QR-ბილეთის ხელმოწერილი ტოკენი — payload-ში **მხოლოდ** ტიპი და uuid ზის
 * (არც PII, არც orderRef). ბილეთის ბმულს იღებს მომხმარებელი მეილით;
 * QR-ში კი ადმინის deep-link წერია (/admin/desk?scan=<token>), რომელიც
 * staff-სესიის გარეშე არაფერს ხსნის.
 *
 * გასაღები SESSION_SECRET-ისგან **ნაწარმოებია** (domain separation):
 * ბილეთის ტოკენი ვერასდროს გაივლის admin_session JWT-დ და პირიქით.
 * ⚠ SESSION_SECRET-ის როტაცია ყველა გაცემულ QR-ს აუქმებს — მისაღებია,
 * fallback ყოველთვის მანუალური ძებნაა + „კოდის გაგზავნა" ღილაკი.
 *
 * ვადა defense-in-depth-ია: მიღების ვერდიქტი ყოველთვის ცოცხალ ბაზას
 * კითხულობს, ამიტომ გაუქმება/ამოწურვა ტოკენის ვადაზე არაა დამოკიდებული.
 */

export type TicketKind = "booking" | "pass" | "subscription";

/** მზა ბილეთის აღწერა notify-* ფუნქციებისთვის — {qrUrl} ამისგან იგება */
export type TicketRef = { kind: TicketKind; id: string; expiresAt: Date };

const TICKET_KINDS: readonly string[] = ["booking", "pass", "subscription"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DAY_MS = 24 * 60 * 60 * 1000;

function ticketKey(): Uint8Array {
  const { SESSION_SECRET } = serverEnv();
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET აუცილებელია QR-ბილეთებისთვის (.env.local)");
  }
  return createHmac("sha256", SESSION_SECRET)
    .update("ticket-token-v1")
    .digest();
}

export async function mintTicketToken(
  kind: TicketKind,
  id: string,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ k: kind, id, v: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(ticketKey());
}

export async function verifyTicketToken(
  token: string,
): Promise<{ kind: TicketKind; id: string } | null> {
  try {
    const { payload } = await jwtVerify(token, ticketKey(), {
      algorithms: ["HS256"],
    });
    const { k, id, v } = payload as { k?: unknown; id?: unknown; v?: unknown };
    if (v !== 1) return null;
    if (typeof k !== "string" || !TICKET_KINDS.includes(k)) return null;
    if (typeof id !== "string" || !UUID_RE.test(id)) return null;
    return { kind: k as TicketKind, id };
  } catch {
    return null;
  }
}

/**
 * ტოკენის ვადა სამიზნის ტიპის მიხედვით:
 *  · dropin/space ჯავშანი — ჯავშნის დღის ბოლო (თბილისით) + 1 დღე მარაგი
 *  · კურსის ჯავშანი — bookingDate ყიდვის დღეა და არა ვიზიტისა, ამიტომ
 *    ფიქსირებული გრძელი ფანჯარაა (კურსი კვირეებს გრძელდება)
 *  · პასი — პასის ვადა + 7 დღე
 *  · გამოწერა — QR სტაბილურია გამოწერის რიგზე (განახლება იმავე რიგს
 *    აცოცხლებს), ამიტომ გრძელი ვადა აქვს
 */
export function ticketExpiry(
  basis:
    | { kind: "booking"; itemType: string; bookingDate: string }
    | { kind: "pass"; expiresAt: Date }
    | { kind: "subscription" },
): Date {
  if (basis.kind === "booking") {
    if (basis.itemType === "course") {
      return new Date(Date.now() + 200 * DAY_MS);
    }
    return new Date(
      new Date(`${basis.bookingDate}T23:59:59+04:00`).getTime() + DAY_MS,
    );
  }
  if (basis.kind === "pass") {
    return new Date(basis.expiresAt.getTime() + 7 * DAY_MS);
  }
  return new Date(Date.now() + 400 * DAY_MS);
}

/** ბილეთის საჯარო ბმული მეილისთვის — {qrUrl} ტოკენის მნიშვნელობა */
export async function ticketUrl(
  kind: TicketKind,
  id: string,
  expiresAt: Date,
): Promise<string> {
  const token = await mintTicketToken(kind, id, expiresAt);
  return `${siteConfig.url}/ticket/${token}`;
}
