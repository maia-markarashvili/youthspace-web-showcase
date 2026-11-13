import Image from "next/image";
import Link from "next/link";
import { formatPublishedAt, type StoryCardPost } from "@/components/story-card";
import { markdownExcerpt } from "@/lib/markdown";

/**
 * „ამბების“ ქრონოლოგიური მდინარე (NPR/finedu-ს სტილი): თარიღი მარცხნივ,
 * სათაური + მოკლე აღწერა შუაში, პატარა ფოტო მარჯვნივ, თხელი გამყოფები.
 * მობილურზე ფოტო იმალება, თარიღი ტექსტის თავზე ადის.
 */
export function NewsRiver({ posts }: { posts: StoryCardPost[] }) {
  return (
    <ol className="mt-10 border-t border-line">
      {posts.map((post) => {
        const dateLabel = formatPublishedAt(post.publishedAt);
        const thumb = post.media[0];

        const row = (
          <div className="grid gap-x-6 gap-y-1.5 py-6 sm:grid-cols-[6.5rem_1fr_10rem] sm:items-start">
            {dateLabel && post.publishedAt ? (
              <time
                dateTime={post.publishedAt.toISOString()}
                className="text-sm font-semibold text-ink-muted"
              >
                {dateLabel}
              </time>
            ) : (
              <span aria-hidden className="hidden sm:block" />
            )}

            <div>
              <h3 className="text-h3 font-bold text-green-dark group-hover:underline">
                {post.title}
              </h3>
              {post.body ? (
                <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-muted">
                  {markdownExcerpt(post.body, 180)}
                </p>
              ) : null}
              {post.clubTitle ? (
                <p className="mt-1.5 text-xs font-semibold text-green-mid">
                  {post.clubTitle}
                </p>
              ) : null}
            </div>

            {thumb ? (
              <div className="relative hidden h-24 w-40 justify-self-end overflow-hidden rounded-card border border-line bg-cream sm:block">
                <Image
                  src={thumb}
                  alt=""
                  fill
                  unoptimized
                  sizes="10rem"
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
        );

        return (
          <li key={post.id} className="border-b border-line">
            {post.slug ? (
              <Link href={`/stories/${post.slug}`} className="group block">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ol>
  );
}
