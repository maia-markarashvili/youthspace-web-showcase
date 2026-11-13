import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPublishedAt, typeLabel } from "@/components/story-card";
import { Markdown } from "@/components/markdown";
import { FacebookShare } from "@/components/share-buttons";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Gallery } from "@/components/ui/gallery";
import { Section } from "@/components/ui/section";
import { getContentPostBySlug } from "@/lib/db/queries/content";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { markdownExcerpt } from "@/lib/markdown";
import { t } from "@/lib/site-texts";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/* არააქტიური ფსევდო-კლუბი „ლიტერატურული კონკურსი" — /clubs/{slug} მასზე
   404-დება, ამიტომ ბეჯი და ქვედა ღილაკი კონკურსის სიახლეზე მიდის */
const COMPETITION_CLUB_SLUG = "literaturuli-konkursi";
const COMPETITION_STORY_HREF = "/stories/litkonkursi-2026-pirobebi";

export async function generateMetadata(
  props: PageProps<"/stories/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getContentPostBySlug(slug);

  if (!post) return { title: "პოსტი ვერ მოიძებნა" };

  const description = post.body ? markdownExcerpt(post.body, 160) : undefined;
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      images: post.media[0] ? [{ url: post.media[0] }] : undefined,
    },
  };
}

/** §16 — ინდივიდუალური, გასაზიარებელი გვერდი (finedu-ს დეტალის განლაგება) */
export default async function StoryDetailPage(
  props: PageProps<"/stories/[slug]">,
) {
  const { slug } = await props.params;
  const post = await getContentPostBySlug(slug);

  if (!post) notFound();

  const texts = await getSiteTexts();
  const published = formatPublishedAt(post.publishedAt);
  const youtubeId =
    post.type === "work_video" ? extractYouTubeId(post.youtubeUrl ?? "") : null;
  const banner = post.media[0];
  /* ბანერად წასული ფოტო ქვედა გალერეაში აღარ მეორდება */
  const galleryImages = youtubeId ? post.media : post.media.slice(1);
  const clubHref =
    post.clubSlug === COMPETITION_CLUB_SLUG
      ? COMPETITION_STORY_HREF
      : `/clubs/${post.clubSlug}`;

  return (
    <Section tone="cream">
      <article className="mx-auto max-w-3xl">
        {/* ბანერი: ვიდეოს — embed, დანარჩენს — პირველი ფოტო მცირე ზომით */}
        {youtubeId ? (
          <iframe
            src={youtubeEmbedUrl(youtubeId)}
            title={post.title}
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full rounded-card border border-line bg-ink"
          />
        ) : banner ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-card border border-line bg-cream">
            <Image
              src={banner}
              alt={post.title}
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 48rem"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className={banner || youtubeId ? "mt-8" : undefined}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{typeLabel(texts, post.type)}</Badge>
            {post.clubTitle && post.clubSlug ? (
              <Link href={clubHref}>
                <Badge>{post.clubTitle}</Badge>
              </Link>
            ) : null}
          </div>

          <h1 className="mt-4 text-h1 font-bold text-green-dark">
            {post.title}
          </h1>

          <p className="mt-3 text-sm text-ink-muted">
            {post.authorName ? <span>{post.authorName}</span> : null}
            {post.authorName && published ? <span> · </span> : null}
            {published && post.publishedAt ? (
              <time dateTime={post.publishedAt.toISOString()}>{published}</time>
            ) : null}
          </p>
        </div>

        {post.body ? (
          <Markdown body={post.body} className="mt-8 text-lead leading-9" />
        ) : null}

        {post.fileUrl ? (
          /* raw <a> განზრახ — /uploads/ route-handler-ის URL-ზე next/link არ გვინდა */
          <a
            href={post.fileUrl}
            download
            className={buttonClasses("primary", "md", "mt-8")}
          >
            {t(texts, "stories.works.download")}
          </a>
        ) : null}

        {galleryImages.length > 0 ? (
          <Gallery images={galleryImages} alt={post.title} className="mt-10" />
        ) : null}

        <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
          {post.relatedLinks?.map((link) => (
            <ButtonLink key={link.href} href={link.href} variant="primary">
              {link.label}
            </ButtonLink>
          ))}
          <FacebookShare path={`/stories/${slug}`} />
          <ButtonLink href="/stories" variant="secondary">
            {t(texts, "stories.detail.back")}
          </ButtonLink>
          {post.clubSlug ? (
            <ButtonLink href={clubHref} variant="ghost">
              {post.clubTitle} →
            </ButtonLink>
          ) : null}
        </div>
      </article>
    </Section>
  );
}
