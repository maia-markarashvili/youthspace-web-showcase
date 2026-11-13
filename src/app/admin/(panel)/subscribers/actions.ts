"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";

/** გამომწერის ჩართვა/გამორთვა */
export async function toggleSubscriber(id: string, _formData: FormData) {
  await requireOwner();
  const [row] = await db
    .select({ isActive: subscribers.isActive })
    .from(subscribers)
    .where(eq(subscribers.id, id));
  if (!row) return;
  await db
    .update(subscribers)
    .set({ isActive: !row.isActive })
    .where(eq(subscribers.id, id));
  revalidatePath("/admin/subscribers");
}

/** გამომწერის წაშლა */
export async function deleteSubscriber(id: string, _formData: FormData) {
  await requireOwner();
  await db.delete(subscribers).where(eq(subscribers.id, id));
  revalidatePath("/admin/subscribers");
}
