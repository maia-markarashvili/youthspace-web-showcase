import { LinkCard, Badge } from "@/components/ui/card";
import { CoverImage } from "@/components/ui/gallery";
import { courseHasEnded } from "@/lib/calendar";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { formatGel } from "@/lib/money";
import {
  courseIsFree,
  coursePaymentPlans,
  maxCourseClubDiscount,
} from "@/lib/pricing";
import { t } from "@/lib/site-texts";
import type { Club, Course } from "@/lib/db/schema";

/**
 * კლუბის ბარათი (§4 სექცია 3).
 * `pricePair` **სავალდებულოა** და ყოველთვის pricing_settings-იდან მოდის —
 * ფასის სხვა წყარო არ არსებობს (ძველი clubs.base_price fallback წაშლილია,
 * რომ გვერდებზე განსხვავებული ფასები ვეღარასდროს გამოჩნდეს).
 */
export async function ClubCard({
  club,
  seatsRemaining,
  pricePair,
  seatCapacity,
  showSeatCount = false,
}: {
  club: Club;
  seatsRemaining?: number;
  pricePair: { standard: number; sale: number | null };
  seatCapacity?: number;
  /** გლობალური ჩამრთველი (pricing_settings.show_public_seats) — false-ზე
   *  დადებითი „დარჩა N" იმალება; sold-out ბეჯი მაინც ჩანს */
  showSeatCount?: boolean;
}) {
  const texts = await getSiteTexts();

  return (
    <LinkCard href={`/clubs/${club.slug}`}>
      <CoverImage src={club.coverImage} alt={club.title} className="mb-5" />

      <div className="flex flex-wrap items-center gap-2">
        {club.ageRange ? <Badge tone="accent">{club.ageRange} წელი</Badge> : null}
        {club.meetingDay ? <Badge>{club.meetingDay}</Badge> : null}
        {/* „მიღება დასრულებულია" ადგილების ბეჯს ანაცვლებს */}
        {club.registrationClosed ? (
          <Badge tone="neutral">{t(texts, "shared.cards.closed")}</Badge>
        ) : seatsRemaining !== undefined &&
          (showSeatCount || seatsRemaining <= 0) ? (
          <Badge tone={seatsRemaining > 0 ? "outline" : "neutral"}>
            {seatsRemaining > 0
              ? `დარჩა ${seatsRemaining}${seatCapacity ? `/${seatCapacity}` : ""}`
              : t(texts, "shared.cards.soldout")}
          </Badge>
        ) : null}
      </div>

      <h3 className="mt-3 text-h3 font-bold text-green-dark">{club.title}</h3>
      {club.description ? (
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-ink-muted">
          {club.description}
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-baseline gap-2">
          {pricePair.sale !== null ? (
            <>
              <span className="text-h2 font-bold text-green-dark">
                {formatGel(pricePair.sale)}
              </span>
              <span className="text-sm text-ink-muted line-through">
                {formatGel(pricePair.standard)}
              </span>
            </>
          ) : (
            <span className="text-h2 font-bold text-green-dark">
              {formatGel(pricePair.standard)}
            </span>
          )}
          <span className="text-sm text-ink-muted">
            {t(texts, "shared.cards.permonth")}
          </span>
        </div>
        <span className="mt-4 inline-block text-sm font-semibold text-green-dark group-hover:underline">
          {t(texts, "shared.cards.club.link")}
        </span>
      </div>
    </LinkCard>
  );
}

/** კურსის ბარათი — ფასი + კლუბის წევრების მაქს. ფასდაკლების ბეჯი (§5.2);
 *  დასრულებულ კურსზე ფასის ნაცვლად „დასრულებული" ბეჯი ჩანს */
export async function CourseCard({ course }: { course: Course }) {
  const texts = await getSiteTexts();
  const maxDiscount = maxCourseClubDiscount(course.clubDiscounts);
  const ended = courseHasEnded(course);
  /* უფასო ღონისძიება — ფასის ბლოკი საერთოდ არ ჩანს („უფასოც" კი არა:
     მფლობელის წესით ეს აქცენტი საჯაროდ არ კეთდება) */
  const free = courseIsFree(course);
  /* განვადება ჩართულია → მთავარი ციფრი თვიურია, ერთიანი ქვეშ (2026-09-19) */
  const monthlyPlan = coursePaymentPlans(course, 0).monthly;
  /* დაგეგმილზე დაწყების თარიღის ბეჯი (მაგ. „იწყება: 18 ოქტომბერი") */
  const startsLabel =
    !ended && course.startDate
      ? new Intl.DateTimeFormat("ka-GE", {
          day: "numeric",
          month: "long",
        }).format(new Date(`${course.startDate}T00:00:00Z`))
      : null;

  return (
    <LinkCard href={`/courses/${course.slug}`}>
      <CoverImage src={course.coverImage} alt={course.title} className="mb-5" />

      <div className="flex flex-wrap items-center gap-2">
        {ended ? (
          <Badge tone="neutral">{t(texts, "shared.cards.ended")}</Badge>
        ) : course.registrationClosed ? (
          <Badge tone="neutral">{t(texts, "shared.cards.closed")}</Badge>
        ) : null}
        {course.category ? <Badge tone="accent">{course.category}</Badge> : null}
        {startsLabel ? <Badge>იწყება: {startsLabel}</Badge> : null}
        {course.scheduleText ? <Badge>{course.scheduleText}</Badge> : null}
      </div>

      <h3 className="mt-3 text-h3 font-bold text-green-dark">{course.title}</h3>
      {course.description ? (
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-ink-muted">
          {course.description}
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        {ended || free ? null : monthlyPlan ? (
          /* განვადება — მთავარი ციფრი თვიური, ქვეშ ერთიანი ფასი */
          <>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-h2 font-bold text-green-dark">
                {formatGel(monthlyPlan.perMonthTetri)} / თვე
              </span>
              {course.salePrice !== null ? (
                <Badge tone="accent">{t(texts, "shared.cards.sale")}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {t(texts, "shared.cards.fullPrice")}{" "}
              <span className="font-semibold text-ink">
                {formatGel(course.salePrice ?? course.priceRegular)}
              </span>
              {course.salePrice !== null ? (
                <span className="ml-2 line-through">
                  {formatGel(course.priceRegular)}
                </span>
              ) : null}
            </p>
          </>
        ) : course.salePrice !== null ? (
          /* აქცია — სააქციო ფასი ხაზგასმულია, სტანდარტული გადახაზული */
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-h2 font-bold text-green-dark">
              {formatGel(course.salePrice)}
            </span>
            <span className="text-sm text-ink-muted line-through">
              {formatGel(course.priceRegular)}
            </span>
            <Badge tone="accent">{t(texts, "shared.cards.sale")}</Badge>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-h2 font-bold text-green-dark">
              {formatGel(course.priceRegular)}
            </span>
          </div>
        )}
        {!ended && !free && maxDiscount > 0 ? (
          <p className="mt-1 text-sm font-semibold text-green-mid">
            კლუბის წევრებს −{maxDiscount}%-მდე
          </p>
        ) : null}
        <span className="mt-4 inline-block text-sm font-semibold text-green-dark group-hover:underline">
          {t(texts, "shared.cards.course.link")}
        </span>
      </div>
    </LinkCard>
  );
}

