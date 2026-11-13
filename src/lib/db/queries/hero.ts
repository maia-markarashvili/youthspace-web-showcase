import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { heroSlides } from "@/lib/db/schema";

/** აქტიური ჰერო-სლაიდები რიგითობით — მთავარი გვერდის სლაიდერისთვის.
 *  React cache: generateMetadata (og:image = პირველი სლაიდი) და გვერდი
 *  ერთსავე მოთხოვნას იზიარებენ — ერთი SELECT/req. */
export const listHeroSlides = cache(() => {
  return db
    .select()
    .from(heroSlides)
    .where(eq(heroSlides.isActive, true))
    .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt));
});
