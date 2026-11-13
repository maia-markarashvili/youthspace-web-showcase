import "server-only";
import { headers } from "next/headers";

/**
 * მარტივი in-memory rate limit საჯარო ფორმებისთვის (§11).
 * ერთი instance-ის ფარგლებში მუშაობს — MVP-სთვის საკმარისი; მრავალ-instance
 * deployment-ზე ფაზა 2-ში ჩანაცვლდება საერთო store-ით.
 */
const hits = new Map<string, number[]>();

/**
 * მოთხოვნის IP — ლიმიტების ერთადერთი იდენტიფიკატორი, ამიტომ **არ უნდა
 * ყალბდებოდეს** (უსაფრთხოების აუდიტი, 2026-08-18).
 *
 * ადრე `x-forwarded-for`-ის **პირველ** რგოლს ვიღებდით — ის კი მთლიანად
 * კლიენტის კონტროლშია: `X-Forwarded-For: 1.2.3.4` და ლიმიტი ახალ „IP-ზე"
 * იწყება, ანუ პაროლის გამოცნობა და SMS-ის დაგზავნა ულიმიტო ხდებოდა.
 *
 * სწორი რიგი:
 *  1. `cf-connecting-ip` — Cloudflare მას **თავად გადააწერს**, კლიენტი ვერ ყალბდება
 *     (საიტი Cloudflare-ის უკან დგას);
 *  2. `x-forwarded-for`-ის **ბოლო** რგოლი — ყველაზე ახლო proxy-მ ჩაწერა,
 *     კლიენტს მხოლოდ წინა რგოლების მიწერა შეუძლია;
 *  3. `x-real-ip` (nginx-ის სტილი).
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();

  const cf = headerList.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const last = hops.at(-1);
    if (last) return last;
  }

  return headerList.get("x-real-ip")?.trim() || "unknown";
}

/** `${scope}:${ip}` — ყველა საჯარო action-ს ერთი წყარო, აქამდე 5 ფაილში დუბლირებული */
export async function clientKey(scope: string): Promise<string> {
  return `${scope}:${await clientIp()}`;
}

export function checkRateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 } = {},
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  // მარტივი გასუფთავება, რომ Map უსასრულოდ არ იზარდოს
  if (hits.size > 5000) {
    for (const [entryKey, times] of hits) {
      if (times.every((time) => now - time >= windowMs)) hits.delete(entryKey);
    }
  }

  return true;
}
