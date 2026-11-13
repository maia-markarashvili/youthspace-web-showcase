import "server-only";
import type { QuizAttribution } from "@/lib/quiz-attribution";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { TBILISI_OFFSET_MS } from "@/lib/calendar";
import { db } from "@/lib/db";
import {
  availableCreditForPhone,
  cancelCreditsForReferee,
  consumeCredit,
  resolveReferral,
} from "@/lib/db/mutations/referral";
import {
  getPricingSettings,
  occupiesSeatCondition,
} from "@/lib/db/queries/availability";
import {
  bookings,
  clubs,
  entryPasses,
  referralCredits,
  subscriptions,
} from "@/lib/db/schema";
import { generateUniqueOrderRef } from "@/lib/order-ref";
import {
  applyPercentDiscount,
  clubMonthlyPrice,
  effectivePrice,
  floorToWholeGel,
} from "@/lib/pricing";

/**
 * კლუბ-გამოწერის შექმნის **ერთადერთი** ლოგიკა — იყენებს ორივე შესასვლელი:
 * საჯარო ყიდვა (status='pending') და ადმინის ხელით დამატება
 * (status='active' → currentPeriodEnd ეფექტური სტარტიდან +1 თვე).
 *
 * ერთი ყიდვა = **ერთი კლუბი** (პაკეტები/VIP აღარ არსებობს). ყიდვასთან ერთად:
 *  · იქმნება ბონუს 4-შესვლიანი პასი იმავე კოდით (subscription_id-ით მიბმული);
 *  · მეგობრის კოდი → ფასდაკლება ახლავე + კრედიტი მომყვანს (pending →
 *    available მოწვეულის დადასტურებისას);
 *  · კოდის გარეშე — თუ მყიდველს available კრედიტი აქვს, ავტომატურად იხარჯება.
 * ერთ ყიდვაზე მხოლოდ **ერთი** ფასდაკლება მოქმედებს; ადმინის
 * amountTetriOverride ყველაფერს ჯაბნის.
 *
 * კაპასიტეტი ტრანზაქციაში მოწმდება grace-ფანჯრიანი ოკუპაციის წესით.
 */

export class CapacityError extends Error {}

export function addOneMonth(from: Date): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * გამოწერის ეფექტური აქტივაციის თარიღი — ვადამდე ყიდვისას თვე სეზონის
 * დაწყებიდან ითვლება, თითქოს startDate-ზე იყიდეს; დაწყებული/უთარიღო
 * კლუბისთვის → დღეს.
 */
export function effectiveStartDate(
  selectedClubs: { startDate: string | null }[],
  now = new Date(),
): Date {
  /* დღევანდელი კალენდარული დღე თბილისში — ISO სტრიქონები < >-ით სწორად ედარება */
  const today = new Date(now.getTime() + TBILISI_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
  const futureStarts = selectedClubs
    .map((club) => club.startDate)
    .filter((start): start is string => start !== null && start > today);
  if (
    futureStarts.length === 0 ||
    futureStarts.length !== selectedClubs.length
  ) {
    return now;
  }
  const earliest = futureStarts.reduce((a, b) => (a < b ? a : b));
  return new Date(`${earliest}T00:00:00+04:00`);
}

const DAY_MS = 86_400_000;

/** კოდი უნიკალური უნდა იყოს სამივე ცხრილში — ერთი კოდი ყველგან ერთ რამეს ნიშნავს */
export async function orderRefExists(candidate: string): Promise<boolean> {
  const [inSubs] = await db
    .select({ n: count() })
    .from(subscriptions)
    .where(eq(subscriptions.orderRef, candidate));
  if ((inSubs?.n ?? 0) > 0) return true;
  const [inPasses] = await db
    .select({ n: count() })
    .from(entryPasses)
    .where(eq(entryPasses.orderRef, candidate));
  if ((inPasses?.n ?? 0) > 0) return true;
  const [inBookings] = await db
    .select({ n: count() })
    .from(bookings)
    .where(eq(bookings.orderRef, candidate));
  return (inBookings?.n ?? 0) > 0;
}

/** ვინ გააუქმა — ჩანაწერზე ინახება (ადმინში გასარჩევად) */
export type CancelActor = "customer" | "admin" | "system";

/**
 * გამოწერის გაუქმება სრული კასკადით — ერთი წყარო სამი გამომძახებლისთვის:
 * ადმინის /admin/orders ("admin"), მომხმარებლის კაბინეტი ("customer") და
 * ვადაგასული ჰოლდების წმენდა ("system"). ბონუს-პასი წევრობასთან ერთად
 * უქმდება, მომყვანის გამოუყენებელი რეფერალური კრედიტიც.
 * იდემპოტენტურია: მხოლოდ pending/active-ს ეხება; false = უკვე გაუქმებული იყო.
 */
export async function cancelSubscriptionCascade(
  id: string,
  by: CancelActor,
): Promise<boolean> {
  let cancelled = false;
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(subscriptions)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: by })
      .where(
        and(
          eq(subscriptions.id, id),
          inArray(subscriptions.status, ["pending", "active"]),
        ),
      )
      .returning({ id: subscriptions.id });
    if (!updated) return;
    cancelled = true;

    /* ბონუს-პასი წევრობასთან ერთად უქმდება */
    await tx
      .update(entryPasses)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: by })
      .where(
        and(
          eq(entryPasses.subscriptionId, id),
          inArray(entryPasses.status, ["pending", "active"]),
        ),
      );

    /* მოწვეულის გაუქმება → მომყვანის გამოუყენებელი კრედიტიც უქმდება */
    await cancelCreditsForReferee(tx, id);
  });
  return cancelled;
}

export type CreateClubSubscriptionResult = {
  orderRef: string;
  amountGel: number;
  standardTetri: number;
  title: string;
  bankRequisites: string | null;
  /** მოქმედი ფასდაკლების განაკვეთი (მეგობრის კოდი/კრედიტი); 0 = არ ყოფილა */
  appliedDiscountPercent: number;
  /** მეგობრის კოდის განაკვეთი წარმატების ეკრანის „გაუზიარე"-ტექსტისთვის */
  referralDiscountPercent: number;
};

export async function createClubSubscription(input: {
  clubId: string;
  name: string;
  phone: string;
  email?: string | null;
  status: "pending" | "active";
  /** მეგობრის კოდი — ვალიდაცია ტრანზაქციაში (ReferralError ველის შეცდომად) */
  referralCode?: string | null;
  /** ადმინის ხელით მითითებული თანხა თეთრებში; null/undefined = ტარიფით */
  amountTetriOverride?: number | null;
  /** ბარათით გადახდისას — ადგილის დროებითი ჯავშნის ვადა (null = უვადო) */
  holdExpiresAt?: Date | null;
  /** მომხმარებლის ანგარიშის პროფილი (§20) — null = სტუმრის/ადმინის ყიდვა */
  profileId?: string | null;
  /** ამ ყიდვაზე ნომრის ფლობა დამტკიცდა? (SMS-კოდი გაიარა, ან ადმინია).
   *  მხოლოდ ასეთ ყიდვას ერგება დაგროვილი რეფერალური კრედიტი. */
  phoneProven?: boolean;
  /** მონაწილის ასაკი — მხოლოდ landing.askAge-იანი კლუბის საჯარო ფორმიდან */
  childAge?: number | null;
  /** საჯარო ფორმაზე თანხმობა ცხადად მოინიშნა; ადმინის ხელით დამატებაზე
   *  არ გადაეცემა (სქემის default false რჩება) */
  termsAccepted?: boolean;
  /** ეტაპი 5: ანალიტიკის თანხმობა ყიდვისას */
  analyticsConsent?: boolean;
  /** ქვიზის კონტექსტი (§12 attribution) — null = პირდაპირი ყიდვა */
  attribution?: QuizAttribution | null;
  /** „მიღება დასრულებულია" კლუბზეც დამატება — მხოლოდ ადმინის ხელით
   *  დამატებას; საჯარო ყიდვაზე default-ად დაცვა მოქმედებს */
  allowClosed?: boolean;
}): Promise<CreateClubSubscriptionResult> {
  const [club] = await db
    .select({
      id: clubs.id,
      title: clubs.title,
      startDate: clubs.startDate,
      registrationClosed: clubs.registrationClosed,
    })
    .from(clubs)
    .where(and(eq(clubs.id, input.clubId), eq(clubs.isActive, true)))
    .limit(1);
  if (!club) {
    throw new CapacityError(
      "კლუბი ვერ მოიძებნა - განაახლე გვერდი და სცადე თავიდან.",
    );
  }
  if (club.registrationClosed && !input.allowClosed) {
    throw new CapacityError(`„${club.title}“-ზე მიღება დასრულებულია.`);
  }

  const settings = await getPricingSettings();
  const baseTetri = effectivePrice(clubMonthlyPrice(settings));
  const orderRef = await generateUniqueOrderRef(orderRefExists, "club");
  /* ვადამდე ყიდვისას თვე სეზონის დაწყებიდან ითვლება (იხ. effectiveStartDate) */
  const currentPeriodEnd =
    input.status === "active" ? addOneMonth(effectiveStartDate([club])) : null;

  const referralCode = input.referralCode?.trim().toUpperCase() || null;

  let appliedDiscountPercent = 0;

  await db.transaction(async (tx) => {
    /* კლუბის ინდივიდუალური მთვლელი — pending/active + grace იკავებს ადგილს */
    const [row] = await tx
      .select({ n: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.planType, "club"),
          occupiesSeatCondition(settings),
          sql`${subscriptions.clubIds} @> ARRAY[${club.id}]::uuid[]`,
        ),
      );
    if ((row?.n ?? 0) >= settings.clubSeatCapacity) {
      throw new CapacityError(
        `„${club.title}“-ში ადგილები ამოიწურა - აირჩიე სხვა კლუბი.`,
      );
    }

    /* ერთი ფასდაკლება: ჯერ შეყვანილი კოდი, მის გარეშე — დაგროვილი კრედიტი */
    const referral = referralCode
      ? await resolveReferral(tx, referralCode, input.phone, settings)
      : null;
    /**
     * ⚠ დაგროვილი კრედიტი ავტომატურად მხოლოდ მაშინ იხარჯება, თუ ამ ყიდვაზე
     * **ნომრის ფლობა დამტკიცდა** (უსაფრთხოების აუდიტი, 2026-08-18).
     * აქამდე საკმარისი იყო ფორმაში წევრის ნომრის ჩაწერა: უცნობი ადამიანი
     * სხვისი ნომრით ყიდვას იწყებდა და მსხვერპლის დამსახურებული ფასდაკლებული
     * თვე „იხარჯებოდა" — აღდგენა მხოლოდ ხელით, ბაზაში. ახლა კრედიტს იღებს
     * მხოლოდ ის, ვინც SMS-კოდი გაიარა ან შესულია დადასტურებული ნომრით.
     */
    const ownCredit =
      !referral && input.amountTetriOverride == null && input.phoneProven
        ? await availableCreditForPhone(tx, input.phone)
        : null;

    appliedDiscountPercent =
      referral?.percent ?? ownCredit?.discountPercent ?? 0;

    const amountGel =
      input.amountTetriOverride ??
      (appliedDiscountPercent > 0
        ? floorToWholeGel(
            applyPercentDiscount(baseTetri, appliedDiscountPercent),
          )
        : baseTetri);

    const [created] = await tx
      .insert(subscriptions)
      .values({
        planType: "club",
        orderRef,
        clubIds: [club.id],
        subscriberName: input.name,
        subscriberEmail: input.email || "",
        subscriberPhone: input.phone,
        profileId: input.profileId ?? null,
        childAge: input.childAge ?? null,
        termsAccepted: input.termsAccepted ?? false,
        analyticsConsent: input.analyticsConsent ?? false,
        attribution: input.attribution ?? null,
        amountGel,
        status: input.status,
        currentPeriodEnd,
        holdExpiresAt: input.holdExpiresAt ?? null,
        referredByCode: referral ? referralCode : null,
      })
      .returning({ id: subscriptions.id });
    if (!created) throw new Error("გამოწერის ჩაწერა ჩავარდა");

    /* ბონუს 4 შესვლა — იგივე კოდი (წევრს ერთი კოდი აქვს ყველაფერზე).
       pending ყიდვას პერიოდის ბოლო ჯერ არ აქვს → placeholder-ვადა;
       რეალურს confirmSubscription ჩაწერს. */
    await tx.insert(entryPasses).values({
      orderRef,
      buyerName: input.name,
      buyerPhone: input.phone,
      buyerEmail: input.email || null,
      profileId: input.profileId ?? null,
      amountGel: 0,
      entriesTotal: 4,
      subscriptionId: created.id,
      status: input.status === "active" ? "active" : "pending",
      expiresAt:
        currentPeriodEnd ??
        new Date(Date.now() + settings.fourPackValidityDays * DAY_MS),
    });

    if (referral) {
      /* კრედიტი მომყვანს: available მხოლოდ მოწვეულის დადასტურების შემდეგ */
      await tx.insert(referralCredits).values({
        referrerSubscriptionId: referral.referrerSubscriptionId,
        refereeSubscriptionId: created.id,
        code: referralCode as string,
        discountPercent: referral.percent,
        status: input.status === "active" ? "available" : "pending",
      });
    } else if (ownCredit) {
      const consumed = await consumeCredit(
        tx,
        ownCredit.referrerSubscriptionId,
      );
      /* რბოლაში კრედიტი შეიძლება გაქრეს — მაშინ ფასდაკლებაც არ მოქმედებს */
      if (!consumed) {
        appliedDiscountPercent = 0;
        await tx
          .update(subscriptions)
          .set({ amountGel: input.amountTetriOverride ?? baseTetri })
          .where(eq(subscriptions.id, created.id));
      }
    }
  });

  const finalAmount =
    input.amountTetriOverride ??
    (appliedDiscountPercent > 0
      ? floorToWholeGel(applyPercentDiscount(baseTetri, appliedDiscountPercent))
      : baseTetri);

  return {
    orderRef,
    amountGel: finalAmount,
    standardTetri: baseTetri,
    title: club.title,
    bankRequisites: settings.bankRequisites,
    appliedDiscountPercent,
    referralDiscountPercent: settings.referralDiscountPercent,
  };
}
