import type { Metadata } from "next";
import { ClubCard } from "@/components/cards";
import { Markdown } from "@/components/markdown";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { addDays, todayTbilisi } from "@/lib/calendar";
import {
  clubSeatsRemainingByClub,
  getPricingSettings,
  seatsFor,
} from "@/lib/db/queries/availability";
import { listClubs } from "@/lib/db/queries/catalog";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { clubMonthlyPrice } from "@/lib/pricing";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "clubs.seo.title"),
    description: t(texts, "clubs.seo.description"),
  };
}

export default async function ClubsPage(props: PageProps<"/clubs">) {
  const searchParams = await props.searchParams;
  /* ფასები **მხოლოდ** pricing_settings-იდან (გაყიდვების მოდელი) */
  const [texts, clubs, settings] = await Promise.all([
    getSiteTexts(),
    listClubs(),
    getPricingSettings(),
  ]);
  const remaining = await clubSeatsRemainingByClub(settings);

  const pricePair = clubMonthlyPrice(settings);

  /* სეზონი დასრულებულია ან 30 დღეზე ნაკლები რჩება → „დასრულებული" სექციაში */
  const endedThreshold = addDays(todayTbilisi(), 30);
  const activeClubs = clubs.filter(
    (club) => club.endDate === null || club.endDate >= endedThreshold,
  );
  const endedClubs = clubs.filter(
    (club) => club.endDate !== null && club.endDate < endedThreshold,
  );

  /* ქვიზიდან მოსული (?match=<slug>): მატჩი პირველი დგას ბეჯით, ტესტის
     თიზერი კი იმალება - ტესტი უკვე გავლილი აქვს */
  const matchParam = searchParams.match;
  const matchSlug =
    typeof matchParam === "string" &&
    activeClubs.some((club) => club.slug === matchParam)
      ? matchParam
      : null;
  const orderedActive = matchSlug
    ? [...activeClubs].sort((a, b) =>
        a.slug === matchSlug ? -1 : b.slug === matchSlug ? 1 : 0,
      )
    : activeClubs;

  return (
    <Section tone="cream">
      <div className="max-w-3xl">
        <p className="eyebrow">{t(texts, "clubs.hero.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">
          {t(texts, "clubs.hero.title")}
        </h1>
        <Markdown body={t(texts, "clubs.hero.lead")} className="mt-4" />
      </div>

      {clubs.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={t(texts, "clubs.empty.title")}
            description={t(texts, "clubs.empty.description")}
          />
        </div>
      ) : (
        <>
          <Card className="mt-8">
            <p className="eyebrow">{t(texts, "clubs.pricing.eyebrow")}</p>
            <Markdown body={t(texts, "clubs.pricing.note")} className="mt-2" />
          </Card>

          {/* ტესტის თიზერი — მთავარი გვერდის იდენტური მუქი ბლოკი, რომ
              ორივეგან ერთნაირად გამოიყურებოდეს (მფლობელის შენიშვნა) */}
          {matchSlug ? null : (
            <div className="mt-4 flex flex-col gap-4 rounded-card bg-green-dark p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold text-white">
                {t(texts, "clubs.quiz.teaser")}
              </p>
              <ButtonLink
                href="/tests/romeli-klubia-shentvis"
                variant="inverted"
                className="shrink-0"
              >
                {t(texts, "clubs.quiz.cta")}
              </ButtonLink>
            </div>
          )}

          {orderedActive.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {orderedActive.map((club) =>
                club.slug === matchSlug ? (
                  <div
                    key={club.id}
                    className="relative flex rounded-card ring-2 ring-green-dark"
                  >
                    <span className="absolute -top-3 left-4 z-10 rounded-pill bg-green-dark px-3 py-1 text-xs font-semibold text-white">
                      {t(texts, "clubs.match.badge")}
                    </span>
                    <ClubCard
                      club={club}
                      seatsRemaining={seatsFor(remaining, club.id, settings)}
                      pricePair={pricePair}
                      seatCapacity={settings.clubSeatCapacity}
                      showSeatCount={settings.showPublicSeats}
                    />
                  </div>
                ) : (
                  <ClubCard
                    key={club.id}
                    club={club}
                    seatsRemaining={seatsFor(remaining, club.id, settings)}
                    pricePair={pricePair}
                    seatCapacity={settings.clubSeatCapacity}
                    showSeatCount={settings.showPublicSeats}
                  />
                ),
              )}
            </div>
          ) : null}

          {endedClubs.length > 0 ? (
            <div className="mt-14">
              <h2 className="text-h2 font-bold text-green-dark">
                {t(texts, "clubs.list.ended.title")}
              </h2>
              <p className="mt-2 max-w-3xl text-ink-muted">
                {t(texts, "clubs.list.ended.description")}
              </p>
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {endedClubs.map((club) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    seatsRemaining={seatsFor(remaining, club.id, settings)}
                    pricePair={pricePair}
                    seatCapacity={settings.clubSeatCapacity}
                    showSeatCount={settings.showPublicSeats}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </Section>
  );
}
