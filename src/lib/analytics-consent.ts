/**
 * ანალიტიკის/მარკეტინგის თანხმობა (ეტაპი 5, 2026-09-03) — წმინდა მოდული:
 * კლიენტიც იყენებს (ბანერი, პიქსელი/GA) და სერვერიც (layouts, ყიდვის
 * action-ები cookies()-ით).
 *
 * წესები (მფლობელის სპეციფიკაცია):
 *  · თანხმობამდე arc Meta Pixel და arc GA არ იტვირთება;
 *  · „უარი" = არასდროს იტვირთება + Meta/GA-ს პირველადი ქუქიები იშლება;
 *  · არჩევანი 12 თვე ინახება, ფუტერიდან ერთი კლიკით გამოიხმობა;
 *  · ყიდვისას მდგომარეობა შეკვეთას მიჰყვება (analytics_consent სვეტი) და
 *    CAPI user_data მხოლოდ თანხმობისას იგზავნება.
 */

export const CONSENT_COOKIE = "analytics_consent";
export const CONSENT_MAX_AGE_S = 365 * 24 * 60 * 60;
/** ბანერი/პიქსელი/GA ერთმანეთს ამით ატყობინებენ ცვლილებას (reload-ის გარეშე) */
export const CONSENT_EVENT = "analytics-consent-change";

export type ConsentState = "yes" | "no" | null;

export function parseConsent(raw: string | undefined | null): ConsentState {
  return raw === "yes" || raw === "no" ? raw : null;
}

/* ── implicit-რეჟიმი (2026-09-04) ──────────────────────────────────
   ადმინის toggle-ით (shared.cookies.banner) ბანერი შეიძლება გამოირთოს;
   მაშინ cookie-ს გარეშე ვიზიტორზე ანალიტიკა ავტომატურად ირთვება
   (მფლობელის გადაწყვეტილება). ცხადი "yes"/"no" ყოველთვის იმარჯვებს. */

let implicitConsent = false;

/** layout-პროპიდან, კომპონენტის render-ფაზაში (ეფექტებამდე); იდემპოტენტური */
export function setImplicitConsent(value: boolean): void {
  implicitConsent = value;
}

/** ეფექტური თანხმობა ივენთების გეიტებისთვის: cookie "yes" → true,
 *  "no" → false, არ არსებობს → implicit-რეჟიმის დროშა */
export function hasAnalyticsConsent(): boolean {
  const consent = readConsent();
  if (consent === "yes") return true;
  if (consent === "no") return false;
  return implicitConsent;
}

/* ── მხოლოდ ბრაუზერში ─────────────────────────────────────────── */

export function readConsent(): ConsentState {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE}=(yes|no)`),
  );
  return parseConsent(match?.[1]);
}

export function writeConsent(value: "yes" | "no"): void {
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE_S}; samesite=lax; secure`;
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** ფუტერის „ქუქიების პარამეტრები" — არჩევანი ცარიელდება და ბანერი ბრუნდება */
export function resetConsent(): void {
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`;
  deleteAnalyticsCookies();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Meta/GA-ს პირველადი ქუქიების საუკეთესო-ძალისხმევით წაშლა „უარზე" */
export function deleteAnalyticsCookies(): void {
  const names = document.cookie
    .split("; ")
    .map((part) => part.split("=")[0])
    .filter(
      (name) =>
        name === "_fbp" ||
        name === "_fbc" ||
        name === "_ga" ||
        name.startsWith("_ga_"),
    );
  const host = window.location.hostname;
  const apex = host.replace(/^www\./, "");
  for (const name of names) {
    for (const domain of ["", `; domain=${host}`, `; domain=.${apex}`]) {
      document.cookie = `${name}=; path=/; max-age=0${domain}`;
    }
  }
}
