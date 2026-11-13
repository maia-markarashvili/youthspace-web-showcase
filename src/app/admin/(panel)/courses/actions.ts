"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import type { LandingContent } from "@/lib/landing";
import { toTetri } from "@/lib/money";
import { MAX_PLAN_MONTHS, MIN_PLAN_MONTHS } from "@/lib/pricing";
import type { CourseClubDiscount } from "@/lib/pricing";

/**
 * კურსების admin Server Actions (CRUD).
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი — სქემები/ჰელფერები ლოკალურია.
 * ლენდინგ-ველები: ცარიელი მნიშვნელობა landing jsonb-ში არ იწერება,
 * რომ resolveCourseLanding-ის ავტო-default იმუშაოს.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** ფასი ლარებში (ფორმიდან) → რიცხვი; ბაზაში toTetri()-თ გადადის */
const gelInput = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .transform((value, ctx) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      ctx.addIssue({ code: "custom", message: "მიუთითეთ არაუარყოფითი რიცხვი" });
      return z.NEVER;
    }
    return parsed;
  });

/** სააქციო ფასი: ცარიელი → null (აქცია არ არის), სხვაგვარად ლარები */
const saleGelInput = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      ctx.addIssue({ code: "custom", message: "მიუთითეთ არაუარყოფითი რიცხვი" });
      return z.NEVER;
    }
    return parsed;
  });

/** ცარიელი → null; სხვაგვარად მთელი დადებითი რიცხვი */
const capacityInput = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      ctx.addIssue({ code: "custom", message: "მიუთითეთ მთელი დადებითი რიცხვი" });
      return z.NEVER;
    }
    return parsed;
  });

/** განვადების თვეები: ცარიელი → null; სხვაგვარად მთელი 2-36 */
const monthsInput = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const parsed = Number(value);
    if (
      !Number.isInteger(parsed) ||
      parsed < MIN_PLAN_MONTHS ||
      parsed > MAX_PLAN_MONTHS
    ) {
      ctx.addIssue({
        code: "custom",
        message: `მიუთითეთ ${MIN_PLAN_MONTHS}-${MAX_PLAN_MONTHS} თვე`,
      });
      return z.NEVER;
    }
    return parsed;
  });

/**
 * ClubDiscountsField — ერთი hidden input, JSON: [{clubId, percent}].
 * უვარგისი რიგი (არა-uuid, პროცენტი 1-100-ის გარეთ, დუბლიკატი) მდუმარედ
 * ვარდება — იგივე ფილოსოფია, რაც galleryInput-ს.
 */
const clubDiscountsInput = z
  .string()
  .transform((raw): CourseClubDiscount[] => {
    try {
      const parsed: unknown = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) return [];
      const seen = new Set<string>();
      return parsed.flatMap((item) => {
        if (typeof item !== "object" || item === null) return [];
        const row = item as { clubId?: unknown; percent?: unknown };
        const clubId = typeof row.clubId === "string" ? row.clubId : "";
        const percent = Number(row.percent);
        if (!UUID_RE.test(clubId) || seen.has(clubId)) return [];
        if (!Number.isInteger(percent) || percent <= 0 || percent > 100) {
          return [];
        }
        seen.add(clubId);
        return [{ clubId, percent }];
      });
    } catch {
      return [];
    }
  });

/** GalleryField აგზავნის JSON მასივს ერთი hidden input-ით */
const galleryInput = z.string().transform((raw): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
});

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

const courseSchema = z.object({
  title: z.string().trim().min(2, REQUIRED).max(200),
  slug: z
    .string()
    .trim()
    .min(2, REQUIRED)
    .max(120)
    .regex(
      /^[a-z0-9-]+$/,
      "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი",
    ),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  category: z.string().trim().max(120).optional().or(z.literal("")),
  lecturer: z.string().trim().max(160).optional().or(z.literal("")),
  scheduleText: z.string().trim().max(400).optional().or(z.literal("")),
  coverImage: z.string().trim().max(1000).optional().or(z.literal("")),
  gallery: galleryInput,
  capacity: capacityInput,
  priceRegular: gelInput,
  salePrice: saleGelInput,
  /* განვადება — ორივე ერთად ივსება/იცლება (იხ. courseSchemaChecked) */
  monthlyPrice: saleGelInput,
  monthlyMonths: monthsInput,
  clubDiscounts: clubDiscountsInput,
  /* კურსის ვადები — ცარიელი = ლიმიტი არ მოქმედებს */
  startDate: optionalDate,
  endDate: optionalDate,
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
  program: listInput.transform((rows) =>
    rows.map((row) => ({ title: row.title ?? "", text: row.text ?? "" })),
  ),
  faq: listInput.transform((rows) =>
    rows.map((row) => ({ q: row.q ?? "", a: row.a ?? "" })),
  ),
  ctaLabel: optionalText(120),
  ctaMicrocopy: optionalText(300),
  crossSell: optionalText(500),
  lecturerPhoto: optionalText(1000),
  lecturerBio: optionalText(2000),
  meetingsCount: optionalText(60),
  seoTitle: optionalText(200),
  seoDescription: optionalText(500),
  seoImage: optionalText(1000),
});

/**
 * განვადების წესები ერთ ადგილას, რომ ბაზაში ურთიერთგამომრიცხავი
 * მდგომარეობა ვერ ჩავარდეს: ორივე ველი ერთად ივსება, უფასო კურსზე არ
 * მოქმედებს და **ჯამი ერთიან ფასზე ნაკლები ვერ იქნება** - თვიური ხომ
 * დეფოლტად აირჩევა, ასე კი ყველა იაფ გზას აირჩევდა და დანარჩენ თვეებს
 * ხელით ვდევნიდით. ტოლობა დაშვებულია.
 */
const courseSchemaChecked = courseSchema.superRefine((data, ctx) => {
  const { monthlyPrice, monthlyMonths } = data;
  if (monthlyPrice === null && monthlyMonths === null) return;

  if (monthlyPrice === null) {
    ctx.addIssue({
      code: "custom",
      path: ["monthlyPrice"],
      message: "შეავსე თვიური ფასი ან მოხსენი განვადების მოსანიშნი",
    });
    return;
  }
  if (monthlyMonths === null) {
    ctx.addIssue({
      code: "custom",
      path: ["monthlyMonths"],
      message: "მიუთითე თვეების რაოდენობა ან მოხსენი განვადების მოსანიშნი",
    });
    return;
  }
  if (monthlyPrice <= 0) {
    ctx.addIssue({
      code: "custom",
      path: ["monthlyPrice"],
      message: "თვიური ფასი 0-ზე მეტი უნდა იყოს",
    });
    return;
  }

  const fullGel = data.salePrice ?? data.priceRegular;
  if (fullGel <= 0) {
    ctx.addIssue({
      code: "custom",
      path: ["monthlyPrice"],
      message: "უფასო კურსზე განვადება არ მოქმედებს",
    });
    return;
  }
  /* შედარება თეთრებში — ლარის float-ებს დამრგვალება არ ენდობა */
  if (toTetri(monthlyPrice) * monthlyMonths < toTetri(fullGel)) {
    ctx.addIssue({
      code: "custom",
      path: ["monthlyPrice"],
      message: `განვადების ჯამი (${monthlyMonths} × ${monthlyPrice} ₾) ერთიან ფასზე (${fullGel} ₾) ნაკლებია - შეამოწმე ციფრები`,
    });
  }
});

/* ── შექმნა/რედაქტირება (hidden "id": "" = ახალი) ─────────────── */

export async function upsertCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const id = String(formData.get("id") ?? "").trim();
  if (id && !UUID_RE.test(id)) {
    return { status: "error", message: "კურსი ვერ მოიძებნა." };
  }

  const parsed = courseSchemaChecked.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    category: formData.get("category"),
    lecturer: formData.get("lecturer"),
    scheduleText: formData.get("scheduleText"),
    coverImage: formData.get("coverImage"),
    gallery: formData.get("gallery"),
    capacity: formData.get("capacity"),
    priceRegular: formData.get("priceRegular"),
    salePrice: String(formData.get("salePrice") ?? ""),
    /* ⚠ `?? ""` კრიტიკულია: მოხსნილ მოსანიშნზე ეს გასაღებები საერთოდ
       არ მოდის და ველი null-ზე უნდა ჩამოვიდეს */
    monthlyPrice: String(formData.get("monthlyPrice") ?? ""),
    monthlyMonths: String(formData.get("monthlyMonths") ?? ""),
    clubDiscounts: String(formData.get("clubDiscounts") ?? "[]"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
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
    faq: String(formData.get("faq") ?? "[]"),
    ctaLabel: formData.get("ctaLabel"),
    ctaMicrocopy: formData.get("ctaMicrocopy"),
    crossSell: formData.get("crossSell"),
    lecturerPhoto: formData.get("lecturerPhoto"),
    lecturerBio: formData.get("lecturerBio"),
    meetingsCount: formData.get("meetingsCount"),
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
  if (data.faq.length > 0) landing.faq = data.faq;
  if (data.ctaLabel) landing.ctaLabel = data.ctaLabel;
  if (data.ctaMicrocopy) landing.ctaMicrocopy = data.ctaMicrocopy;
  if (data.crossSell) landing.crossSell = data.crossSell;
  if (data.lecturerPhoto) landing.lecturerPhoto = data.lecturerPhoto;
  if (data.lecturerBio) landing.lecturerBio = data.lecturerBio;
  if (data.meetingsCount) landing.meetingsCount = data.meetingsCount;
  if (data.seoTitle) landing.seoTitle = data.seoTitle;
  if (data.seoDescription) landing.seoDescription = data.seoDescription;
  if (data.seoImage) landing.seoImage = data.seoImage;

  const values = {
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    category: data.category || null,
    lecturer: data.lecturer || null,
    scheduleText: data.scheduleText || null,
    coverImage: data.coverImage || null,
    gallery: data.gallery,
    capacity: data.capacity,
    priceRegular: toTetri(data.priceRegular),
    salePrice: data.salePrice === null ? null : toTetri(data.salePrice),
    monthlyPrice:
      data.monthlyPrice === null ? null : toTetri(data.monthlyPrice),
    monthlyMonths: data.monthlyMonths,
    clubDiscounts: data.clubDiscounts,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    landing,
    isActive: Boolean(formData.get("isActive")),
    registrationClosed: Boolean(formData.get("registrationClosed")),
  };

  try {
    if (id) {
      const updated = await db
        .update(courses)
        .set(values)
        .where(eq(courses.id, id))
        .returning({ id: courses.id });
      if (updated.length === 0) {
        return { status: "error", message: "კურსი ვერ მოიძებნა." };
      }
    } else {
      await db.insert(courses).values(values);
    }
  } catch (error) {
    console.error("[admin/courses] შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - შეამოწმე slug უნიკალურია.",
    };
  }

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

/* ── სიის ინლაინ მოქმედებები (bind-სტილი) ─────────────────────── */

export async function deleteCourse(id: string, _formData: FormData) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;
  await db.delete(courses).where(eq(courses.id, id));
  revalidatePath("/admin/courses");
}

export async function toggleCourseActive(id: string, _formData: FormData) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;
  await db
    .update(courses)
    .set({ isActive: sql`not ${courses.isActive}` })
    .where(eq(courses.id, id));
  revalidatePath("/admin/courses");
}
