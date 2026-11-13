import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { siteTexts } from "@/lib/db/schema";

/**
 * ტექსტ-override-ების რუკა — ერთი SELECT per request (React cache,
 * პრეცედენტი: auth/session.ts). გამოყენება: const texts = await getSiteTexts();
 * შემდეგ t(texts, "home.hero.title") site-texts/index.ts-იდან.
 */
export const getSiteTexts = cache(async (): Promise<Map<string, string>> => {
  const rows = await db
    .select({ key: siteTexts.key, value: siteTexts.value })
    .from(siteTexts);
  return new Map(rows.map((row) => [row.key, row.value]));
});

/**
 * იგივე, ოღონდ metadata-სთვის უსაფრთხო: build-ზე რამდენიმე მარშრუტი
 * (redirect-ები და /_not-found) წინასწარ იგება და root-ლეიაუთის metadata-საც
 * ითვლის. DATABASE_URL-ის გარეშე connect.ts production-რეჟიმში throw-ობს,
 * ამიტომ აქ ცარიელი Map ბრუნდება — t() კოდის default-ებს იყენებს და
 * `npm run build` ბაზის გარეშეც გადის.
 */
export async function getSiteTextsSafe(): Promise<Map<string, string>> {
  try {
    return await getSiteTexts();
  } catch {
    return new Map();
  }
}
