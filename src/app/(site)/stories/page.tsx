import type { Metadata } from "next";
import Link from "next/link";
import { NewsRiver } from "@/components/news-river";
import { WorkVideoGrid, type WorkVideo } from "@/components/work-video-grid";
import { WorkResearchRow, WorkTextCard } from "@/components/works";
import { formatPublishedAt } from "@/components/story-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import { listContentPosts } from "@/lib/db/queries/content";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { WORK_TYPES, type ContentType } from "@/lib/db/schema";
import { markdownToPlain } from "@/lib/markdown";
import { t } from "@/lib/site-texts";
import { extractYouTubeId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "stories.seo.title"),
    description: t(texts, "stories.seo.description"),
  };
}

/** ორი მთავარი ტაბი: ამბები · ნამუშევრები */
const TABS = [
  { key: "news", textKey: "stories.tabs.news" },
  { key: "works", textKey: "stories.tabs.works" },
] as const;

/** ნამუშევრების ქვე-ფილტრები (პატარა ბულეტები) */
const KINDS: { key: string; textKey: string; type: ContentType }[] = [
  { key: "texts", textKey: "stories.works.kind.texts", type: "work_text" },
  { key: "video", textKey: "stories.works.kind.video", type: "work_video" },
  {
    key: "research",
    textKey: "stories.works.kind.research",
    type: "work_research",
  },
];

export default async function StoriesPage(props: PageProps<"/stories">) {
  const searchParams = await props.searchParams;
  const rawTab = searchParams.tab;
  const activeKey = typeof rawTab === "string" ? rawTab : "news";
  const activeTab = TABS.find((tab) => tab.key === activeKey) ?? TABS[0];
  const isWorks = activeTab.key === "works";

  const rawKind = searchParams.kind;
  const activeKind = isWorks
    ? (KINDS.find((kind) => kind.key === rawKind) ?? null)
    : null;

  const [posts, texts] = await Promise.all([
    listContentPosts(
      isWorks
        ? { types: activeKind ? [activeKind.type] : WORK_TYPES }
        : { type: "news" },
    ),
    getSiteTexts(),
  ]);

  /* ნამუშევრები ტიპებად იყოფა — თითო ტიპს თავისი ვიზუალი აქვს */
  const textPosts = posts.filter((post) => post.type === "work_text");
  const researchPosts = posts.filter((post) => post.type === "work_research");
  const videos: WorkVideo[] = posts
    .filter((post) => post.type === "work_video")
    .flatMap((post) => {
      const youtubeId = extractYouTubeId(post.youtubeUrl ?? "");
      return youtubeId
        ? [
            {
              key: post.id,
              title: post.title,
              youtubeId,
              description: post.body ? markdownToPlain(post.body) : null,
              dateLabel: formatPublishedAt(post.publishedAt),
            },
          ]
        : [];
    });

  const worksEmpty =
    textPosts.length === 0 && videos.length === 0 && researchPosts.length === 0;
  /* სექციის სათაურები მხოლოდ „ყველა" ხედში ჩანს */
  const showHeadings = !activeKind;
  /* „ყველა" ხედში ტექსტების მხოლოდ პირველი 3 ჩანს — სრული სია kind=texts-შია */
  const visibleTextPosts = showHeadings ? textPosts.slice(0, 3) : textPosts;

  return (
    <Section tone="cream">
      <div className="max-w-3xl">
        <p className="eyebrow">{t(texts, "stories.hero.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">
          {t(texts, "stories.hero.title")}
        </h1>
        <p className="mt-4 text-lead text-ink-muted">
          {t(texts, "stories.hero.lead")}
        </p>
      </div>

      <nav aria-label="ისტორიების ფილტრი" className="mt-8 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "news" ? "/stories" : `/stories?tab=${tab.key}`}
            aria-current={activeTab.key === tab.key ? "page" : undefined}
            className={cn(
              "min-h-11 rounded-pill border px-5 py-2.5 text-sm font-semibold transition",
              activeTab.key === tab.key
                ? "border-green-dark bg-green-dark text-white"
                : "border-line bg-white text-ink-muted hover:border-green-mid",
            )}
          >
            {t(texts, tab.textKey)}
          </Link>
        ))}
      </nav>

      {isWorks ? (
        <>
          {/* ქვე-ფილტრები: ყველა · ტექსტები · ვიდეო · კვლევები */}
          <nav
            aria-label="ნამუშევრების ტიპი"
            className="mt-4 flex flex-wrap gap-2"
          >
            <Link
              href="/stories?tab=works"
              aria-current={!activeKind ? "page" : undefined}
              className={cn(
                "min-h-9 rounded-pill border px-4 py-1.5 text-sm font-medium transition",
                !activeKind
                  ? "border-green-dark bg-green-dark text-white"
                  : "border-line bg-white text-ink-muted hover:border-green-mid",
              )}
            >
              {t(texts, "stories.works.kind.all")}
            </Link>
            {KINDS.map((kind) => (
              <Link
                key={kind.key}
                href={`/stories?tab=works&kind=${kind.key}`}
                aria-current={activeKind?.key === kind.key ? "page" : undefined}
                className={cn(
                  "min-h-9 rounded-pill border px-4 py-1.5 text-sm font-medium transition",
                  activeKind?.key === kind.key
                    ? "border-green-dark bg-green-dark text-white"
                    : "border-line bg-white text-ink-muted hover:border-green-mid",
                )}
              >
                {t(texts, kind.textKey)}
              </Link>
            ))}
          </nav>

          {worksEmpty ? (
            <div className="mt-10">
              <EmptyState
                title={t(texts, "stories.empty.works.title")}
                description={t(texts, "stories.empty.works.description")}
              />
            </div>
          ) : (
            <div className="mt-10 flex flex-col gap-14">
              {textPosts.length > 0 ? (
                <section>
                  {showHeadings ? (
                    <h2 className="mb-6 text-h2 font-bold text-green-dark">
                      {t(texts, "stories.works.kind.texts")}
                    </h2>
                  ) : null}
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {visibleTextPosts.map((post) => (
                      <WorkTextCard key={post.id} post={post} />
                    ))}
                  </div>
                  {showHeadings && textPosts.length > 3 ? (
                    <div className="mt-6">
                      <ButtonLink
                        href="/stories?tab=works&kind=texts"
                        variant="secondary"
                      >
                        {t(texts, "stories.works.texts.more")}
                      </ButtonLink>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {videos.length > 0 ? (
                <section>
                  {showHeadings ? (
                    <h2 className="mb-6 text-h2 font-bold text-green-dark">
                      {t(texts, "stories.works.kind.video")}
                    </h2>
                  ) : null}
                  <WorkVideoGrid videos={videos} />
                </section>
              ) : null}

              {researchPosts.length > 0 ? (
                <section>
                  {showHeadings ? (
                    <h2 className="mb-6 text-h2 font-bold text-green-dark">
                      {t(texts, "stories.works.kind.research")}
                    </h2>
                  ) : null}
                  <div className="divide-y divide-line border-y border-line">
                    {researchPosts.map((post) => (
                      <WorkResearchRow
                        key={post.id}
                        post={post}
                        downloadLabel={t(texts, "stories.works.download")}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </>
      ) : posts.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={t(texts, "stories.empty.posts.title")}
            description={t(texts, "stories.empty.posts.description")}
          />
        </div>
      ) : (
        <NewsRiver posts={posts} />
      )}
    </Section>
  );
}
