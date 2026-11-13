import "server-only";
import { lt } from "drizzle-orm";
import type { AdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { adminAuditLog } from "@/lib/db/schema";
import { clientIp } from "@/lib/rate-limit";

/**
 * ადმინის აუდიტის ჟურნალის ერთადერთი მწერი (§3.4) — ვინ, როდის, რა.
 * ⚠ `detail`-ში არასდროს ჩაწეროთ ნედლი ტელეფონი/მეილი - თორემ ჟურნალი
 * თავად გახდება ის მონაცემთა ბაზა, რომლისგანაც ვიცავთ.
 *
 * არასდროს throw-ობს — notify-customer.ts-ის იგივე დისციპლინა: აუდიტის
 * ჩავარდნამ არ უნდა ჩაშალოს ის მოქმედება, რომელსაც აღრიცხავს.
 */
export async function logAudit(entry: {
  session: AdminSession;
  action: string;
  targetType?: "subscription" | "booking" | "pass" | "admin_user";
  targetId?: string;
  targetRef?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    /* ჟურნალში სანდო IP უნდა ეწეროს, თორემ კვალი გაყალბებადია — იხ. clientIp() */
    const ip = (await clientIp()) || null;

    await db.insert(adminAuditLog).values({
      adminId: entry.session.adminId,
      adminEmail: entry.session.email,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      targetRef: entry.targetRef ?? null,
      detail: entry.detail ?? null,
      ip,
    });

    /* lazy prune — cron არ გვაქვს; 2%-იანი შანსით ვასუფთავებთ 180 დღეზე
       ძველ ჩანაწერებს, ჩაწერისთანავე (ამ ფაილში დაწესებული პრაქტიკა
       phone_verifications-ისთვისაც გამოსადეგია მომავალში) */
    if (Math.random() < 0.02) {
      await db
        .delete(adminAuditLog)
        .where(
          lt(adminAuditLog.createdAt, new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)),
        );
    }
  } catch (error) {
    console.error("[audit] ჩაწერა ჩავარდა", error);
  }
}
