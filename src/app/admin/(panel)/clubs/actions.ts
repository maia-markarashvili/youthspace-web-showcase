"use server";

import { eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { clubs } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import type { LandingContent } from "@/lib/landing";

/**
 * კლუბების CRUD Server Actions (admin).
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი — სქემა/ჰელფერები არ ექსპორტდება.
 * billingPeriod ფორმაში არ ჩანს — რჩება default „monthly“.
 * ლენდინგ-ველები (ჰერო/ფაქტები/benefits/…): ცარიელი მნიშვნელობა landing
 * jsonb-ში საერთოდ არ იწერება, რომ resolveClubLanding-ის default იმუშაოს.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_NUMBER = "მიუთითეთ რიცხვი";

/** ტექსტური ლენდინგ-ველი — ცარიელიც დასაშვებია */
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

/** სეზონის თარიღი — ცარიელი დასაშვებია, სხვაგვარად YYYY-MM-DD */
const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "მიუთითეთ სწორი თარიღი")
  .optional()
  .or(z.literal(""));

/**
 * ListField აგზავნის მთელ სიას ერთი hidden input-ის JSON-ად.
 * ვინახავთ მხოლოდ რიგებს, სადაც ერთი ველი მაინც არაცარიელია (trim-ის შემდეგ).
 */
const listInput = z.string().transform((raw): Record<string, string>[] => {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
      .map((item) => {
        const row: Record<string, string> = {};
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === "string") row[key] = value.trim();
        }
        return row;
      })
      .filter((row) => Object.values(row).some((value) => value !== ""));
  } catch {
    return [];
  }
});

const clubSchema = z.object({
  title: z.string({ error: REQUIRED }).trim().min(2, REQUIRED).max(200),
  slug: z
    .string({ error: REQUIRED })
    .trim()
    .min(2, REQUIRED)
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "მხოლოდ ლათინური პატარა ასოები, ციფრები და დეფისი",
    ),
  ageRange: optionalText(60),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  audience: z.string().trim().max(4000).optional().or(z.literal("")),
  format: optionalText(2000),
  finalProduct: optionalText(2000),
  coverImage: optionalText(1000),
  /* GalleryField აგზავნის JSON მასივს string-ად */
  gallery: z.string().transform((raw): string[] => {
    try {
      const parsed: unknown = JSON.parse(raw || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }),
  meetingDay: optionalText(60),
  meetingTime: optionalText(60),
  /* სეზონის ფარგლები — ცარიელი = ლიმიტი არ მოქმედებს */
  startDate: optionalDate,
  endDate: optionalDate,
  maxCapacity: z.coerce
    .number({ error: INVALID_NUMBER })
    .int(INVALID_NUMBER)
    .min(1, INVALID_NUMBER)
    .optional(),
  sortOrder: z.coerce
    .number({ error: INVALID_NUMBER })
    .int(INVALID_NUMBER)
    .default(0),
  /* ── landing (jsonb) ველები ── */
  heroDescription: optionalText(400),
  scheduleBadge: optionalText(120),
  fact1Title: optionalText(120),
  fact1Text: optionalText(200),
  fact2Title: optionalText(120),
  fact2Text: optionalText(200),
  fact3Title: optionalText(120),
  fact3Text: optionalText(200),
  fact4Title: optionalText(120),
  fact4Text: optionalText(200),
  benefits: listInput.transform((rows): string[] =>
    rows.map((row) => row.text ?? "").filter((text) => text !== ""),
  ),
  /* შესავალი პროგრამის წინ — ჰეროს 160-სიმბოლოიანი ჭრის ალტერნატივა */
  programIntro: optionalText(4000),
  program: listInput.transform((rows) =>
    rows.map((row) => ({ title: row.title ?? "", text: row.text ?? "" })),
  ),
  /* ⚠ `faq` აღარ იკითხება — კლუბებს FAQ-სექცია მოეხსნათ (2026-08-18).
     `landing` მთლიანად გადაიწერება, ე.ი. ძველი faq შემდეგ შენახვაზე ქრება. */
  ctaLabel: optionalText(120),
  ctaMicrocopy: optionalText(300),
  cycleCard: optionalText(2000),
  cycleStoryId: optionalText(64),
  seoTitle: optionalText(200),
  seoDescription: optionalText(500),
  seoImage: optionalText(1000),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** ცარიელი სტრიქონი → undefined, რომ number-ველებმა სწორი შეცდომა დააბრუნონ */
function numeric(value: FormDataEntryValue | null): string | undefined {
  const raw = String(value ?? "").trim();
  return raw === "" ? undefined : raw;
}

/* ── შექმნა/განახლება (hidden „id": "" = ახალი) ───────────────── */
export async function upsertClub(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = clubSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    ageRange: formData.get("ageRange"),
    description: formData.get("description"),
    audience: formData.get("audience"),
    format: formData.get("format"),
    finalProduct: formData.get("finalProduct"),
    coverImage: formData.get("coverImage"),
    gallery: String(formData.get("gallery") ?? "[]"),
    meetingDay: formData.get("meetingDay"),
    meetingTime: formData.get("meetingTime"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    maxCapacity: numeric(formData.get("maxCapacity")),
    sortOrder: numeric(formData.get("sortOrder")),
    heroDescription: formData.get("heroDescription"),
    scheduleBadge: formData.get("scheduleBadge"),
    fact1Title: formData.get("fact1Title"),
    fact1Text: formData.get("fact1Text"),
    fact2Title: formData.get("fact2Title"),
    fact2Text: formData.get("fact2Text"),
    fact3Title: formData.get("fact3Title"),
    fact3Text: formData.get("fact3Text"),
    fact4Title: formData.get("fact4Title"),
    fact4Text: formData.get("fact4Text"),
    benefits: String(formData.get("benefits") ?? "[]"),
    program: String(formData.get("program") ?? "[]"),
    programIntro: formData.get("programIntro"),
    ctaLabel: formData.get("ctaLabel"),
    ctaMicrocopy: formData.get("ctaMicrocopy"),
    cycleCard: formData.get("cycleCard"),
    cycleStoryId: formData.get("cycleStoryId"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    seoImage: formData.get("seoImage"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const id = String(formData.get("id") ?? "").trim();
  const data = parsed.data;

  /* ფაქტები — რჩება მხოლოდ წყვილი, სადაც ორივე ველია შევსებული */
  const facts = (
    [
      [data.fact1Title, data.fact1Text],
      [data.fact2Title, data.fact2Text],
      [data.fact3Title, data.fact3Text],
      [data.fact4Title, data.fact4Text],
    ] as const
  ).flatMap(([title, text]) => (title && text ? [{ title, text }] : []));

  /* ცარიელი ველი ობიექტში არ იწერება — რენდერზე ავტო-default ჩაენაცვლება.
     showSeats/askAge ყოველთვის იწერება: false-იც ცხადი არჩევანია. */
  const landing: LandingContent = {
    showSeats: Boolean(formData.get("showSeats")),
    askAge: Boolean(formData.get("askAge")),
  };
  if (data.heroDescription) landing.heroDescription = data.heroDescription;
  if (data.scheduleBadge) landing.scheduleBadge = data.scheduleBadge;
  if (facts.length > 0) landing.facts = facts;
  if (data.benefits.length > 0) landing.benefits = data.benefits;
  if (data.program.length > 0) landing.program = data.program;
  if (data.programIntro) landing.programIntro = data.programIntro;
  if (data.ctaLabel) landing.ctaLabel = data.ctaLabel;
  if (data.ctaMicrocopy) landing.ctaMicrocopy = data.ctaMicrocopy;
  if (data.cycleCard) landing.cycleCard = data.cycleCard;
  if (data.cycleStoryId) landing.cycleStoryId = data.cycleStoryId;
  if (data.seoTitle) landing.seoTitle = data.seoTitle;
  if (data.seoDescription) landing.seoDescription = data.seoDescription;
  if (data.seoImage) landing.seoImage = data.seoImage;

  const values = {
    title: data.title,
    slug: data.slug,
    ageRange: data.ageRange || null,
    description: data.description || null,
    audience: data.audience || null,
    format: data.format || null,
    finalProduct: data.finalProduct || null,
    coverImage: data.coverImage || null,
    gallery: data.gallery,
    meetingDay: data.meetingDay || null,
    meetingTime: data.meetingTime || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    maxCapacity: data.maxCapacity ?? null,
    landing,
    sortOrder: data.sortOrder,
    isActive: Boolean(formData.get("isActive")),
    registrationClosed: Boolean(formData.get("registrationClosed")),
  };

  try {
    if (id) {
      await db.update(clubs).set(values).where(eq(clubs.id, id));
    } else {
      /* ფასის ველი აქ არ არსებობს — კლუბის ერთიანი ფასი /admin/pricing-შია */
      await db.insert(clubs).values(values);
    }
  } catch (error) {
    console.error("[clubs] შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - შეამოწმე slug უნიკალურია.",
    };
  }

  revalidatePath("/admin/clubs");
  /* redirect ისვრის — try/catch-ის გარეთ უნდა იყოს */
  redirect("/admin/clubs");
}

/* ── წაშლა (bind: deleteClub.bind(null, id)) ──────────────────── */
export async function deleteClub(id: string, _formData: FormData) {
  await requireOwner();
  try {
    await db.delete(clubs).where(eq(clubs.id, id));
  } catch (error) {
    /* FK-დამოკიდებულება (მაგ. content_posts.club_id) — არ ვამტვრევთ გვერდს */
    console.error("[clubs] წაშლა ჩავარდა", error);
  }
  revalidatePath("/admin/clubs");
}

/* ── ჩართვა/გამორთვა (bind: toggleClubActive.bind(null, id)) ──── */
export async function toggleClubActive(id: string, _formData: FormData) {
  await requireOwner();
  await db
    .update(clubs)
    .set({ isActive: not(clubs.isActive) })
    .where(eq(clubs.id, id));
  revalidatePath("/admin/clubs");
}
