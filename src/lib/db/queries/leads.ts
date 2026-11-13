import "server-only";
import { db } from "@/lib/db";
import { leads, subscribers } from "@/lib/db/schema";

export async function createLead(input: {
  type: "contact" | "b2b_partner" | "registration";
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  const [row] = await db
    .insert(leads)
    .values({
      type: input.type,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      message: input.message ?? null,
      payload: input.payload ?? null,
    })
    .returning({ id: leads.id });
  return row;
}

/** ნიუსლეთერი (§5.10) — გამეორებული ელფოსტა შეცდომა არაა */
export async function upsertSubscriber(email: string, source: string) {
  const [row] = await db
    .insert(subscribers)
    .values({ email: email.toLowerCase(), source })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: { isActive: true },
    })
    .returning({ id: subscribers.id });
  return row;
}
