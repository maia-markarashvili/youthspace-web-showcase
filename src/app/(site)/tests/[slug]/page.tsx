import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { QuizRunner } from "./quiz-runner";
import {
  QuizResultPanel,
  type QuizOpenDay,
} from "@/components/quiz-result-panel";
import { Section } from "@/components/ui/section";
import {
  clubSeatsRemainingByClub,
  courseSeatsRemaining,
  getPricingSettings,
  seatsFor,
} from "@/lib/db/queries/availability";
import { getNextFreeEvent, listClubs } from "@/lib/db/queries/catalog";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { clubMonthlyPrice } from "@/lib/pricing";
import { getQuizBySlug } from "@/lib/quizzes";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/tests/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const quiz = getQuizBySlug(slug);
  if (!quiz) return { title: "ტესტი ვერ მოიძებნა" };
  return { title: quiz.title, description: quiz.description };
}

export default async function QuizPage(props: PageProps<"/tests/[slug]">) {
  const { slug } = await props.params;
  const quiz = getQuizBySlug(slug);
  if (!quiz) notFound();

  const settings = await getPricingSettings();
  const [texts, clubs, seatsRemaining, nextFreeEvent] = await Promise.all([
    getSiteTexts(),
    listClubs(),
    clubSeatsRemainingByClub(settings),
    getNextFreeEvent(),
  ]);

  /* უახლოესი ღია კარის დღე - „ჯერ ნახე, მერე გადაწყვიტე" ბარათი. ამოწურული
     ადგილებით არც ჩანს: sold-out ფორმაზე გაგზავნა არჩევანი აღარაა */
  let openDay: QuizOpenDay | null = null;
  if (nextFreeEvent) {
    const seatsLeft = await courseSeatsRemaining(
      nextFreeEvent.id,
      nextFreeEvent.capacity,
    );
    if (seatsLeft !== 0) openDay = { course: nextFreeEvent, seatsLeft };
  }

  const pricePair = clubMonthlyPrice(settings);

  /* შედეგის პანელი (მატჩი + სამი გზა) სერვერზე რენდერდება (async server
     კომპონენტია) და client runner-ს მზა ReactNode-ებად გადაეცემა */
  const resultCards: Record<string, ReactNode> = {};
  const clubTitles: Record<string, string> = {};
  for (const club of clubs) {
    if (!quiz.clubOrder.includes(club.slug)) continue;
    clubTitles[club.slug] = club.title;
    resultCards[club.slug] = (
      <QuizResultPanel
        club={club}
        pricePair={pricePair}
        seatsRemaining={seatsFor(seatsRemaining, club.id, settings)}
        seatCapacity={settings.clubSeatCapacity}
        showSeatCount={settings.showPublicSeats}
        openDay={openDay}
      />
    );
  }

  return (
    <Section tone="cream">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">{t(texts, "tests.hero.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">{quiz.title}</h1>
        <p className="mt-4 text-lead text-ink-muted">{quiz.description}</p>

        <QuizRunner
          quiz={quiz}
          resultCards={resultCards}
          clubTitles={clubTitles}
          labels={{
            progress: t(texts, "tests.quiz.progress"),
            back: t(texts, "tests.quiz.back"),
            resultEyebrow: t(texts, "tests.quiz.result.eyebrow"),
            resultTitle: t(texts, "tests.quiz.result.title"),
            retake: t(texts, "tests.quiz.result.retake"),
            fallback: t(texts, "tests.quiz.result.fallback"),
            allClubs: t(texts, "tests.quiz.result.all-clubs"),
          }}
        />
      </div>
    </Section>
  );
}
