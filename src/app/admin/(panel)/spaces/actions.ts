"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, not } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { spaces } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";

/**
 * სივრცეების (spaces) admin CRUD Server Actions — ღონისძიების ერთიან
 * მოდელში (2026-08-30) ეს სექცია მხოლოდ გვერდის კონტენტს მართავს:
 * ფასები „ფასების" გვერდზეა, ხელმისაწვდომობა კალენდრის დროშებში.
 * legacy სვეტებს (price*, bookingMode და სხვ.) ფორმა აღარ წერს - DB
 * default-ები ფარავს.
 * ⚠ ამ ფაილიდან მხოლოდ async ფუნქციები ექსპორტდება — სქემა/კონსტანტები შიგნით რჩება.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_NUMBER = "მიუთითეთ მთელი რიცხვი";

/** number input → რიცხვი; ცარიელი → undefined (required/default-ისთვის) */
function numberInput(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? "").trim();
  return raw === "" ? undefined : Number(raw);
}

/** zod-ის issue-ები → პირველი შეცდომა თითო ველზე (app/actions.ts-ის სტილით) */
function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

const spaceSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(2, REQUIRED).max(160),
    slug: z
      .string()
      .trim()
      .min(2, REQUIRED)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "მხოლოდ ლათინური პატარა ასოები, ციფრები და დეფისი"),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    coverImage: z.string().trim().optional().or(z.literal("")),
    /** GalleryField აგზავნის JSON მასივს string-ად */
    gallery: z.string().transform((value) => {
      try {
        const parsed: unknown = JSON.parse(value || "[]");
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : [];
      } catch {
        return [];
      }
    }),
    /** textarea — თითო ნივთი ახალ ხაზზე */
    inventory: z.string().transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
    capacity: z.number(INVALID_NUMBER).int(INVALID_NUMBER).min(1, "მინიმუმ 1").optional(),
    sortOrder: z.number(INVALID_NUMBER).int(INVALID_NUMBER).default(0),
  });

/* ── შექმნა/რედაქტირება (hidden id: ცარიელი → insert) ─────────── */

export async function upsertSpace(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = spaceSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    coverImage: formData.get("coverImage") ?? "",
    gallery: String(formData.get("gallery") ?? "[]"),
    inventory: String(formData.get("inventory") ?? ""),
    capacity: numberInput(formData.get("capacity")),
    sortOrder: numberInput(formData.get("sortOrder")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const values = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    description: parsed.data.description || null,
    coverImage: parsed.data.coverImage || null,
    gallery: parsed.data.gallery,
    inventory: parsed.data.inventory,
    capacity: parsed.data.capacity ?? null,
    sortOrder: parsed.data.sortOrder,
    isActive: Boolean(formData.get("isActive")),
  };

  const spaceId = parsed.data.id || null;

  try {
    if (spaceId) {
      const updated = await db
        .update(spaces)
        .set(values)
        .where(eq(spaces.id, spaceId))
        .returning({ id: spaces.id });
      if (updated.length === 0) {
        return { status: "error", message: "ჩანაწერი ვერ მოიძებნა." };
      }
    } else {
      await db.insert(spaces).values(values);
    }
  } catch (error) {
    console.error("[spaces] შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - შეამოწმე slug უნიკალურია.",
    };
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

/* ── სიის ინლაინ მოქმედებები (bind-ით id) ─────────────────────── */

export async function deleteSpace(id: string, _formData: FormData) {
  await requireOwner();
  await db.delete(spaces).where(eq(spaces.id, id));
  revalidatePath("/admin/spaces");
}

export async function toggleSpaceActive(id: string, _formData: FormData) {
  await requireOwner();
  await db
    .update(spaces)
    .set({ isActive: not(spaces.isActive) })
    .where(eq(spaces.id, id));
  revalidatePath("/admin/spaces");
}
