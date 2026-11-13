import { Badge, Card, LinkCard } from "@/components/ui/card";
import { CoverImage } from "@/components/ui/gallery";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { markdownExcerpt } from "@/lib/markdown";
import { t } from "@/lib/site-texts";
import type { ContentType } from "@/lib/db/schema";

/** ტიპი → რეესტრის key (work_text → work-text) */
const CONTENT_TYPE_KEYS: Record<ContentType, string> = {
  news: "shared.contenttype.news",
  work_text: "shared.contenttype.work-text",
  work_video: "shared.contenttype.work-video",
  work_research: "shared.contenttype.work-research",
};

export type StoryCardPost = {
  id: string;
  type: string;
  slug: string | null;
  title: string;
  body: string | null;
  authorName: string | null;
  media: string[];
  publishedAt: Date | null;
  clubTitle: string | null;
  clubSlug: string | null;
};

export function typeLabel(texts: ReadonlyMap<string, string>, type: string) {
  const key = CONTENT_TYPE_KEYS[type as ContentType];
  return key ? t(texts, key) : type;
}

export function formatPublishedAt(date: Date | null) {
  if (!date) return null;
  /* timeZone აუცილებელია — UTC სერვერზე თბილისის საღამოს პოსტი წინა დღით გამოჩნდებოდა */
  return new Intl.DateTimeFormat("ka-GE", {
    timeZone: "Asia/Tbilisi",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function StoryCard({ post }: { post: StoryCardPost }) {
  const texts = await getSiteTexts();

  const content = (
    <>
      {post.media.length > 0 ? (
        <CoverImage src={post.media[0]} alt={post.title} className="mb-5" />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{typeLabel(texts, post.type)}</Badge>
        {post.clubTitle ? <Badge>{post.clubTitle}</Badge> : null}
      </div>

      <h3 className="mt-3 text-h3 font-bold text-green-dark">{post.title}</h3>
      {post.body ? (
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-ink-muted">
          {markdownExcerpt(post.body, 200)}
        </p>
      ) : null}

      <div className="mt-auto pt-5 text-sm text-ink-muted">
        {post.authorName ? <span>{post.authorName}</span> : null}
        {post.authorName && post.publishedAt ? <span> · </span> : null}
        {post.publishedAt ? (
          <time dateTime={post.publishedAt.toISOString()}>
            {formatPublishedAt(post.publishedAt)}
          </time>
        ) : null}
      </div>
    </>
  );

  if (!post.slug) {
    return <Card>{content}</Card>;
  }

  return <LinkCard href={`/stories/${post.slug}`}>{content}</LinkCard>;
}
