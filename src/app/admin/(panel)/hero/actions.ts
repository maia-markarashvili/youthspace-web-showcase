"use server";

import { asc, eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { heroSlides } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";

/**
 * ჰერო-სლაიდერის CRUD Server Actions (admin).
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი — სქემა/ჰელფერები არ ექსპორტდება.
 * ცვლილება მთავარ გვერდზეც უნდა აისახოს — revalidatePath("/") ყველგან.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_NUMBER = "მიუთითეთ რიცხვი";

const slideSchema = z.object({
  eyebrow: z.string().trim().max(200).optional().or(z.literal("")),
  title: z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(300),
  sloganUnder: z.string().trim().max(300).optional().or(z.literal("")),
  body: z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(2000),
  image: z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(1000),
  imageAlt: z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(300),
  cta1Label: z.string().trim().max(120).optional().or(z.literal("")),
  cta1Href: z.string().trim().max(500).optional().or(z.literal("")),
  cta2Label: z.string().trim().max(120).optional().or(z.literal("")),
  cta2Href: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: z.coerce
    .number({ error: INVALID_NUMBER })
    .int(INVALID_NUMBER)
    .default(0),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** ცარიელი სტრიქონი → undefined, რომ number-ველმა სწორი შეცდომა დააბრუნოს */
function numeric(value: FormDataEntryValue | null): string | undefined {
  const raw = String(value ?? "").trim();
  return raw === "" ? undefined : raw;
}

/* ── შექმნა/განახლება (hidden „id": "" = ახალი) ───────────────── */
export async function upsertHeroSlide(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = slideSchema.safeParse({
    eyebrow: formData.get("eyebrow") ?? "",
    title: formData.get("title"),
    sloganUnder: formData.get("sloganUnder") ?? "",
    body: formData.get("body"),
    image: formData.get("image"),
    imageAlt: formData.get("imageAlt"),
    cta1Label: formData.get("cta1Label") ?? "",
    cta1Href: formData.get("cta1Href") ?? "",
    cta2Label: formData.get("cta2Label") ?? "",
    cta2Href: formData.get("cta2Href") ?? "",
    sortOrder: numeric(formData.get("sortOrder")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  /* სტატები 4 ფიქსირებული წყვილიდან — შედის მხოლოდ ის, სადაც ორივე შევსებულია */
  const stats: { value: string; label: string }[] = [];
  for (const index of [1, 2, 3, 4]) {
    const value = String(formData.get(`stat${index}Value`) ?? "").trim();
    const label = String(formData.get(`stat${index}Label`) ?? "").trim();
    if (value && label) stats.push({ value, label });
  }

  const id = String(formData.get("id") ?? "").trim();
  const data = parsed.data;
  const values = {
    eyebrow: data.eyebrow || null,
    title: data.title,
    sloganUnder: data.sloganUnder || null,
    body: data.body,
    image: data.image,
    imageAlt: data.imageAlt,
    cta1Label: data.cta1Label || null,
    cta1Href: data.cta1Href || null,
    cta2Label: data.cta2Label || null,
    cta2Href: data.cta2Href || null,
    stats,
    sortOrder: data.sortOrder,
    isActive: Boolean(formData.get("isActive")),
  };

  try {
    if (id) {
      await db.update(heroSlides).set(values).where(eq(heroSlides.id, id));
    } else {
      await db.insert(heroSlides).values(values);
    }
  } catch (error) {
    console.error("[admin/hero] შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ თავიდან.",
    };
  }

  revalidatePath("/admin/hero");
  revalidatePath("/");
  /* redirect ისვრის — try/catch-ის გარეთ უნდა იყოს */
  redirect("/admin/hero");
}

/* ── წაშლა (bind: deleteHeroSlide.bind(null, id)) ─────────────── */
export async function deleteHeroSlide(id: string, _formData: FormData) {
  await requireOwner();
  await db.delete(heroSlides).where(eq(heroSlides.id, id));
  revalidatePath("/admin/hero");
  revalidatePath("/");
}

/* ── ჩართვა/გამორთვა (bind: toggleHeroSlide.bind(null, id)) ───── */
export async function toggleHeroSlide(id: string, _formData: FormData) {
  await requireOwner();
  await db
    .update(heroSlides)
    .set({ isActive: not(heroSlides.isActive) })
    .where(eq(heroSlides.id, id));
  revalidatePath("/admin/hero");
  revalidatePath("/");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ── რიგითობის ↑/↓ (bind: moveHeroSlide.bind(null, id, "up"|"down")) ──
   ყველა default sortOrder=0-ია (ტოლდებიან), ამიტომ jer მიმდინარე ხედვის
   რიგით ხელახლა ვნომრავთ (0..n-1) და მერე მეზობელს ვუცვლით ადგილს - ასე
   ერთი დაჭერით რიგი ცხადად და მდგრადად იცვლება. */
export async function moveHeroSlide(
  id: string,
  direction: "up" | "down",
  _formData: FormData,
) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;

  const slides = await db
    .select({ id: heroSlides.id })
    .from(heroSlides)
    .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt));

  const index = slides.findIndex((slide) => slide.id === id);
  if (index === -1) return;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= slides.length) return; // კიდეზეა - არაფერი

  const reordered = [...slides];
  [reordered[index], reordered[target]] = [
    reordered[target],
    reordered[index],
  ];

  await db.transaction(async (tx) => {
    for (let position = 0; position < reordered.length; position++) {
      await tx
        .update(heroSlides)
        .set({ sortOrder: position })
        .where(eq(heroSlides.id, reordered[position].id));
    }
  });

  revalidatePath("/admin/hero");
  revalidatePath("/");
}
