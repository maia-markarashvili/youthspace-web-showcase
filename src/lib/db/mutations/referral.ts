import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/connect";
import { occupiesSeatCondition } from "@/lib/db/queries/availability";
import {
  referralCredits,
  subscriptions,
  type PricingSettings,
  type ReferralCredit,
} from "@/lib/db/schema";
import { normalizePhoneDigits } from "@/lib/phone";

/**
 * „მოიყვანე მეგობარი" — კრედიტების სასიცოცხლო ციკლი:
 *   pending   → მოწვეულის ყიდვა შეიქმნა ვალიდური კოდით
 *   available → მოწვეულის გამოწერა დადასტურდა (ფული რეალურად შემოვიდა)
 *   used      → მომყვანმა ფასდაკლებული თვე გახარჯა (განახლება/ახალი ყიდვა)
 *   cancelled → მოწვეულის გამოწერა გაუქმდა available-მდე ან მის შემდეგ
 *
 * მომყვანი ყოველთვის subscription_id-თი იდენტიფიცირდება — ეს რიგი
 * განახლებებს შორის უცვლელია, ტელეფონის სტრიქონი კი არა.
 */

/** ტრანზაქციის ან პირდაპირი კავშირის საერთო ტიპი */
export type DbLike = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/** ვალიდაციის ცნობადი შეცდომა — ველის შეცდომად ითარგმნება ფორმაში */
export class ReferralError extends Error {}

export type ResolvedReferral = {
  referrerSubscriptionId: string;
  percent: number;
};

/**
 * კოდის რეზოლუცია მოწვეულის ყიდვისას. აგდებს ReferralError-ს, თუ:
 *  · კოდი უცნობია ან კლუბ-გამოწერას არ ეკუთვნის
 *  · მომყვანის გამოწერა ადგილს აღარ იკავებს (გრეისს მიღმაა/გაუქმდა)
 *  · მყიდველი საკუთარ კოდს იყენებს (იგივე ნომერი)
 */
export async function resolveReferral(
  tx: DbLike,
  code: string,
  refereePhone: string,
  settings: PricingSettings,
): Promise<ResolvedReferral> {
  const percent = settings.referralDiscountPercent;
  if (percent <= 0) {
    throw new ReferralError("მეგობრის კოდი ამჟამად არ მოქმედებს.");
  }

  const [referrer] = await tx
    .select({
      id: subscriptions.id,
      phone: subscriptions.subscriberPhone,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.orderRef, code),
        eq(subscriptions.planType, "club"),
        occupiesSeatCondition(settings),
      ),
    )
    .limit(1);

  if (!referrer) {
    throw new ReferralError("კოდი ვერ მოიძებნა - გადაამოწმე მეგობართან.");
  }
  if (
    normalizePhoneDigits(referrer.phone) === normalizePhoneDigits(refereePhone)
  ) {
    throw new ReferralError("საკუთარი კოდით ფასდაკლება არ მოქმედებს.");
  }

  return { referrerSubscriptionId: referrer.id, percent };
}

/** მოწვეულის დადასტურება → მისი მოყვანის კრედიტი ხელმისაწვდომი ხდება */
export async function activateCreditsForReferee(
  tx: DbLike,
  refereeSubscriptionId: string,
): Promise<void> {
  await tx
    .update(referralCredits)
    .set({ status: "available" })
    .where(
      and(
        eq(referralCredits.refereeSubscriptionId, refereeSubscriptionId),
        eq(referralCredits.status, "pending"),
      ),
    );
}

/** მოწვეულის გაუქმება → გამოუყენებელი კრედიტიც უქმდება */
export async function cancelCreditsForReferee(
  tx: DbLike,
  refereeSubscriptionId: string,
): Promise<void> {
  await tx
    .update(referralCredits)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(referralCredits.refereeSubscriptionId, refereeSubscriptionId),
        inArray(referralCredits.status, ["pending", "available"]),
      ),
    );
}

/**
 * ერთი (უძველესი) ხელმისაწვდომი კრედიტის გახარჯვა — „3 მეგობარი = 3
 * ფასდაკლებული თვე, სათითაოდ". სტატუსის where-პირობა იდემპოტენტურს ხდის:
 * პარალელური განახლება ერთსა და იმავე კრედიტს ორჯერ ვერ გახარჯავს.
 * აბრუნებს გახარჯულ კრედიტს ან null-ს.
 */
export async function consumeCredit(
  tx: DbLike,
  referrerSubscriptionId: string,
): Promise<ReferralCredit | null> {
  const [credit] = await tx
    .select()
    .from(referralCredits)
    .where(
      and(
        eq(referralCredits.referrerSubscriptionId, referrerSubscriptionId),
        eq(referralCredits.status, "available"),
      ),
    )
    .orderBy(asc(referralCredits.createdAt))
    .limit(1);
  if (!credit) return null;

  const [updated] = await tx
    .update(referralCredits)
    .set({ status: "used", usedAt: new Date() })
    .where(
      and(
        eq(referralCredits.id, credit.id),
        eq(referralCredits.status, "available"),
      ),
    )
    .returning();
  return updated ?? null;
}

/**
 * მყიდველის ნომერზე არსებული უძველესი available კრედიტი — ახალი ყიდვისას
 * კოდის გარეშეც რომ ჩამოეჭრას („შემდეგი თვის შეძენისას მიიღებ იგივეს").
 */
export async function availableCreditForPhone(
  tx: DbLike,
  phone: string,
): Promise<ReferralCredit | null> {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 5) return null;

  const [credit] = await tx
    .select({ credit: referralCredits })
    .from(referralCredits)
    .innerJoin(
      subscriptions,
      eq(referralCredits.referrerSubscriptionId, subscriptions.id),
    )
    .where(
      and(
        eq(referralCredits.status, "available"),
        sql`right(regexp_replace(${subscriptions.subscriberPhone}, '\\D', '', 'g'), 9) = ${digits}`,
      ),
    )
    .orderBy(asc(referralCredits.createdAt))
    .limit(1);
  return credit?.credit ?? null;
}

/**
 * ხელმისაწვდომი კრედიტები გამოწერების მიხედვით — ადმინის სიისა და კაბინეტის
 * ჩვენებისთვის (რაოდენობა + უძველესის განაკვეთი).
 */
export async function availableCreditsBySubscription(
  dbc: DbLike,
  subscriptionIds: string[],
): Promise<Map<string, { count: number; oldestPercent: number }>> {
  const result = new Map<string, { count: number; oldestPercent: number }>();
  if (subscriptionIds.length === 0) return result;

  const rows = await dbc
    .select({
      referrerSubscriptionId: referralCredits.referrerSubscriptionId,
      discountPercent: referralCredits.discountPercent,
    })
    .from(referralCredits)
    .where(
      and(
        inArray(referralCredits.referrerSubscriptionId, subscriptionIds),
        eq(referralCredits.status, "available"),
      ),
    )
    .orderBy(asc(referralCredits.createdAt));

  for (const row of rows) {
    const existing = result.get(row.referrerSubscriptionId);
    if (existing) {
      existing.count += 1;
    } else {
      result.set(row.referrerSubscriptionId, {
        count: 1,
        oldestPercent: row.discountPercent,
      });
    }
  }
  return result;
}
