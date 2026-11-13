/**
 * საიტის ტექსტების რეესტრი — ერთადერთი წყარო იმისა, თუ რომელი ტექსტია
 * ადმინიდან შეცვლადი. default-ები აქ ცხოვრობს, DB (site_texts) მხოლოდ
 * override-ებს ინახავს; t() ჯერ override-ს ეძებს, მერე default-ს.
 * წმინდა მოდულია (server-only არ არის) — client-კომპონენტებმაც შეიძლება
 * მიიღონ ლეიბლები props-ით, DB-ს კი მხოლოდ queries/site-texts.ts ეკითხება.
 */
import { aboutTexts } from "./registry/about";
import { accountTexts } from "./registry/account";
import { clubsTexts } from "./registry/clubs";
import { contactTexts } from "./registry/contact";
import { coursesTexts } from "./registry/courses";
import { dropinTexts } from "./registry/dropin";
import { emailTexts } from "./registry/email";
import { homeTexts } from "./registry/home";
import { membershipTexts } from "./registry/membership";
import { menuTexts } from "./registry/menu";
import { partnerTexts } from "./registry/partner";
import { paymentTexts } from "./registry/payment";
import { privacyTexts } from "./registry/privacy";
import { searchTexts } from "./registry/search";
import { seoTexts } from "./registry/seo";
import { sharedTexts } from "./registry/shared";
import { smsTexts } from "./registry/sms";
import { spacesTexts } from "./registry/spaces";
import { storiesTexts } from "./registry/stories";
import { termsTexts } from "./registry/terms";
import { testsTexts } from "./registry/tests";
import { ticketTexts } from "./registry/ticket";
import type { TextEntry, TextGroup } from "./types";

/** ადმინის ტაბების თანმიმდევრობა */
export const TEXT_GROUPS: TextGroup[] = [
  menuTexts,
  seoTexts,
  homeTexts,
  aboutTexts,
  clubsTexts,
  coursesTexts,
  spacesTexts,
  dropinTexts,
  membershipTexts,
  accountTexts,
  storiesTexts,
  testsTexts,
  searchTexts,
  contactTexts,
  partnerTexts,
  paymentTexts,
  privacyTexts,
  termsTexts,
  smsTexts,
  emailTexts,
  ticketTexts,
  sharedTexts,
];

export const REGISTRY: Record<string, TextEntry> = Object.fromEntries(
  TEXT_GROUPS.flatMap((group) => group.entries).map((entry) => [
    entry.key,
    entry,
  ]),
);

/** override ?? default; უცნობი key თვალშისაცემად ბრუნდება key-დვე */
export function t(texts: ReadonlyMap<string, string>, key: string): string {
  return texts.get(key) ?? REGISTRY[key]?.default ?? key;
}

/** toggle-ჩანაწერი (kind: "toggle"): შენახული "" = გამორთული (disablable-
 *  სემანტიკა), რიგი არ არის = default (მაგ. "on") = ჩართული */
export function toggleOn(
  texts: ReadonlyMap<string, string>,
  key: string,
): boolean {
  return t(texts, key) !== "";
}

export type { TextEntry, TextGroup, TextKind } from "./types";
