/**
 * ერთჯერადი სკრიპტი (2026-09-18): კურსს „ბიზნესლაბორატორია - 3“
 * (`businesslaboratory-3`) სრული ტექსტი ეწერება - წყარო მფლობელის ფაილი
 * „ბიზნესლაბორატორია 3 - საიტის სრული ტექსტი.md“.
 *
 * იწერება: description (სრული აღწერა), heroDescription, facts, benefits,
 * program (12 კვირა, სამი ეტაპი), faq (9 კითხვა ფაილიდან + 2 პრაქტიკული),
 * ctaLabel, seoTitle/seoDescription.
 *
 * ⚠ არ ეხება: ფასს (priceRegular/salePrice), clubDiscounts, coverImage,
 *   gallery, scheduleText, startDate/endDate, capacity, isActive - ანუ ყველაფერს,
 *   რაც მფლობელმა ადმინში უკვე შეავსო.
 *
 * გაშვება (Neon):  npx tsx src/lib/db/apply-bizneslaboratoria-3-2026-09-18.ts
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { closeDb, createDb } from "./connect";
import type { LandingContent } from "../landing";
import { courses } from "./schema";
import {
  BIZLAB3_DESCRIPTION as DESCRIPTION,
  BIZLAB3_LANDING as LANDING,
} from "./bizneslaboratoria-3-data";

const db = createDb({ maxConnections: 1 });

const SLUG = "businesslaboratory-3";

async function main() {
  console.log("ბიზნესლაბორატორია - 3 → სრული ტექსტი\n");

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ description: courses.description, landing: courses.landing })
      .from(courses)
      .where(eq(courses.slug, SLUG));

    if (!current) {
      throw new Error(
        `ბაზაში ${SLUG} არ მოიძებნა - კურსი ჯერ ადმინიდან უნდა შეიქმნას`,
      );
    }

    /* სარეზერვო ასლი ჩაწერამდე */
    const backupPath = `bizneslaboratoria-3-backup-${Date.now()}.json`;
    writeFileSync(backupPath, JSON.stringify(current, null, 2));
    console.log(`  ✓ სარეზერვო ასლი: ${backupPath}\n`);

    /* landing-ის დანარჩენი ველები (seoImage, scheduleBadge, askAge…) რჩება */
    const merged: LandingContent = { ...(current.landing ?? {}), ...LANDING };

    await tx
      .update(courses)
      .set({ description: DESCRIPTION, landing: merged })
      .where(eq(courses.slug, SLUG));

    console.log(
      `  ✓ ${SLUG}: აღწერა ${DESCRIPTION.length} სიმბოლო · ` +
        `facts ${LANDING.facts?.length} · benefits ${LANDING.benefits?.length} · ` +
        `program ${LANDING.program?.length} · faq ${LANDING.faq?.length}`,
    );
  });

  console.log("\n✓ დასრულდა.");
  await closeDb(db);
}

main().catch(async (error) => {
  console.error("✗ ჩავარდა:", error);
  await closeDb(db);
  process.exit(1);
});
