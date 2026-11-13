import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/cards";
import { Markdown } from "@/components/markdown";
import { EmptyState } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { courseHasEnded, todayTbilisi } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { listCourseCategories, listCourses } from "@/lib/db/queries/catalog";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { toTetri } from "@/lib/money";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "courses.seo.title"),
    description: t(texts, "courses.seo.description"),
  };
}

/** ფასის ფილტრი — ლარებში UI-სთვის, თეთრში query-სთვის; წარწერები რეესტრიდან */
const PRICE_FILTERS = [
  { key: "all", labelKey: "courses.filters.price.1" },
  { key: "0-200", labelKey: "courses.filters.price.2", max: toTetri(200) },
  {
    key: "200-400",
    labelKey: "courses.filters.price.3",
    min: toTetri(200),
    max: toTetri(400),
  },
  { key: "400+", labelKey: "courses.filters.price.4", min: toTetri(400) },
] as const;

function filterHref(params: { category?: string; price?: string }) {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.price && params.price !== "all") search.set("price", params.price);
  const query = search.toString();
  return query ? `/courses?${query}` : "/courses";
}

export default async function CoursesPage(props: PageProps<"/courses">) {
  const searchParams = await props.searchParams;

  const rawCategory = searchParams.category;
  const activeCategory =
    typeof rawCategory === "string" && rawCategory ? rawCategory : undefined;

  const rawPrice = searchParams.price;
  const activePriceKey = typeof rawPrice === "string" ? rawPrice : "all";
  const priceFilter =
    PRICE_FILTERS.find((filter) => filter.key === activePriceKey) ??
    PRICE_FILTERS[0];

  /* allCourses ცალკე იტვირთება — „დასრულებული" სექციაზე ფილტრები არ მოქმედებს */
  const [texts, categories, courses, allCourses] = await Promise.all([
    getSiteTexts(),
    listCourseCategories(),
    listCourses({
      category: activeCategory,
      minPrice: "min" in priceFilter ? priceFilter.min : undefined,
      maxPrice: "max" in priceFilter ? priceFilter.max : undefined,
    }),
    listCourses(),
  ]);

  const hasFilters = Boolean(activeCategory) || activePriceKey !== "all";

  /* (endDate ?? startDate) გასულია → „დასრულებული" სექციაში; დალაგება
     დროით - დაგეგმილი ახლოესი თარიღით წინ, დასრულებული ბოლო ჯერ */
  const today = todayTbilisi();
  const FAR_FUTURE = "9999-12-31";
  const activeCourses = courses
    .filter((course) => !courseHasEnded(course, today))
    .sort((a, b) => {
      const aStart = a.startDate ?? FAR_FUTURE;
      const bStart = b.startDate ?? FAR_FUTURE;
      if (aStart !== bStart) return aStart < bStart ? -1 : 1;
      return a.title.localeCompare(b.title, "ka-GE");
    });
  const endedCourses = allCourses
    .filter((course) => courseHasEnded(course, today))
    .sort((a, b) => {
      const aEnd = a.endDate ?? a.startDate ?? "";
      const bEnd = b.endDate ?? b.startDate ?? "";
      if (aEnd !== bEnd) return aEnd > bEnd ? -1 : 1;
      return a.title.localeCompare(b.title, "ka-GE");
    });

  return (
    <Section tone="cream">
      <div className="max-w-3xl">
        <p className="eyebrow">{t(texts, "courses.hero.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">
          {t(texts, "courses.hero.title")}
        </h1>
        <Markdown body={t(texts, "courses.hero.lead")} className="mt-4" />
      </div>

      {/* ფილტრები (§5.2) */}
      <div className="mt-8 flex flex-col gap-4">
        {categories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">
              {t(texts, "courses.filters.categoryLabel")}
            </span>
            <Link
              href={filterHref({ price: activePriceKey })}
              className={cn(
                "min-h-9 rounded-pill border px-4 py-1.5 text-sm font-medium transition",
                !activeCategory
                  ? "border-green-dark bg-green-dark text-white"
                  : "border-line bg-white text-ink-muted hover:border-green-mid",
              )}
            >
              {t(texts, "courses.filters.all")}
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={filterHref({ category, price: activePriceKey })}
                className={cn(
                  "min-h-9 rounded-pill border px-4 py-1.5 text-sm font-medium transition",
                  activeCategory === category
                    ? "border-green-dark bg-green-dark text-white"
                    : "border-line bg-white text-ink-muted hover:border-green-mid",
                )}
              >
                {category}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">
            {t(texts, "courses.filters.priceLabel")}
          </span>
          {PRICE_FILTERS.map((filter) => (
            <Link
              key={filter.key}
              href={filterHref({
                category: activeCategory,
                price: filter.key,
              })}
              className={cn(
                "min-h-9 rounded-pill border px-4 py-1.5 text-sm font-medium transition",
                activePriceKey === filter.key
                  ? "border-green-dark bg-green-dark text-white"
                  : "border-line bg-white text-ink-muted hover:border-green-mid",
              )}
            >
              {t(texts, filter.labelKey)}
            </Link>
          ))}
        </div>
      </div>

      {activeCourses.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={
              hasFilters
                ? t(texts, "courses.empty.filtered.title")
                : t(texts, "courses.empty.none.title")
            }
            description={
              hasFilters
                ? t(texts, "courses.empty.filtered.description")
                : t(texts, "courses.empty.none.description")
            }
          />
        </div>
      ) : (
        <div className="mt-10">
          <h2 className="text-h2 font-bold text-green-dark">
            {t(texts, "courses.list.planned.title")}
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {activeCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}

      {endedCourses.length > 0 ? (
        <div className="mt-14">
          <h2 className="text-h2 font-bold text-green-dark">
            {t(texts, "courses.list.ended.title")}
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {endedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      ) : null}
    </Section>
  );
}
