import "server-only";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { visits } from "@/lib/db/schema";
import { tbilisiDayStart } from "@/lib/calendar";

/**
 * ვიზიტების (მოსვლის ჟურნალის) ჩამწერი ფენა — desk-ის „მიღება" ღილაკის
 * ერთადერთი გზა. ვიზიტი ფაქტობრივი კვალია: პასის შესვლების ხარჯვას,
 * გადახდის სტატუსებს და ადგილების თვლას **არ** ეხება.
 */

export type VisitKind = "booking" | "pass" | "subscription";

export type VisitTarget = { kind: VisitKind; id: string };

function targetColumn(kind: VisitKind) {
  return kind === "booking"
    ? visits.bookingId
    : kind === "pass"
      ? visits.passId
      : visits.subscriptionId;
}

/** დღევანდელი (თბილისით) ბოლო ვიზიტი ამ სამიზნეზე — ორმაგი მიღების ბადე */
export async function findTodayVisit(
  target: VisitTarget,
): Promise<{ createdAt: Date; adminEmail: string } | null> {
  const [row] = await db
    .select({ createdAt: visits.createdAt, adminEmail: visits.adminEmail })
    .from(visits)
    .where(
      and(
        eq(targetColumn(target.kind), target.id),
        gte(visits.createdAt, tbilisiDayStart()),
      ),
    )
    .orderBy(desc(visits.createdAt))
    .limit(1);
  return row ?? null;
}

export async function recordVisit(params: {
  target: VisitTarget;
  adminId: string;
  adminEmail: string;
  method: "qr" | "manual";
}): Promise<void> {
  await db.insert(visits).values({
    bookingId: params.target.kind === "booking" ? params.target.id : null,
    passId: params.target.kind === "pass" ? params.target.id : null,
    subscriptionId:
      params.target.kind === "subscription" ? params.target.id : null,
    adminId: params.adminId,
    adminEmail: params.adminEmail,
    method: params.method,
  });
}

/** აქვს თუ არა ჩანაწერს ვიზიტების კვალი — შეკვეთის წაშლის guard-ისთვის
 *  (FK-ები წაშლას ისედაც დაბლოკავდა, მაგრამ გაუგებარი შეცდომით) */
export async function hasVisitRecord(target: VisitTarget): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(visits)
    .where(eq(targetColumn(target.kind), target.id));
  return (row?.n ?? 0) > 0;
}
