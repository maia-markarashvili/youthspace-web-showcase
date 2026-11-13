import "server-only";
import { cookies } from "next/headers";
import { CONSENT_COOKIE, parseConsent } from "@/lib/analytics-consent";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { toggleOn } from "@/lib/site-texts";

/**
 * ეფექტური ანალიტიკის თანხმობა ყიდვის action-ებისთვის (შეკვეთაზე ინახება
 * და CAPI-ს user_data-ს აპირობებს): cookie "yes" → true, "no" → false,
 * cookie არ არის → ბანერი ადმინიდან გამორთულია? (implicit-რეჟიმი,
 * მფლობელის გადაწყვეტილება 2026-09-04). getSiteTexts React.cache-ითაა -
 * request-ში ზედმეტ SELECT-ს არ ამატებს.
 *
 * ცალკე ფაილია (და არა analytics-consent.ts), რომ საზიარო client/server
 * მოდული next/headers-სა და DB-ზე დამოკიდებული არ გახდეს.
 */
export async function effectiveAnalyticsConsent(): Promise<boolean> {
  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
  if (consent !== null) return consent === "yes";
  return !toggleOn(await getSiteTexts(), "shared.cookies.banner");
}
