import "server-only";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clubs, contentPosts, courses } from "@/lib/db/schema";

/**
 * საიტის ძებნა — მარტივი ilike ყველა საჯარო კონტენტზე: კლუბები, კურსები,
 * ამბები/ნამუშევრები. ქართულს დიდი/პატარა ასოები არ აქვს, ilike ლათინურ
 * სათაურებს/სლაგებს ფარავს. (სივრცე ერთი გვერდია — ძებნაში აღარ ჩანს.)
 */

const RESULT_LIMIT = 20;
/* პოსტები ცალკე ლიმიტით — მარტო ლიტკონკურსის ტექსტები 23-ია */
const POSTS_RESULT_LIMIT = 40;

export type SearchResults = {
  clubs: Awaited<ReturnType<typeof searchClubs>>;
  courses: Awaited<ReturnType<typeof searchCourses>>;
  posts: Awaited<ReturnType<typeof searchPosts>>;
};

/** LIKE-ის სპეცსიმბოლოების ეკრანირება — query ტექსტად რჩება */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}

function searchClubs(pattern: string) {
  return db
    .select()
    .from(clubs)
    .where(
      and(
        eq(clubs.isActive, true),
        or(ilike(clubs.title, pattern), ilike(clubs.description, pattern)),
      ),
    )
    .limit(RESULT_LIMIT);
}

function searchCourses(pattern: string) {
  return db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.isActive, true),
        or(ilike(courses.title, pattern), ilike(courses.description, pattern)),
      ),
    )
    .limit(RESULT_LIMIT);
}

function searchPosts(pattern: string) {
  return db
    .select({
      id: contentPosts.id,
      type: contentPosts.type,
      slug: contentPosts.slug,
      title: contentPosts.title,
      body: contentPosts.body,
      authorName: contentPosts.authorName,
      media: contentPosts.media,
      publishedAt: contentPosts.publishedAt,
      clubTitle: clubs.title,
      clubSlug: clubs.slug,
    })
    .from(contentPosts)
    .leftJoin(clubs, eq(contentPosts.clubId, clubs.id))
    .where(
      and(
        eq(contentPosts.isActive, true),
        sql`(${contentPosts.publishedAt} IS NULL OR ${contentPosts.publishedAt} <= now())`,
        or(
          ilike(contentPosts.title, pattern),
          ilike(contentPosts.body, pattern),
          ilike(contentPosts.authorName, pattern),
        ),
      ),
    )
    .limit(POSTS_RESULT_LIMIT);
}

export async function searchSite(qRaw: string): Promise<SearchResults> {
  const q = qRaw.trim().slice(0, 100);
  /* <2 სიმბოლოზე ძებნა არ ეშვება — გვერდი მინიშნებას აჩვენებს */
  if (q.length < 2) {
    return { clubs: [], courses: [], posts: [] };
  }

  const pattern = likePattern(q);
  const [clubRows, courseRows, postRows] = await Promise.all([
    searchClubs(pattern),
    searchCourses(pattern),
    searchPosts(pattern),
  ]);

  return {
    clubs: clubRows,
    courses: courseRows,
    posts: postRows,
  };
}
