import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
import { todayTbilisi } from "@/lib/calendar";
import { db } from "@/lib/db";
import {
  clubs,
  courses,
  dropinSettings,
  spaces,
} from "@/lib/db/schema";

/* ── კლუბები (§5.1) ───────────────────────────────────────────── */

export function listClubs() {
  return db
    .select()
    .from(clubs)
    .where(eq(clubs.isActive, true))
    .orderBy(asc(clubs.sortOrder), asc(clubs.title));
}

/* cache(): generateMetadata + გვერდი ერთსავე სტრიქონს ერთხელ წამოიღებენ */
export const getClubBySlug = cache(async (slug: string) => {
  const [club] = await db
    .select()
    .from(clubs)
    .where(and(eq(clubs.slug, slug), eq(clubs.isActive, true)))
    .limit(1);
  return club ?? null;
});

/* ── კურსები (§5.2) ───────────────────────────────────────────── */

export type CourseFilter = {
  category?: string;
  maxPrice?: number;
  minPrice?: number;
};

export function listCourses(filter: CourseFilter = {}) {
  const conditions = [eq(courses.isActive, true)];

  if (filter.category) {
    conditions.push(eq(courses.category, filter.category));
  }
  if (typeof filter.minPrice === "number") {
    conditions.push(gte(courses.priceRegular, filter.minPrice));
  }
  if (typeof filter.maxPrice === "number") {
    conditions.push(lte(courses.priceRegular, filter.maxPrice));
  }

  return db
    .select()
    .from(courses)
    .where(and(...conditions))
    .orderBy(asc(courses.title));
}

export async function listCourseCategories() {
  const rows = await db
    .selectDistinct({ category: courses.category })
    .from(courses)
    .where(eq(courses.isActive, true));

  return rows
    .map((row) => row.category)
    .filter((category): category is string => Boolean(category))
    .sort((a, b) => a.localeCompare(b, "ka-GE"));
}

export const getCourseBySlug = cache(async (slug: string) => {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.isActive, true)))
    .limit(1);
  return course ?? null;
});

/* ── სივრცეები (§5.5) ─────────────────────────────────────────── */

export function listSpaces() {
  return db
    .select()
    .from(spaces)
    .where(eq(spaces.isActive, true))
    .orderBy(asc(spaces.sortOrder), asc(spaces.priceRegular));
}

export const getSpaceBySlug = cache(async (slug: string) => {
  const [space] = await db
    .select()
    .from(spaces)
    .where(and(eq(spaces.slug, slug), eq(spaces.isActive, true)))
    .limit(1);
  return space ?? null;
});

/* ── drop-in (§5.3) ───────────────────────────────────────────── */

export async function getDropinSettings() {
  const [settings] = await db
    .select()
    .from(dropinSettings)
    .where(eq(dropinSettings.id, 1))
    .limit(1);
  return settings ?? null;
}

/* ── მთავარი გვერდის featured (§4) ────────────────────────────── */

export function listFeaturedCourses(limit = 3) {
  /* დასრულებული (endDate ?? startDate < დღეს) მთავარ გვერდზე არ ჩანს */
  const endBoundary = sql`coalesce(${courses.endDate}, ${courses.startDate})`;
  return db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.isActive, true),
        or(
          sql`${endBoundary} IS NULL`,
          sql`${endBoundary} >= ${todayTbilisi()}`,
        ),
      ),
    )
    .orderBy(desc(courses.createdAt))
    .limit(limit);
}

/* ── უახლოესი უფასო ღონისძიება (ღია კარის დღე) ────────────────── */

/**
 * ქვიზის შედეგის „ჯერ ნახე, მერე გადაწყვიტე" ბარათისთვის: აქტიური, უფასო
 * (coalesce(sale, regular) = 0 — pricing.ts-ის courseIsFree-ს SQL-ვერსია) და
 * **ჯერ არდაწყებული** (start >= დღეს თბილისით; დღევანდელი ჯერ კიდევ ჩანს) კურსი,
 * უახლოესი პირველი. დაწყების თარიღით ვფილტრავთ და არა დასრულებით: მიმდინარე
 * მრავალდღიანი უფასო კურსი წარსული თარიღით „მოდი, ნახე"-ს არ გამოდგება.
 * თარიღის გარეშე უფასო კურსი „მომავალი ღონისძიება" არაა.
 * null = ბარათი არ ჩანს; შემდეგი ღია კარის დღე ადმინში ახალი უფასო კურსია -
 * კოდში არაფერი იცვლება.
 */
export async function getNextFreeEvent() {
  const today = todayTbilisi();
  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.isActive, true),
        /* დახურულ მიღებაზე ქვიზი ღია კარის დღეს არ შესთავაზებს */
        eq(courses.registrationClosed, false),
        isNotNull(courses.startDate),
        sql`coalesce(${courses.salePrice}, ${courses.priceRegular}) = 0`,
        gte(courses.startDate, today),
      ),
    )
    .orderBy(asc(courses.startDate))
    .limit(1);
  return course ?? null;
}
