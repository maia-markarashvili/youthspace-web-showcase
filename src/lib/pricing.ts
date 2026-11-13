/**
 * ფასის კალკულაცია — **ერთადერთი წყარო** (PRD §7: „ყველა ფასი სერვერზე ითვლება").
 *
 * გაყიდვის მოდელი:
 *  · კლუბი — ერთი ცენტრალური ფასი თვეში (pricing_settings.club_price).
 *    პაკეტები/VIP აღარ არსებობს: თითო კლუბი ცალკე იყიდება.
 *  · კურსი — ფასდაკლების განაკვეთი თვითონ კურსშია (courses.club_discounts)
 *    და კლუბების მიხედვით განსხვავდება; რამდენიმე კლუბის წევრზე მოქმედებს
 *    **მაქსიმალური** განაკვეთი.
 *  · მეგობრის კოდი — ცალკე პროცენტი (pricing_settings.referral_discount_percent).
 *
 * წმინდა ფუნქციები — გამოიყენება სერვერზეც (თანხის დათვლა) და კლიენტზეც
 * (ჩვენება). სტრუქტურული ტიპები schema-ს იმპორტს განზრახ არიდებს თავს:
 * schema.ts აქედან იღებს `CourseClubDiscount`-ს და ციკლი არ იქმნება.
 */

/** სტანდარტული + სააქციო წყვილი; sale=null → აქცია არ არის */
export type PricedPair = { standard: number; sale: number | null };

/** კურსის per-club ფასდაკლების წესი (courses.club_discounts jsonb) */
export type CourseClubDiscount = { clubId: string; percent: number };

/* ── კლუბი ─────────────────────────────────────────────────────── */

/** კლუბის თვიური ფასი — ერთი ყველა კლუბზე, რაოდენობაზე დამოკიდებული არაა */
export function clubMonthlyPrice(s: {
  clubPrice: number;
  saleClubPrice: number | null;
}): PricedPair {
  return { standard: s.clubPrice, sale: s.saleClubPrice };
}

/** გადასახდელი თანხა — სააქციო, თუ არსებობს */
export function effectivePrice(pair: PricedPair): number {
  return pair.sale ?? pair.standard;
}

/**
 * კლუბის თვიური ფასი რამდენი 4-შესვლიანი პაკეტის ტოლია — „120 ₾ = 2 × 60 ₾"
 * მესიჯისთვის. sale-ფასები უპირატესია. UI აქციურ ხაზს მხოლოდ
 * `exact && packs >= 2` შემთხვევაში აჩვენებს — ადმინიდან ფასის შეცვლისას
 * შეუსაბამო კოპი თავად ქრება.
 */
export function clubPriceInFourPacks(settings: {
  clubPrice: number;
  fourPackPrice: number;
  saleClubPrice: number | null;
  saleFourPackPrice: number | null;
}): {
  packs: number;
  exact: boolean;
  clubTetri: number;
  packTetri: number;
} | null {
  const club = settings.saleClubPrice ?? settings.clubPrice;
  const pack = settings.saleFourPackPrice ?? settings.fourPackPrice;
  if (pack <= 0 || club < pack) return null;
  const packs = Math.round(club / pack);
  return {
    packs,
    exact: packs * pack === club,
    clubTetri: club,
    packTetri: pack,
  };
}

/* ── ფასდაკლებები ──────────────────────────────────────────────── */

/** პროცენტული ფასდაკლების დადება თანხაზე (თეთრებში, მომრგვალებული) */
export function applyPercentDiscount(
  amountTetri: number,
  percent: number,
): number {
  if (percent <= 0) return amountTetri;
  return Math.max(0, Math.round(amountTetri * (1 - Math.min(percent, 100) / 100)));
}

/**
 * დამრგვალება **მთელ ლარამდე ქვევით** — ყოველთვის მყიდველის სასარგებლოდ.
 * ერთი და იგივე წესი მოქმედებს კურსზეც და მეგობრის კოდზეც, ამიტომ გვერდზე
 * ნაჩვენები და გადასახდელი თანხა ვერასდროს განსხვავდება.
 */
export function floorToWholeGel(tetri: number): number {
  return Math.floor(tetri / 100) * 100;
}

/**
 * უფასო კურსი/ღონისძიება (მაგ. ღია კარის დღე) — ეფექტური საწყისი ფასი 0.
 * საჯაროდ „უფასო" არ იწერება (მფლობელის წესი): ფასის ბლოკები უბრალოდ იმალება,
 * სისტემა კი გადახდის ნაბიჯებს ტოვებს და რეგისტრაციას მაშინვე ადასტურებს.
 */
export function courseIsFree(course: {
  priceRegular: number;
  salePrice: number | null;
}): boolean {
  return (course.salePrice ?? course.priceRegular) === 0;
}

/** კურსის ფასდაკლებული ფასი (ჩვენებაც და გადასახდელიც ერთი ფუნქციიდან) */
export function discountedCoursePriceTetri(
  baseTetri: number,
  percent: number,
): number {
  if (percent <= 0) return baseTetri;
  return floorToWholeGel(applyPercentDiscount(baseTetri, percent));
}

/**
 * კურსზე მოქმედი განაკვეთი წევრის კლუბების მიხედვით — **მაქსიმალური**
 * დამთხვეული. არცერთი კლუბი არ ემთხვევა (ან წევრი არაა) → 0.
 */
export function courseDiscountForClubs(
  memberClubIds: readonly string[],
  clubDiscounts: readonly CourseClubDiscount[],
): number {
  if (memberClubIds.length === 0 || clubDiscounts.length === 0) return 0;
  const owned = new Set(memberClubIds);
  let best = 0;
  for (const rule of clubDiscounts) {
    if (owned.has(rule.clubId) && rule.percent > best) best = rule.percent;
  }
  return Math.min(best, 100);
}

/** ამ კურსზე არსებული ყველაზე მაღალი განაკვეთი — „წევრებს −X%-მდე" წარწერისთვის */
export function maxCourseClubDiscount(
  clubDiscounts: readonly CourseClubDiscount[],
): number {
  let best = 0;
  for (const rule of clubDiscounts) {
    if (rule.percent > best) best = rule.percent;
  }
  return Math.min(best, 100);
}

/* ── კურსის განვადება (თვიური vs ერთიანი გადახდა) ─────────────────
   ადმინი ავსებს თვიურ ფასს + თვეების რაოდენობას; ორივე შევსებული =
   განვადება ჩართულია. მყიდველს **დეფოლტად თვიური** უდგება, ერთიანი კი
   შესადარებელ ოფციად რჩება (მფლობელის წესი, 2026-09-19). ჩამოჭრა
   ყოველთვის ერთი თვეა - დანარჩენს ადმინი ხელით აღრიცხავს და SMS-ით
   ახსენებს; ავტომატური ჩამოჭრა არ კეთდება. */

/** კურსის ფასის ველები (schema-ს იმპორტის გარეშე) */
export type CoursePricingInput = {
  priceRegular: number;
  salePrice: number | null;
  monthlyPrice: number | null;
  monthlyMonths: number | null;
};

/** მყიდველის არჩევანი: სრული ფასი ერთბაშად თუ თვიური განვადება */
export type CoursePayPlan = "full" | "monthly";

export type CoursePaymentPlans = {
  full: { totalTetri: number; standardTetri: number };
  /** null = განვადება ამ კურსზე (ან ამ ფასდაკლებით) არ მოქმედებს */
  monthly: {
    /** ახლა გადასახდელი - პირველი თვე */
    perMonthTetri: number;
    /** ფასდაკლებამდე - გადახაზული ციფრისთვის */
    standardPerMonthTetri: number;
    months: number;
    /** perMonthTetri × months - ინფო-ხაზი „ჯამური გადასადხადი“ */
    totalTetri: number;
    /** რამდენით ძვირია ჯამში ერთიანთან შედარებით (≥0) */
    extraTetri: number;
  } | null;
};

/** განვადება 1 თვეზე აზრს კარგავს; ზედა ზღვარი ადმინის ვალიდაციისთვისაა */
export const MIN_PLAN_MONTHS = 2;
export const MAX_PLAN_MONTHS = 36;

/**
 * ორივე ვარიანტი ერთი გამოთვლით - ჩვენებისთვისაც და ჩამოჭრისთვისაც.
 * თვიურზე `floorToWholeGel` **თითო თვეზე** მუშაობს (არა ჯამზე), რადგან
 * სწორედ თვის ციფრი ირიცხება: ნაჩვენები === გადასახდელი.
 */
export function coursePaymentPlans(
  course: CoursePricingInput,
  percent: number,
): CoursePaymentPlans {
  const fullStandard = course.salePrice ?? course.priceRegular;
  const fullTotal = discountedCoursePriceTetri(fullStandard, percent);

  const months = course.monthlyMonths ?? 0;
  const monthlyStandard = course.monthlyPrice ?? 0;
  const perMonth = discountedCoursePriceTetri(monthlyStandard, percent);

  /* perMonth <= 0 (100%-იანი ფასდაკლება) → გეგმა აზრს კარგავს: სრულ
     კურსს უფასოდ იღებს და თვეების დევნა აღარ გვჭირდება */
  const planActive =
    fullStandard > 0 &&
    monthlyStandard > 0 &&
    months >= MIN_PLAN_MONTHS &&
    perMonth > 0;

  return {
    full: { totalTetri: fullTotal, standardTetri: fullStandard },
    monthly: planActive
      ? {
          perMonthTetri: perMonth,
          standardPerMonthTetri: monthlyStandard,
          months,
          totalTetri: perMonth * months,
          extraTetri: Math.max(0, perMonth * months - fullTotal),
        }
      : null,
  };
}

/** აქვს თუ არა კურსს საჯაროდ ჩასაწერი განვადება (ფასდაკლების გარეშე) */
export function courseHasMonthlyPlan(course: CoursePricingInput): boolean {
  return coursePaymentPlans(course, 0).monthly !== null;
}

/** დეფოლტი: თვიური, სადაც განვადებაა; სხვაგან - ერთიანი */
export function defaultCoursePayPlan(plans: CoursePaymentPlans): CoursePayPlan {
  return plans.monthly ? "monthly" : "full";
}

/**
 * არჩეული ვარიანტი → რეალურად ჩამოსაჭრელი თანხა. განვადების გარეშე
 * კურსზე ნებისმიერი მოთხოვნა „full“-ზე ბრუნდება, ანუ გაყალბებული
 * `payPlan` ვერასდროს გადაიხდევინებს იმაზე ნაკლებს, ვიდრე კურსზე არსებობს.
 */
export function resolveCoursePayPlan(
  plans: CoursePaymentPlans,
  requested: CoursePayPlan,
): {
  plan: CoursePayPlan;
  /** ახლა Flitt-ს გადასაცემი თანხა = bookings.amount_gel */
  chargeTetri: number;
  standardTetri: number;
  planMonths: number | null;
  planTotalTetri: number | null;
} {
  const monthly = plans.monthly;
  if (requested === "monthly" && monthly) {
    return {
      plan: "monthly",
      chargeTetri: monthly.perMonthTetri,
      standardTetri: monthly.standardPerMonthTetri,
      planMonths: monthly.months,
      planTotalTetri: monthly.totalTetri,
    };
  }
  return {
    plan: "full",
    chargeTetri: plans.full.totalTetri,
    standardTetri: plans.full.standardTetri,
    planMonths: null,
    planTotalTetri: null,
  };
}

/* ── ღონისძიების ფასი (სივრცის ერთიანი დაჯავშნა) ──────────────────
   ფასი = სლოტის ფასი (დილა/შუადღე/საღამო, pricing_settings.event_price_*)
   + ხალხის საფეხურის დანამატი (event_people_tiers). წევრის ფასი
   არასავალდებულოა და მხოლოდ სლოტის ნაწილზე მოქმედებს. */

/** ხალხის საფეხური — „upTo ადამიანამდე" ზღვარი + დანამატი თეთრებში */
export type EventPeopleTier = { upTo: number; price: number };

/** default-საფეხურები — გამოიყენება, სანამ ადმინი თავისას შეინახავს */
export const DEFAULT_EVENT_PEOPLE_TIERS: EventPeopleTier[] = [
  { upTo: 10, price: 0 },
  { upTo: 20, price: 5000 },
  { upTo: 50, price: 10000 },
  { upTo: 80, price: 20000 },
];

/** pricing_settings-ის event-ველების სტრუქტურული ჭრილი (schema-ს იმპორტის გარეშე) */
export type EventPricingFields = {
  eventPriceMorning: number;
  eventPriceMidday: number;
  eventPriceEvening: number;
  eventMemberPriceMorning: number | null;
  eventMemberPriceMidday: number | null;
  eventMemberPriceEvening: number | null;
  eventPeopleTiers: EventPeopleTier[] | null;
};

/** სლოტის ფასების წყვილი — member=null ⟺ წევრის ფასი არ მოქმედებს */
export type EventSlotPrices = { standard: number; member: number | null };

type EventSlotKey = "morning" | "midday" | "evening";

/**
 * ერთი სლოტის ფასები. member მხოლოდ მაშინ ბრუნდება, თუ შევსებულია **და**
 * სტანდარტულზე ნაკლებია — ჩვენებაც და დარიცხვაც ერთ წესს ემყარება.
 */
export function eventSlotPrice(
  s: EventPricingFields,
  slot: EventSlotKey,
): EventSlotPrices {
  const bySlot: Record<EventSlotKey, { standard: number; member: number | null }> = {
    morning: { standard: s.eventPriceMorning, member: s.eventMemberPriceMorning },
    midday: { standard: s.eventPriceMidday, member: s.eventMemberPriceMidday },
    evening: { standard: s.eventPriceEvening, member: s.eventMemberPriceEvening },
  };
  const { standard, member } = bySlot[slot];
  return {
    standard,
    member: member !== null && member < standard ? member : null,
  };
}

/** სამივე სლოტის ფასები ერთად — გვერდისა და ფორმის props-ისთვის */
export function eventSlotPricesByKey(
  s: EventPricingFields,
): Record<EventSlotKey, EventSlotPrices> {
  return {
    morning: eventSlotPrice(s, "morning"),
    midday: eventSlotPrice(s, "midday"),
    evening: eventSlotPrice(s, "evening"),
  };
}

/**
 * მოქმედი საფეხურები — DB-ს მნიშვნელობა ან default. jsonb-ს ხელით
 * გაფუჭებისგან იცავს: არავალიდური ელემენტები იფილტრება, დანარჩენი
 * ზღვრით ლაგდება; ცარიელი შედეგი → default.
 */
export function eventPeopleTiers(
  s: Pick<EventPricingFields, "eventPeopleTiers">,
): EventPeopleTier[] {
  const raw = s.eventPeopleTiers;
  if (!Array.isArray(raw)) return DEFAULT_EVENT_PEOPLE_TIERS;
  const clean = raw
    .filter(
      (tier): tier is EventPeopleTier =>
        typeof tier === "object" &&
        tier !== null &&
        Number.isInteger(tier.upTo) &&
        tier.upTo > 0 &&
        Number.isInteger(tier.price) &&
        tier.price >= 0,
    )
    .sort((a, b) => a.upTo - b.upTo);
  return clean.length > 0 ? clean : DEFAULT_EVENT_PEOPLE_TIERS;
}

/** submit-ისას მოსული ზღვრის ვალიდაცია — მხოლოდ არსებული საფეხური ჭრის */
export function eventTierByUpTo(
  tiers: readonly EventPeopleTier[],
  upTo: number,
): EventPeopleTier | undefined {
  return tiers.find((tier) => tier.upTo === upTo);
}

/** ჯამი: სლოტის (წევრის, თუ მოქმედებს) ფასი + საფეხურის დანამატი */
export function eventTotalTetri(
  prices: EventSlotPrices,
  tier: EventPeopleTier,
  isMember: boolean,
): number {
  const slotPart = isMember && prices.member !== null ? prices.member : prices.standard;
  return slotPart + tier.price;
}
