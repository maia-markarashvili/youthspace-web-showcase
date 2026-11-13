import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getAccount } from "@/lib/auth/account-session";
import { db } from "@/lib/db";
import { availableCreditsBySubscription } from "@/lib/db/mutations/referral";
import {
  getPricingSettings,
  passEntriesBreakdownByPass,
} from "@/lib/db/queries/availability";
import {
  accountProfiles,
  bookings,
  clubs,
  courses,
  entryPasses,
  spaces,
  subscriptions,
} from "@/lib/db/schema";
import {
  bookingCancelCheck,
  clubCancelCheck,
  passCancelCheck,
} from "@/lib/cancellation-rules";
import {
  buildOwnedBy,
  verifiedChannels,
} from "@/lib/db/queries/account-ownership";
import { formatGel } from "@/lib/money";
import {
  applyPercentDiscount,
  clubMonthlyPrice,
  effectivePrice,
  floorToWholeGel,
} from "@/lib/pricing";
import { slotByStartTime } from "@/lib/slots";
import { formatDateKa, subscriptionPhase } from "@/lib/subscription-rules";
import { todayTbilisi } from "@/lib/calendar";

/**
 * კაბინეტის (/account) საკითხავი ფენა — ერთი ანგარიშის ყველა პროფილის
 * კლუბები, შესვლები, კურსები და ჯავშნები მიმდინარე სტატუსებით.
 *
 * ორი წყარო ერთიანდება:
 *  1. `profile_id`-ით მიბმული ყიდვები (M5-იდან მოყოლებული ყველა ახალი);
 *  2. ძველი/სტუმრის ყიდვები (`profile_id IS NULL`), რომლებიც ემთხვევა
 *     ანგარიშის **დადასტურებულ** ელფოსტას ან ტელეფონს.
 *
 * ⚠ უსაფრთხოება: (2)-ში მხოლოდ თავად ანგარიშის დადასტურებული არხები
 * მონაწილეობს — შვილის პროფილში მშობლის ხელით ჩაწერილი ნომერი აქ **არ**
 * გამოიყენება. თორემ ნებისმიერი ნომრის ჩაწერით სხვისი ისტორიის ნახვა
 * იქნებოდა შესაძლებელი. შვილის ჩანაწერები კაბინეტში მიბმით ჩნდება.
 */

export type CabinetProfile = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  relationship: string;
  isSelf: boolean;
};

export type CabinetItem = {
  kind: "club" | "pass" | "course" | "space" | "dropin";
  id: string;
  orderRef: string;
  title: string;
  /** „აქტიურია - 14 სექტემბერი, 2026-მდე" */
  entitlement: string;
  status: string;
  isActive: boolean;
  /** რომელ პროფილს ეკუთვნის; null = ძველი ყიდვა, ჯერ მიუბმელი */
  profileName: string | null;
  createdAt: Date;
  /** კაბინეტიდან გაუქმება შეიძლება? (ხელშეკრულების §2 - cancellation-rules.ts) */
  cancellable: boolean;
  /** ვადის მინიშნება ღილაკთან - „14 ივლისი, 10:00-მდე" */
  cancelHint: string | null;
};

/**
 * „მოიწვიე მეგობარი" — კოდი = აქტიური კლუბ-გამოწერის orderRef.
 * null = მომხმარებელს აქტიური წევრობა არ აქვს, ე.ი. კოდიც არ აქვს.
 */
export type CabinetReferral = {
  code: string;
  /** განაკვეთი %, მოწვეულსაც და მომყვანსაც */
  percent: number;
  /** დაგროვილი (გამოუყენებელი) ფასდაკლებული თვეები */
  availableCredits: number;
  /** შემდეგი თვის ფასი კრედიტის გათვალისწინებით (თეთრი); null = კრედიტი არაა */
  nextRenewalAmountTetri: number | null;
};

export type CabinetData = {
  profiles: CabinetProfile[];
  clubs: CabinetItem[];
  passes: CabinetItem[];
  courses: CabinetItem[];
  bookings: CabinetItem[];
  /** ღონისძიების (სივრცის ერთიანი) ჯავშნები — კაბინეტში ცალკე ბლოკი */
  events: CabinetItem[];
  referral: CabinetReferral | null;
};

const ACTIVE_BY_KIND: Record<CabinetItem["kind"], readonly string[]> = {
  club: ["pending", "active"],
  pass: ["pending", "active"],
  course: ["pending", "confirmed"],
  space: ["pending", "confirmed"],
  dropin: ["pending", "confirmed"],
};

/* ბმის წესი (phoneMatches/verifiedChannels/buildOwnedBy) ცალკე მოდულშია —
   account-ownership.ts — self-cancel.ts-თან გასაზიარებლად */

/**
 * ყიდვის გვერდებისთვის — შესული მომხმარებლის პროფილები „ვისთვის ყიდულობ"
 * ამომრჩევისთვის. სტუმარზე ცარიელი მასივი, ანუ გვერდი ისე მუშაობს,
 * როგორც აქამდე (`ProfileField` ცარიელ სიაზე არაფერს ხატავს).
 */
export async function listMyProfiles(): Promise<CabinetProfile[]> {
  const account = await getAccount();
  if (!account || account.status !== "active") return [];

  const rows = await db
    .select()
    .from(accountProfiles)
    .where(eq(accountProfiles.accountId, account.accountId))
    .orderBy(asc(accountProfiles.createdAt));

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    relationship: row.relationship,
    isSelf: row.relationship === "self",
  }));
}

export async function getCabinetData(account: {
  accountId: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
}): Promise<CabinetData> {
  const profileRows = await db
    .select()
    .from(accountProfiles)
    .where(eq(accountProfiles.accountId, account.accountId))
    .orderBy(asc(accountProfiles.createdAt));

  const profiles: CabinetProfile[] = profileRows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    relationship: row.relationship,
    isSelf: row.relationship === "self",
  }));
  const profileNameById = new Map(profiles.map((p) => [p.id, p.fullName]));
  const profileIds = profiles.map((p) => p.id);

  /* მხოლოდ დადასტურებული არხები (იხ. ფაილის თავზე უსაფრთხოების შენიშვნა) */
  const ownedBy = buildOwnedBy({
    profileIds,
    ...verifiedChannels(account),
  });

  const [subRows, passRows, bookingRows, settings] = await Promise.all([
    db
      .select()
      .from(subscriptions)
      .where(
        ownedBy(
          subscriptions.profileId,
          subscriptions.subscriberPhone,
          subscriptions.subscriberEmail,
        ),
      )
      .orderBy(desc(subscriptions.createdAt)),
    db
      .select()
      .from(entryPasses)
      .where(
        ownedBy(
          entryPasses.profileId,
          entryPasses.buyerPhone,
          entryPasses.buyerEmail,
        ),
      )
      .orderBy(desc(entryPasses.createdAt)),
    db
      .select()
      .from(bookings)
      .where(
        ownedBy(bookings.profileId, bookings.buyerPhone, bookings.buyerEmail),
      )
      .orderBy(desc(bookings.createdAt)),
    /* დამოუკიდებელია — იმავე batch-ში (ცალკე serial round-trip-ის ნაცვლად) */
    getPricingSettings(),
  ]);

  /* კლუბების/კურსების/ოთახების სათაურები ერთი წამოღებით.
     სივრცის ჯავშანი კატალოგს space_id-ით ებმება (item_id null-ია), კურსი -
     item_id-ით; ამიტომ space-ზე spaceId ?? itemId (ისტორიულ რიგებზეც მუშაობს) */
  const catalogIdOf = (row: (typeof bookingRows)[number]): string | null =>
    row.itemType === "space" ? (row.spaceId ?? row.itemId) : row.itemId;
  const clubIds = [...new Set(subRows.flatMap((row) => row.clubIds ?? []))];
  const itemIds = [
    ...new Set(
      bookingRows
        .filter((row) => row.itemType !== "dropin")
        .map(catalogIdOf)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [clubRows, courseRows, spaceRows] = await Promise.all([
    clubIds.length
      ? db
          .select({
            id: clubs.id,
            title: clubs.title,
            startDate: clubs.startDate,
          })
          .from(clubs)
          .where(inArray(clubs.id, clubIds))
      : Promise.resolve([]),
    itemIds.length
      ? db
          .select({
            id: courses.id,
            title: courses.title,
            startDate: courses.startDate,
          })
          .from(courses)
          .where(inArray(courses.id, itemIds))
      : Promise.resolve([]),
    itemIds.length
      ? db
          .select({ id: spaces.id, title: spaces.title })
          .from(spaces)
          .where(inArray(spaces.id, itemIds))
      : Promise.resolve([]),
  ]);
  const titleById = new Map<string, string>();
  for (const row of [...clubRows, ...courseRows, ...spaceRows]) {
    titleById.set(row.id, row.title);
  }
  /* გაუქმებადობის წესებისთვის - „სარგებლობის დაწყების" თარიღები */
  const clubStartById = new Map(clubRows.map((row) => [row.id, row.startDate]));
  const courseStartById = new Map(
    courseRows.map((row) => [row.id, row.startDate]),
  );
  const today = todayTbilisi();

  const profileNameOf = (profileId: string | null) =>
    profileId ? (profileNameById.get(profileId) ?? null) : null;

  /* ── კლუბები (გამოწერები) ─────────────────────────────────── */
  const clubItems: CabinetItem[] = subRows.map((row) => {
    const titles = (row.clubIds ?? [])
      .map((id) => titleById.get(id))
      .filter((title): title is string => !!title);
    const phase =
      row.status === "active" && row.currentPeriodEnd
        ? subscriptionPhase(row.currentPeriodEnd, settings.renewalGraceDays)
        : null;
    const entitlement =
      row.status === "pending"
        ? "გადახდის მოლოდინში"
        : row.status === "cancelled"
          ? "გაუქმებული"
          : phase === "active"
            ? `აქტიურია - ${formatDateKa(row.currentPeriodEnd as Date)}-მდე`
            : phase === "grace"
              ? `განახლების ვადა - ${formatDateKa(row.currentPeriodEnd as Date)}-მდე იყო გადახდილი`
              : "ვადაგასული";
    const cancel = clubCancelCheck(
      row.status,
      (row.clubIds ?? []).map((id) => clubStartById.get(id) ?? null),
      today,
    );
    return {
      kind: "club",
      id: row.id,
      orderRef: row.orderRef ?? "",
      title: titles.length ? titles.join(", ") : "კლუბის წევრობა",
      entitlement,
      status: row.status,
      isActive: ACTIVE_BY_KIND.club.includes(row.status),
      profileName: profileNameOf(row.profileId),
      createdAt: row.createdAt,
      cancellable: cancel.cancellable,
      cancelHint: cancel.hint,
    };
  });

  /* ── შესვლები (პასები) — consumed/future გამიჯვნა ერთი დაჯგუფებული
     მოთხოვნით: ჩვენებას ჯამი სჭირდება, გაუქმებადობას კი პირველი-ვიზიტის
     წესი (შემდგარი ვიზიტი კეტავს, მომავალი ჯავშანი ვადას აწესებს) ── */
  const passBreakdown = await passEntriesBreakdownByPass(
    passRows.map((r) => r.id),
    today,
  );
  const passItems: CabinetItem[] = passRows.map((row) => {
    const b = passBreakdown.get(row.id);
    const used = (b?.consumed ?? 0) + (b?.future ?? 0);
    const remaining = Math.max(0, row.entriesTotal - used);
    const expired = row.expiresAt.getTime() <= Date.now();
    const entitlement =
      row.status === "pending"
        ? "გადახდის მოლოდინში"
        : row.status === "cancelled"
          ? "გაუქმებული"
          : expired
            ? `ვადაგასული - ${formatDateKa(row.expiresAt)}`
            : `დარჩა ${remaining}/${row.entriesTotal} შესვლა · ვადა ${formatDateKa(row.expiresAt)}-მდე`;
    const cancel = passCancelCheck(
      row.status,
      expired,
      b?.consumed ?? 0,
      b?.earliestFutureISO ?? null,
      row.subscriptionId !== null,
    );
    return {
      kind: "pass" as const,
      id: row.id,
      orderRef: row.orderRef,
      title: row.subscriptionId ? "შესვლები (წევრობის ბონუსი)" : "შესვლების პაკეტი",
      entitlement,
      status: row.status,
      isActive: ACTIVE_BY_KIND.pass.includes(row.status) && !expired,
      profileName: profileNameOf(row.profileId),
      createdAt: row.createdAt,
      cancellable: cancel.cancellable,
      cancelHint: cancel.hint,
    };
  });

  /* ── კურსები და ჯავშნები ──────────────────────────────────── */
  const courseItems: CabinetItem[] = [];
  const bookingItems: CabinetItem[] = [];
  const eventItems: CabinetItem[] = [];

  for (const row of bookingRows) {
    const dateLabel = formatDateKa(new Date(`${row.bookingDate}T12:00:00Z`));
    const statusWord =
      row.status === "pending"
        ? "გადახდის მოლოდინში"
        : row.status === "confirmed"
          ? "დადასტურებული"
          : row.status === "cancelled"
            ? "გაუქმებული"
            : "დაბრუნებული";

    if (row.itemType === "course") {
      /* კურსზე bookingDate ყიდვის დღეა - ვადა კურსის startDate-ით ითვლება */
      const cancel = bookingCancelCheck(
        row.status,
        row.itemId ? (courseStartById.get(row.itemId) ?? null) : null,
      );
      /* განვადებაზე კაბინეტში მხოლოდ მდგომარეობა ჩანს - გადახდის ღილაკი
         განზრახ არაა: დარჩენილ თვეებს ადმინი აღრიცხავს და SMS-ით ახსენებს */
      const planNote =
        row.planMonths && row.status === "confirmed"
          ? `თვიური - გადახდილია ${row.monthsPaid}/${row.planMonths}${
              row.planNextDueAt
                ? ` · შემდეგი ${formatDateKa(row.planNextDueAt)}`
                : ""
            } · `
          : "";
      courseItems.push({
        kind: "course",
        id: row.id,
        orderRef: row.orderRef,
        title: (row.itemId ? titleById.get(row.itemId) : null) ?? "კურსი",
        entitlement: `${planNote}${statusWord}`,
        status: row.status,
        isActive: ACTIVE_BY_KIND.course.includes(row.status),
        profileName: profileNameOf(row.profileId),
        createdAt: row.createdAt,
        cancellable: cancel.cancellable,
        cancelHint: cancel.hint,
      });
      continue;
    }

    const slotLabel =
      row.itemType === "dropin"
        ? (slotByStartTime(row.startTime)?.label ?? null)
        : `${row.startTime.slice(0, 5)}-${row.endTime.slice(0, 5)}`;
    const cancel = bookingCancelCheck(row.status, row.bookingDate);

    /* ღონისძიება (სივრცის ერთიანი ჯავშანი) კაბინეტში ცალკე ბლოკია —
       ხალხის რაოდენობითა და თანხით */
    if (row.itemType === "space") {
      const people =
        row.peopleUpTo !== null ? ` · ${row.peopleUpTo} ადამიანამდე` : "";
      eventItems.push({
        kind: "space",
        id: row.id,
        orderRef: row.orderRef,
        title:
          (catalogIdOf(row) ? titleById.get(catalogIdOf(row) as string) : null) ??
          "ღონისძიება",
        entitlement: `${dateLabel}${slotLabel ? ` · ${slotLabel}` : ""}${people} · ${formatGel(row.amountGel)} - ${statusWord}`,
        status: row.status,
        isActive: ACTIVE_BY_KIND.space.includes(row.status),
        profileName: profileNameOf(row.profileId),
        createdAt: row.createdAt,
        cancellable: cancel.cancellable,
        cancelHint: cancel.hint,
      });
      continue;
    }

    bookingItems.push({
      kind: "dropin",
      id: row.id,
      orderRef: row.orderRef,
      title: row.passId ? "შესვლა პასით" : "ერთჯერადი შესვლა",
      entitlement: `${dateLabel}${slotLabel ? ` · ${slotLabel}` : ""} - ${statusWord}`,
      status: row.status,
      isActive: ACTIVE_BY_KIND.dropin.includes(row.status),
      profileName: profileNameOf(row.profileId),
      createdAt: row.createdAt,
      cancellable: cancel.cancellable,
      cancelHint: cancel.hint,
    });
  }

  /* ── „მოიწვიე მეგობარი" ────────────────────────────────────
     კოდი აქტიური წევრობის orderRef-ია. ძველი /my ამას აჩვენებდა
     (my/actions.ts:193-206) და კაბინეტში გადმოტანა გამომრჩა —
     კოდი მხოლოდ ყიდვისთანავე ჩანდა და მერე იკარგებოდა. */
  const activeSub = subRows.find(
    (row) => row.orderRef && ACTIVE_BY_KIND.club.includes(row.status),
  );

  let referral: CabinetReferral | null = null;
  if (activeSub?.orderRef) {
    const credits = await availableCreditsBySubscription(db, [activeSub.id]);
    const own = credits.get(activeSub.id);
    referral = {
      code: activeSub.orderRef,
      percent: settings.referralDiscountPercent,
      availableCredits: own?.count ?? 0,
      nextRenewalAmountTetri: own
        ? floorToWholeGel(
            applyPercentDiscount(
              effectivePrice(clubMonthlyPrice(settings)),
              own.oldestPercent,
            ),
          )
        : null,
    };
  }

  return {
    profiles,
    clubs: clubItems,
    passes: passItems,
    courses: courseItems,
    bookings: bookingItems,
    events: eventItems,
    referral,
  };
}
