import "server-only";
import type { ConsentTexts, PayTexts } from "@/components/purchase/types";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { flittMode } from "@/lib/flitt";
import { t } from "@/lib/site-texts";

/**
 * თანხმობის მოსანიშნების ტექსტები — ცალკე ჰელპერად, რადგან სივრცის
 * დაჯავშნის გვერდს (გადახდა არ აქვს) მხოლოდ ეს სჭირდება.
 */
export async function resolveConsentTexts(): Promise<ConsentTexts> {
  const texts = await getSiteTexts();
  return {
    consentTermsPre: t(texts, "payment.consent.terms.pre"),
    consentTermsLink: t(texts, "payment.consent.terms.link"),
    consentPrivacyPre: t(texts, "payment.consent.privacy.pre"),
    consentPrivacyLink: t(texts, "payment.consent.privacy.link"),
  };
}

/**
 * გადახდის ტექსტები და ბარათის ხილვადობა ყიდვის გვერდებისთვის —
 * ერთი ჰელპერი, რომ სამივე გვერდმა ერთნაირად გამოიძახოს.
 *
 * ხილვადობის წესი:
 *  · credentials არ არის → ბარათი საერთოდ არ ჩანს;
 *  · FLITT_MODE=live → ყველას ჩანს;
 *  · სხვა შემთხვევაში (preview) → მხოლოდ `?pay=card`-ით, ანუ ტესტირებისას
 *    რეალური სტუმარი ბარათის ვარიანტს ვერ ხედავს.
 */
export async function resolvePayContext(searchParams?: {
  pay?: string | string[];
}): Promise<{ cardEnabled: boolean; payTexts: PayTexts }> {
  const texts = await getSiteTexts();
  const mode = flittMode();
  const payParam = Array.isArray(searchParams?.pay)
    ? searchParams.pay[0]
    : searchParams?.pay;

  const cardEnabled =
    mode === "live" || (mode === "preview" && payParam === "card");

  return {
    cardEnabled,
    payTexts: {
      methodLabel: t(texts, "payment.method.label"),
      methodCard: t(texts, "payment.method.card"),
      methodTransfer: t(texts, "payment.method.transfer"),
      redirectNotice: t(texts, "payment.redirect.notice"),
      redirectFallback: t(texts, "payment.redirect.fallback"),
      ...(await resolveConsentTexts()),
    },
  };
}
