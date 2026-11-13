"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { verifyUnsubscribeToken } from "@/lib/newsletter-token";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

/**
 * გამოწერის გაუქმება ხელმოწერილი ბმულით (სესია არ სჭირდება — ტოკენია
 * საშვი). ⚠ განზრახ POST-ია და არა გვერდის ჩატვირთვა: Gmail/Outlook
 * წერილის ბმულებს ავტომატურად „აწკაპუნებენ" (link scanner) და GET-ზე
 * გაუქმებისას გამომწერს ჩუმად ამოვშლიდით სიიდან.
 */
export async function confirmUnsubscribe(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!checkRateLimit(await clientKey("unsubscribe"), { limit: 10 })) {
    return { status: "error", message: "ბევრი მცდელობა - სცადე ცოტა ხანში" };
  }

  const token = formData.get("t");
  const id =
    typeof token === "string" ? await verifyUnsubscribeToken(token) : null;
  if (!id) {
    return {
      status: "error",
      message: "ბმული არასწორია - მოგვწერე info@youthspace.ge-ზე და ხელით წაგშლით",
    };
  }

  await db
    .update(subscribers)
    .set({ isActive: false })
    .where(eq(subscribers.id, id));

  return {
    status: "success",
    message: "გამოწერა გაუქმებულია - სიახლეებს აღარ მიიღებ",
  };
}
