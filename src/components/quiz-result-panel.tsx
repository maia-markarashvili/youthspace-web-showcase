import { QuizChoiceCard } from "@/components/quiz-choice-card";
import { Badge } from "@/components/ui/card";
import { CoverImage } from "@/components/ui/gallery";
import { bookingDateLabelKa } from "@/lib/calendar";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import type { Club, Course } from "@/lib/db/schema";
import { formatGel } from "@/lib/money";
import { withQuizParams } from "@/lib/quiz-attribution";
import { t } from "@/lib/site-texts";

/** უახლოესი ღია კარის დღე (getNextFreeEvent) + დარჩენილი ადგილები; null = ბარათი არ ჩანს */
export type QuizOpenDay = { course: Course; seatsLeft: number | null };

/**
 * ქვიზის შედეგის პანელი (ქვიზი → სამი გზა): კომპაქტური მატჩი (აღარაა ბმული)
 * და სამი არჩევანი „რა გინდა ახლა?" - ღია კარი (გამოყოფილი, თუ დაგეგმილია),
 * გაწევრიანება პირდაპირ ფორმაზე, ყველა კლუბი. Server-კომპონენტია (ClubCard-ის
 * მსგავსად ტექსტებს თავად კითხულობს) და runner-ს მზა ReactNode-ად გადაეცემა.
 *
 * ⚠ ღია კარის ბარათზე ფასი განზრახ არ იწერება - „უფასო" საჯაროდ არ ჩანს
 * (მფლობელის წესი, pricing.ts).
 */
export async function QuizResultPanel({
  club,
  pricePair,
  seatsRemaining,
  seatCapacity,
  showSeatCount = false,
  openDay,
}: {
  club: Club;
  pricePair: { standard: number; sale: number | null };
  seatsRemaining?: number;
  seatCapacity?: number;
  showSeatCount?: boolean;
  openDay: QuizOpenDay | null;
}) {
  const texts = await getSiteTexts();
  const fill = (key: string) => t(texts, key).replace("{club}", club.title);

  /* კლუბის ადგილები - ClubCard-ის იმავე წესით (გლობალური ჩამრთველი; sold-out მაინც ჩანს) */
  const clubSeats = club.registrationClosed
    ? t(texts, "shared.cards.closed")
    : seatsRemaining !== undefined && (showSeatCount || seatsRemaining <= 0)
      ? seatsRemaining > 0
        ? `დარჩა ${seatsRemaining}${seatCapacity ? `/${seatCapacity}` : ""}`
        : t(texts, "shared.cards.soldout")
      : null;

  const priceLine =
    `${formatGel(pricePair.sale ?? pricePair.standard)} ${t(texts, "shared.cards.permonth")}` +
    (pricePair.sale !== null ? ` (${formatGel(pricePair.standard)})` : "");

  const openDayFacts = openDay
    ? [
        openDay.course.startDate
          ? bookingDateLabelKa(openDay.course.startDate)
          : null,
        openDay.course.scheduleText,
        openDay.seatsLeft !== null
          ? openDay.seatsLeft > 0
            ? `დარჩა ${openDay.seatsLeft} ადგილი`
            : t(texts, "shared.cards.soldout")
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div>
      {/* მატჩი - აღარ არის ბმული: გადაწყვეტილება ქვემოთ, სამ ბარათში მიიღება */}
      <div className="rounded-card border border-line bg-white p-5 shadow-card">
        <CoverImage src={club.coverImage} alt={club.title} className="mb-4" />
        <div className="flex flex-wrap items-center gap-2">
          {club.ageRange ? <Badge tone="accent">{club.ageRange} წელი</Badge> : null}
          {club.meetingDay ? <Badge>{club.meetingDay}</Badge> : null}
          {clubSeats ? (
            <Badge
              tone={
                !club.registrationClosed && seatsRemaining && seatsRemaining > 0
                  ? "outline"
                  : "neutral"
              }
            >
              {clubSeats}
            </Badge>
          ) : null}
        </div>
        <h3 className="mt-3 text-h3 font-bold text-green-dark">{club.title}</h3>
        {club.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-7 text-ink-muted">
            {club.description}
          </p>
        ) : null}
        <p className="mt-4 text-sm font-semibold text-ink">{priceLine}</p>
      </div>

      <h3 className="mt-8 text-h3 font-bold text-ink">
        {t(texts, "tests.quiz.choice.title")}
      </h3>
      <div className="mt-4 flex flex-col gap-4">
        {openDay ? (
          <QuizChoiceCard
            choice="openday"
            club={club.slug}
            href={withQuizParams(`/courses/${openDay.course.slug}`, club.slug, "buy")}
            title={fill("tests.quiz.choice.openday.title")}
            text={fill("tests.quiz.choice.openday.text")}
            facts={openDayFacts}
            cta={t(texts, "tests.quiz.choice.openday.cta")}
            badge={t(texts, "tests.quiz.choice.badge")}
            highlighted
            primary
          />
        ) : null}
        {/* ღია კარის გარეშე ყიდვა ხდება გამოყოფილი პირველი ბარათი */}
        <QuizChoiceCard
          choice="buy"
          club={club.slug}
          href={withQuizParams(`/clubs/${club.slug}`, club.slug, "join")}
          title={fill("tests.quiz.choice.buy.title")}
          text={fill("tests.quiz.choice.buy.text")}
          facts={[priceLine, clubSeats].filter(Boolean).join(" · ")}
          cta={t(texts, "tests.quiz.choice.buy.cta")}
          badge={openDay ? undefined : t(texts, "tests.quiz.choice.badge")}
          highlighted={!openDay}
          primary
        />
        <QuizChoiceCard
          choice="clubs"
          club={club.slug}
          href={`/clubs?match=${encodeURIComponent(club.slug)}`}
          title={fill("tests.quiz.choice.clubs.title")}
          text={fill("tests.quiz.choice.clubs.text")}
          cta={t(texts, "tests.quiz.choice.clubs.cta")}
        />
      </div>
    </div>
  );
}
