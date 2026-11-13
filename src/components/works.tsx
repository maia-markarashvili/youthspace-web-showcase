import Image from "next/image";
import Link from "next/link";
import { formatPublishedAt, type StoryCardPost } from "@/components/story-card";
import { buttonClasses } from "@/components/ui/button";
import { LinkCard, Card } from "@/components/ui/card";
import { CoverImage } from "@/components/ui/gallery";
import { markdownExcerpt } from "@/lib/markdown";

/** ნამუშევრების (ტექსტი/ვიდეო/კვლევა) საერთო ბარათები — server კომპონენტები */

/** კომპაქტური ბმული-ბარათი კლუბის ლენდინგის §6-ისთვის (ძველი ClubOutputLink) */
export function WorkLink({ post }: { post: StoryCardPost }) {
  const inner = (
    <>
      <p className="font-semibold text-green-dark">{post.title}</p>
      {post.authorName ? (
        <p className="mt-1 text-sm text-ink-muted">{post.authorName}</p>
      ) : null}
    </>
  );

  return post.slug ? (
    <Link
      href={`/stories/${post.slug}`}
      className="block rounded-card border border-line bg-white p-4 transition hover:border-green-mid"
    >
      {inner}
    </Link>
  ) : (
    <div className="rounded-card border border-line bg-white p-4">{inner}</div>
  );
}

/** ტექსტური ნამუშევარი — ბლოგის სტილის ბარათი (ფოტო, სათაური, ავტორი, თარიღი) */
export function WorkTextCard({ post }: { post: StoryCardPost }) {
  const content = (
    <>
      <CoverImage src={post.media[0]} alt={post.title} className="mb-5" />
      <h3 className="text-h3 font-bold text-green-dark">{post.title}</h3>
      {post.body ? (
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-ink-muted">
          {markdownExcerpt(post.body, 180)}
        </p>
      ) : null}
      <div className="mt-auto pt-5 text-sm text-ink-muted">
        {post.authorName ? (
          <span className="font-semibold text-green-dark">
            {post.authorName}
          </span>
        ) : null}
        {post.authorName && post.publishedAt ? <span> · </span> : null}
        {post.publishedAt ? (
          <time dateTime={post.publishedAt.toISOString()}>
            {formatPublishedAt(post.publishedAt)}
          </time>
        ) : null}
      </div>
    </>
  );

  return post.slug ? (
    <LinkCard href={`/stories/${post.slug}`}>{content}</LinkCard>
  ) : (
    <Card>{content}</Card>
  );
}

/** კვლევა — სიის რიგი გადმოწერის ღილაკით (finedu-ს პუბლიკაციების სტილი) */
export function WorkResearchRow({
  post,
  downloadLabel,
}: {
  post: StoryCardPost & { fileUrl?: string | null };
  downloadLabel: string;
}) {
  const thumb = post.media[0];
  const title = post.slug ? (
    <Link
      href={`/stories/${post.slug}`}
      className="font-bold text-green-dark hover:underline"
    >
      {post.title}
    </Link>
  ) : (
    <span className="font-bold text-green-dark">{post.title}</span>
  );

  return (
    <div className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap">
      {thumb ? (
        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-card border border-line bg-cream">
          <Image
            src={thumb}
            alt=""
            fill
            unoptimized
            sizes="4rem"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="flex h-20 w-16 shrink-0 items-center justify-center rounded-card border border-line bg-cream text-2xl"
        >
          📄
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-lg leading-snug">{title}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {post.authorName ? <span>{post.authorName}</span> : null}
          {post.authorName && post.publishedAt ? <span> · </span> : null}
          {post.publishedAt ? (
            <time dateTime={post.publishedAt.toISOString()}>
              {formatPublishedAt(post.publishedAt)}
            </time>
          ) : null}
        </p>
      </div>

      {post.fileUrl ? (
        /* raw <a> განზრახ — /uploads/ route-handler-ის URL-ზე next/link არ გვინდა */
        <a
          href={post.fileUrl}
          download
          className={buttonClasses("secondary", "md", "shrink-0")}
        >
          {downloadLabel}
        </a>
      ) : null}
    </div>
  );
}
