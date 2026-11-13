import type { Metadata } from "next";
import { ClubCard, CourseCard } from "@/components/cards";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { getPricingSettings } from "@/lib/db/queries/availability";
import { searchSite } from "@/lib/db/queries/search";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { clubMonthlyPrice } from "@/lib/pricing";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "search.seo.title"),
    description: t(texts, "search.seo.description"),
    robots: { index: false },
  };
}

const inputClass =
  "min-h-11 w-full rounded-card border border-line bg-white px-4 py-2.5 text-base text-ink placeholder:text-ink-muted/60 focus:border-green-mid";

export default async function SearchPage(props: PageProps<"/search">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const [texts, results, settings] = await Promise.all([
    getSiteTexts(),
    searchSite(q),
    getPricingSettings(),
  ]);

  const pricePair = clubMonthlyPrice(settings);
  const total =
    results.clubs.length + results.courses.length + results.posts.length;
  const tooShort = q.length > 0 && q.length < 2;

  return (
    <Section tone="cream">
      <div className="max-w-3xl">
        <p className="eyebrow">{t(texts, "search.hero.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">
          {t(texts, "search.hero.title")}
        </h1>
      </div>

      {/* ჩვეულებრივი GET ფორმა — client JS არ სჭირდება */}
      <form action="/search" role="search" className="mt-8 flex max-w-xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label={t(texts, "search.hero.title")}
          placeholder={t(texts, "search.input.placeholder")}
          className={inputClass}
        />
        <Button type="submit" className="shrink-0">
          {t(texts, "search.button")}
        </Button>
      </form>

      {q === "" ? (
        <p className="mt-8 text-ink-muted">{t(texts, "search.hint.empty")}</p>
      ) : tooShort ? (
        <p className="mt-8 text-ink-muted">{t(texts, "search.hint.short")}</p>
      ) : total === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={t(texts, "search.empty.title")}
            description={t(texts, "search.empty.description")}
          />
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-14">
          {results.clubs.length > 0 ? (
            <section>
              <h2 className="mb-6 text-h2 font-bold text-green-dark">
                {t(texts, "search.group.clubs")}
              </h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {results.clubs.map((club) => (
                  <ClubCard key={club.id} club={club} pricePair={pricePair} />
                ))}
              </div>
            </section>
          ) : null}

          {results.courses.length > 0 ? (
            <section>
              <h2 className="mb-6 text-h2 font-bold text-green-dark">
                {t(texts, "search.group.courses")}
              </h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {results.courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          ) : null}

          {results.posts.length > 0 ? (
            <section>
              <h2 className="mb-6 text-h2 font-bold text-green-dark">
                {t(texts, "search.group.posts")}
              </h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {results.posts.map((post) => (
                  <StoryCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </Section>
  );
}
