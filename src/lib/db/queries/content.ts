import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clubs, contentPosts, type ContentType } from "@/lib/db/schema";

const publishedOnly = and(
  eq(contentPosts.isActive, true),
  sql`(${contentPosts.publishedAt} IS NULL OR ${contentPosts.publishedAt} <= now())`,
);

/**
 * §16 — /stories ლენტა.
 * type/types არ არის მითითებული → ყველა; `featuredOnly` → მთავარი გვერდის „გამორჩეულები".
 */
export function listContentPosts(options?: {
  type?: ContentType;
  types?: readonly ContentType[];
  clubId?: string;
  featuredOnly?: boolean;
  limit?: number;
}) {
  const conditions = [publishedOnly];

  if (options?.type) conditions.push(eq(contentPosts.type, options.type));
  if (options?.types)
    conditions.push(inArray(contentPosts.type, [...options.types]));
  if (options?.clubId) conditions.push(eq(contentPosts.clubId, options.clubId));
  if (options?.featuredOnly) conditions.push(eq(contentPosts.isFeatured, true));

  const query = db
    .select({
      id: contentPosts.id,
      type: contentPosts.type,
      slug: contentPosts.slug,
      title: contentPosts.title,
      body: contentPosts.body,
      authorName: contentPosts.authorName,
      collectionSlug: contentPosts.collectionSlug,
      media: contentPosts.media,
      youtubeUrl: contentPosts.youtubeUrl,
      fileUrl: contentPosts.fileUrl,
      relatedLinks: contentPosts.relatedLinks,
      isFeatured: contentPosts.isFeatured,
      publishedAt: contentPosts.publishedAt,
      createdAt: contentPosts.createdAt,
      clubId: contentPosts.clubId,
      clubTitle: clubs.title,
      clubSlug: clubs.slug,
    })
    .from(contentPosts)
    .leftJoin(clubs, eq(contentPosts.clubId, clubs.id))
    .where(and(...conditions))
    .orderBy(desc(contentPosts.publishedAt), desc(contentPosts.createdAt));

  return options?.limit ? query.limit(options.limit) : query;
}

export async function getContentPostBySlug(slug: string) {
  const [post] = await listContentPostsBySlug(slug);
  return post ?? null;
}

function listContentPostsBySlug(slug: string) {
  return db
    .select({
      id: contentPosts.id,
      type: contentPosts.type,
      slug: contentPosts.slug,
      title: contentPosts.title,
      body: contentPosts.body,
      authorName: contentPosts.authorName,
      collectionSlug: contentPosts.collectionSlug,
      media: contentPosts.media,
      youtubeUrl: contentPosts.youtubeUrl,
      fileUrl: contentPosts.fileUrl,
      relatedLinks: contentPosts.relatedLinks,
      isFeatured: contentPosts.isFeatured,
      publishedAt: contentPosts.publishedAt,
      createdAt: contentPosts.createdAt,
      clubId: contentPosts.clubId,
      clubTitle: clubs.title,
      clubSlug: clubs.slug,
    })
    .from(contentPosts)
    .leftJoin(clubs, eq(contentPosts.clubId, clubs.id))
    .where(and(eq(contentPosts.slug, slug), publishedOnly))
    .limit(1);
}

/** /stories და sitemap-ისთვის — მხოლოდ slug-იანი (გასაზიარებელი) პოსტები */
export async function listContentSlugs() {
  const rows = await db
    .select({ slug: contentPosts.slug, updatedAt: contentPosts.createdAt })
    .from(contentPosts)
    .where(and(publishedOnly, sql`${contentPosts.slug} IS NOT NULL`));
  return rows.filter((row): row is { slug: string; updatedAt: Date } =>
    Boolean(row.slug),
  );
}
