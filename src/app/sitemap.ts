import type { MetadataRoute } from "next";
import { listClubs, listCourses } from "@/lib/db/queries/catalog";
import { listContentSlugs } from "@/lib/db/queries/content";
import { QUIZZES } from "@/lib/quizzes";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/clubs",
    "/courses",
    "/membership",
    "/drop-in",
    "/spaces",
    "/stories",
    "/tests",
    "/about",
    "/contact",
    "/partner",
    "/terms",
    "/privacy",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  const [clubs, courses, posts] = await Promise.all([
    listClubs(),
    listCourses(),
    listContentSlugs(),
  ]);

  return [
    ...staticRoutes,
    ...clubs.map((club) => ({
      url: `${base}/clubs/${club.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...courses.map((course) => ({
      url: `${base}/courses/${course.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${base}/stories/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...QUIZZES.map((quiz) => ({
      url: `${base}/tests/${quiz.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
