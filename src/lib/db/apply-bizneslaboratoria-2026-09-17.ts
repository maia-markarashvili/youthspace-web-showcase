/**
 * ერთჯერადი სკრიპტი (2026-09-17): „ბიზნესლაბორატორია“ ორ ცალკე კურსად იყოფა,
 * რადგან მესამე ნაკადი უკვე დამოუკიდებელი კურსია (`businesslaboratory-3`).
 *
 *  · `bizneslaboratoria` (ძველი URL რჩება) → პირველი ნაკადი: ლიტერატურული
 *    კონკურსი „წიგნიდან დაწყებული ამბავი“, 22 მარტი - 2 მაისი, 2026.
 *  · `bizneslaboratoria-2` → მეორე ნაკადი: დებატების ჩემპიონატი, მაისი - ივნისი.
 *    არ არსებობს → იქმნება; არსებობს → მხოლოდ ტექსტები ახლდება.
 *
 * ორივე ჩანაწერის წყარო ერთია - COURSE_ARCHIVE_2026 (seed-იც იქიდან იკითხება).
 *
 * ⚠ სკრიპტი არ ეხება: coverImage, gallery, priceRegular/salePrice,
 *   clubDiscounts, capacity, isActive - ანუ ადმინიდან ატვირთული სურათები და
 *   ხელით შეტანილი ცვლილებები ადგილზე რჩება. coverImage მხოლოდ მაშინ იწერება,
 *   როცა `bizneslaboratoria-2` პირველად იქმნება.
 * ⚠ ჩაწერამდე ორივე რიგის მიმდინარე მდგომარეობა JSON-ფაილში ინახება.
 *
 * გაშვება (Neon):  npx tsx src/lib/db/apply-bizneslaboratoria-2026-09-17.ts
 *   ლოკალურ PGlite-ზე:  DATABASE_URL=pglite:./.pglite/data npx tsx src/lib/db/apply-bizneslaboratoria-2026-09-17.ts
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { writeFileSync } from "node:fs";
import { eq, inArray } from "drizzle-orm";
import { closeDb, createDb } from "./connect";
import { COURSE_ARCHIVE_2026 } from "./course-archive-2026-data";
import type { LandingContent } from "../landing";
import { courses } from "./schema";

const db = createDb({ maxConnections: 1 });

const SLUG_FIRST = "bizneslaboratoria";
const SLUG_SECOND = "bizneslaboratoria-2";

function archiveCourse(slug: string) {
  const course = COURSE_ARCHIVE_2026.find((item) => item.slug === slug);
  if (!course) throw new Error(`course-archive-2026-data.ts-ში ${slug} არ არის`);
  return course;
}

async function main() {
  console.log("ბიზნესლაბორატორია → ორი ნაკადი\n");

  await db.transaction(async (tx) => {
    /* სარეზერვო ასლი ტრანზაქციის შიგნით (rollback-ზეც ფაილში რჩება) */
    const backup = await tx
      .select()
      .from(courses)
      .where(inArray(courses.slug, [SLUG_FIRST, SLUG_SECOND]));
    const backupPath = `bizneslaboratoria-backup-${Date.now()}.json`;
    writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`  ✓ სარეზერვო ასლი: ${backupPath} (${backup.length} კურსი)\n`);

    /* 1 · პირველი ნაკადი — არსებულ რიგზე მხოლოდ ტექსტები და ვადები */
    const first = archiveCourse(SLUG_FIRST);
    const [currentFirst] = await tx
      .select({ landing: courses.landing })
      .from(courses)
      .where(eq(courses.slug, SLUG_FIRST));

    if (!currentFirst) {
      throw new Error(
        `ბაზაში ${SLUG_FIRST} არ მოიძებნა - სკრიპტი არსებული რიგის განახლებას ელოდება`,
      );
    }

    /* ძველი landing-ის უცნობი ველები (seoImage, ctaLabel და ა.შ.) რჩება */
    const mergedFirst: LandingContent = {
      ...(currentFirst.landing ?? {}),
      ...first.landing,
    };

    await tx
      .update(courses)
      .set({
        title: first.title,
        description: first.description,
        category: first.category,
        scheduleText: first.scheduleText,
        startDate: first.startDate,
        endDate: first.endDate,
        landing: mergedFirst,
      })
      .where(eq(courses.slug, SLUG_FIRST));
    console.log(
      `  ✓ ${SLUG_FIRST}: „${first.title}“ · ${first.scheduleText} · ` +
        `program ${first.landing.program?.length ?? 0} პუნქტი`,
    );

    /* 2 · მეორე ნაკადი — ახალი რიგი ან ტექსტების განახლება */
    const second = archiveCourse(SLUG_SECOND);
    const [currentSecond] = await tx
      .select({ landing: courses.landing })
      .from(courses)
      .where(eq(courses.slug, SLUG_SECOND));

    if (currentSecond) {
      const mergedSecond: LandingContent = {
        ...(currentSecond.landing ?? {}),
        ...second.landing,
      };
      await tx
        .update(courses)
        .set({
          title: second.title,
          description: second.description,
          category: second.category,
          scheduleText: second.scheduleText,
          startDate: second.startDate,
          endDate: second.endDate,
          landing: mergedSecond,
        })
        .where(eq(courses.slug, SLUG_SECOND));
      console.log(`  ✓ ${SLUG_SECOND}: არსებული რიგი განახლდა (სურათი უცვლელი)`);
    } else {
      await tx.insert(courses).values(second);
      console.log(
        `  ✓ ${SLUG_SECOND}: შეიქმნა · ${second.scheduleText} · ` +
          `ბანერი ${second.coverImage}`,
      );
    }
  });

  console.log("\n✓ დასრულდა.");
  await closeDb(db);
}

main().catch(async (error) => {
  console.error("✗ ჩავარდა:", error);
  await closeDb(db);
  process.exit(1);
});
