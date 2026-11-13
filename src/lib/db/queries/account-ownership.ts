import "server-only";
import { and, inArray, isNull, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { normalizePhoneDigits } from "@/lib/phone";

/**
 * „მიბმულია ამ ანგარიშზე" ბმის წესი — ერთი წყარო კაბინეტის ჩვენებisთვის
 * (queries/account.ts) და კაბინეტიდან გაუქმებisთვის (mutations/self-cancel.ts):
 * ის უქმდება, რაც საკუთარ კაბინეტში ჩანს, მეტი არაფერი.
 *
 * ორი წყარო: profile_id-ით მიბმული ყიდვები + ძველი/სტუმრის ყიდვები
 * (profile_id IS NULL), რომლებიც ანგარიშის **დადასტურებულ** ელფოსტას ან
 * ტელეფონს ემთხვევა. ⚠ მხოლოდ თავად ანგარიშის დადასტურებული არხები -
 * შვილის პროფილში ხელით ჩაწერილი ნომერი აქ არ მონაწილეობს.
 */

/** ბოლო 9 ციფრის შედარება — desk.ts/otp.ts-ის იგივე პატერნი */
export function phoneMatches(column: PgColumn, digits: string) {
  return sql`right(regexp_replace(${column}, '\\D', '', 'g'), 9) = ${digits}`;
}

export function emailMatches(column: PgColumn, email: string) {
  return sql`lower(${column}) = ${email}`;
}

/** ანგარიშის დადასტურებული არხები legacy-ბმისთვის */
export function verifiedChannels(account: {
  email: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
}): { verifiedEmail: string | null; verifiedDigits: string | null } {
  return {
    verifiedEmail: account.emailVerifiedAt ? account.email.toLowerCase() : null,
    verifiedDigits:
      account.phoneVerifiedAt && account.phone
        ? normalizePhoneDigits(account.phone)
        : null,
  };
}

export function buildOwnedBy(opts: {
  profileIds: string[];
  verifiedEmail: string | null;
  verifiedDigits: string | null;
}) {
  return function ownedBy(
    profileCol: PgColumn,
    phoneCol: PgColumn,
    emailCol: PgColumn,
  ) {
    const legacy = [];
    if (opts.verifiedDigits) {
      legacy.push(phoneMatches(phoneCol, opts.verifiedDigits));
    }
    if (opts.verifiedEmail) {
      legacy.push(emailMatches(emailCol, opts.verifiedEmail));
    }

    const linked =
      opts.profileIds.length > 0
        ? inArray(profileCol, opts.profileIds)
        : sql`false`;

    if (legacy.length === 0) return linked;
    return or(linked, and(isNull(profileCol), or(...legacy)));
  };
}
