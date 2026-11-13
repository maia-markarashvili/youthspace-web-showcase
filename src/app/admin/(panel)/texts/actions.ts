"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { siteTexts } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { TEXT_GROUPS } from "@/lib/site-texts";

/**
 * საიტის ტექსტების admin actions — site_texts მხოლოდ override-ებს ინახავს:
 * default-ის ტოლი ან ცარიელი მნიშვნელობა რიგს შლის (= default-ზე დაბრუნება).
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი — სხვა ექსპორტი ფორმებს ამტვრევს.
 */

/* ── ჯგუფის შენახვა (singleton-სტილი, redirect არ გვჭირდება) ───── */
export async function saveTexts(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const slug = String(formData.get("group") ?? "");
  const group = TEXT_GROUPS.find((item) => item.slug === slug);
  if (!group) {
    return { status: "error", message: "უცნობი ჯგუფი - განაახლეთ გვერდი." };
  }

  try {
    for (const entry of group.entries) {
      /* textarea ბრაუზერიდან \r\n-ით მოდის, default-ები კი \n-ითაა —
         ნორმალიზაციის გარეშე უცვლელი ტექსტიც override-ად ინახებოდა
         („default-ის ტოლი → წაშლა" ვერ მუშაობდა) და default-ის მომავალი
         ცვლილებები (მაგ. {qrUrl}) ჩუმად იფარებოდა */
      const value = String(formData.get(entry.key) ?? "").replace(
        /\r\n/g,
        "\n",
      );
      /*
       * ორი განსხვავებული „ცარიელი":
       *  · default-ის ტოლი მნიშვნელობა → რიგის წაშლა (= default-ზე დაბრუნება);
       *  · ცარიელი ველი disablable ჩანაწერზე → ცარიელი **ინახება** ბაზაში,
       *    რადგან t()-ს ის უნდა დაუბრუნდეს და შეტყობინება არ გაიგზავნოს
       *    (წაშლისას default-ი ბრუნდებოდა და SMS მაინც იგზავნებოდა);
       *  · ცარიელი ველი ჩვეულებრივ ტექსტზე → წაშლა, როგორც აქამდე.
       */
      if (value === entry.default) {
        await db.delete(siteTexts).where(eq(siteTexts.key, entry.key));
      } else if (value === "" && !entry.disablable) {
        await db.delete(siteTexts).where(eq(siteTexts.key, entry.key));
      } else {
        await db
          .insert(siteTexts)
          .values({ key: entry.key, value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: siteTexts.key,
            set: { value, updatedAt: new Date() },
          });
      }
    }
  } catch (error) {
    console.error("[texts] შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidatePath("/admin/texts");
  return { status: "success", message: "შენახულია" };
}

/* ── ჯგუფის ყველა override-ის წაშლა → ისევ default-ები ჩანს ────── */
export async function resetGroup(
  slug: string,
  _formData: FormData,
): Promise<void> {
  await requireOwner();

  const group = TEXT_GROUPS.find((item) => item.slug === slug);
  if (!group || group.entries.length === 0) return;

  await db.delete(siteTexts).where(
    inArray(
      siteTexts.key,
      group.entries.map((entry) => entry.key),
    ),
  );

  revalidatePath("/admin/texts");
}
