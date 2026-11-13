"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dropinSettings } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { toTetri } from "@/lib/money";

/**
 * Drop-in კონფიგი — singleton (id=1): upsert onConflictDoUpdate-ით,
 * redirect არ გვჭირდება — იგივე გვერდი რჩება.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

const dropinSchema = z
  .object({
    price: z.coerce.number().positive("მიუთითეთ ფასი ლარებში").max(100000),
    dailyCap: z.coerce
      .number()
      .int("მთელი რიცხვი")
      .positive("მიუთითეთ დღიური ლიმიტი")
      .max(10000),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    openingHour: z.coerce.number().int("მთელი რიცხვი").min(0).max(23),
    closingHour: z.coerce.number().int("მთელი რიცხვი").min(1).max(24),
    bookingStartDate: z
      .string()
      .regex(DATE_RE, "აირჩიე თარიღი")
      .optional()
      .or(z.literal("")),
    bookingWindowDays: z.coerce
      .number()
      .int("მთელი რიცხვი")
      .min(1, "მინიმუმ 1 დღე")
      .max(60, "მაქსიმუმ 60 დღე"),
  })
  .refine((data) => data.closingHour > data.openingHour, {
    message: "დახურვის საათი გახსნისაზე გვიან უნდა იყოს",
    path: ["closingHour"],
  });

export async function saveDropin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = dropinSchema.safeParse({
    price: formData.get("price"),
    dailyCap: formData.get("dailyCap"),
    description: formData.get("description"),
    openingHour: formData.get("openingHour"),
    closingHour: formData.get("closingHour"),
    bookingStartDate: String(formData.get("bookingStartDate") ?? ""),
    bookingWindowDays: formData.get("bookingWindowDays"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const values = {
    price: toTetri(parsed.data.price),
    dailyCap: parsed.data.dailyCap,
    description: parsed.data.description || null,
    openingHour: parsed.data.openingHour,
    closingHour: parsed.data.closingHour,
    bookingStartDate: parsed.data.bookingStartDate || null,
    bookingWindowDays: parsed.data.bookingWindowDays,
    updatedAt: new Date(),
  };

  try {
    await db
      .insert(dropinSettings)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: dropinSettings.id, set: values });
  } catch (error) {
    console.error("[dropin] შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidatePath("/admin/dropin");
  revalidatePath("/drop-in");
  return { status: "success", message: "შენახულია" };
}
