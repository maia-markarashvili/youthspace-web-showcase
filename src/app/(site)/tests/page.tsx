import type { Metadata } from "next";
import { LinkCard } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { QUIZZES } from "@/lib/quizzes";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "tests.seo.title"),
    description: t(texts, "tests.seo.description"),
  };
}

export default async function TestsPage() {
  const texts = await getSiteTexts();

  return (
    <Section tone="cream">
      <div className="max-w-3xl">
        <p className="eyebrow">{t(texts, "tests.hero.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">
          {t(texts, "tests.hero.title")}
        </h1>
        <p className="mt-4 text-lead text-ink-muted">
          {t(texts, "tests.hero.lead")}
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {QUIZZES.map((quiz) => (
          <LinkCard key={quiz.slug} href={`/tests/${quiz.slug}`}>
            <h2 className="text-h3 font-bold text-green-dark">{quiz.title}</h2>
            <p className="mt-2 text-sm leading-7 text-ink-muted">
              {quiz.description}
            </p>
            <p className="mt-auto pt-5 text-sm font-semibold text-green-dark">
              {t(texts, "tests.card.cta")}
            </p>
          </LinkCard>
        ))}
      </div>
    </Section>
  );
}
