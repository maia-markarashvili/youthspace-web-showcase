import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { legalVersions, type LegalVersion } from "@/lib/db/schema";

/**
 * იურიდიული დოკუმენტების PDF-ვერსიები (/terms, /privacy) — ტექსტის ქვემოთ
 * „მოქმედია {თარიღი}-დან" სია. ყველა ვერსია ჩანს (მფლობელის გადაწყვეტილება,
 * 2026-08-28) — ძველი მომხმარებელი თავის დროინდელ ვერსიას პოულობს.
 */

export type LegalKind = "terms" | "privacy";

export async function listLegalVersions(
  kind: LegalKind,
): Promise<LegalVersion[]> {
  return db
    .select()
    .from(legalVersions)
    .where(eq(legalVersions.kind, kind))
    .orderBy(desc(legalVersions.effectiveFrom), desc(legalVersions.createdAt));
}

/** "2026-09-01" → "01.09.2026" — „მოქმედია 01.09.2026-დან" ფორმატისთვის */
export function formatLegalDate(dateISO: string): string {
  return `${dateISO.slice(8, 10)}.${dateISO.slice(5, 7)}.${dateISO.slice(0, 4)}`;
}
