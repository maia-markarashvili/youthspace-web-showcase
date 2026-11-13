"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";

/** ლიდის სტატუსის შეცვლა — სიის ღილაკებიდან bind(null, id, status)-ით */
export async function setLeadStatus(
  id: string,
  status: string,
  _formData: FormData,
) {
  await requireOwner();
  if (status !== "new" && status !== "done") return;
  await db.update(leads).set({ status }).where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}

/** ლიდის წაშლა */
export async function deleteLead(id: string, _formData: FormData) {
  await requireOwner();
  await db.delete(leads).where(eq(leads.id, id));
  revalidatePath("/admin/leads");
}
