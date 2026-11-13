"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CONTENT_TYPES, contentPosts } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { extractYouTubeId } from "@/lib/youtube";

/**
 * კონტენტის ჩანაწერების (ამბები/ნამუშევრები) admin actions.
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი — სხვა ექსპორტი ფორმებს ამტვრევს.
 */

const REQUIRED = "ეს ველი აუცილებელია";

const contentSchema = z
  .object({
    type: z.enum(CONTENT_TYPES, { message: "აირჩიეთ ტიპი" }),
    title: z.string().trim().min(2, REQUIRED).max(200),
    slug: z.string().trim().max(120).optional().or(z.literal("")),
    body: z.string().trim().max(20000).optional().or(z.literal("")),
    authorName: z.string().trim().max(120).optional().or(z.literal("")),
    collectionSlug: z.string().trim().max(120).optional().or(z.literal("")),
    clubId: z.uuid({ message: "არასწორი კლუბი" }).optional().or(z.literal("")),
    youtubeUrl: z.string().trim().max(300).optional().or(z.literal("")),
    fileUrl: z.string().trim().max(300).optional().or(z.literal("")),
    /* GalleryField აგზავნის JSON მასივს ერთ string-ად */
    media: z.string().transform((value): string[] => {
      try {
        const parsed: unknown = JSON.parse(value || "[]");
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : [];
      } catch {
        return [];
      }
    }),
    /* ListField აგზავნის {label,href} წყვილების JSON მასივს ერთ string-ად */
    relatedLinks: z.string().transform((value): { label: string; href: string }[] => {
      try {
        const parsed: unknown = JSON.parse(value || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((row) => {
            const record = row as { label?: unknown; href?: unknown };
            return {
              label: typeof record?.label === "string" ? record.label.trim() : "",
              href: typeof record?.href === "string" ? record.href.trim() : "",
            };
          })
          .filter(
            (row) => row.label.length > 0 && /^(https?:\/\/|\/)/.test(row.href),
          )
          .slice(0, 6);
      } catch {
        return [];
      }
    }),
    publishedAt: z.string().trim().max(20).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.type === "work_video" && !extractYouTubeId(data.youtubeUrl ?? "")) {
      ctx.addIssue({
        code: "custom",
        path: ["youtubeUrl"],
        message: "ჩასვი სწორი YouTube ბმული",
      });
    }
    if (data.fileUrl && !data.fileUrl.startsWith("/uploads/")) {
      ctx.addIssue({
        code: "custom",
        path: ["fileUrl"],
        message: "ატვირთე ფაილი ღილაკით",
      });
    }
  });

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/* ── შექმნა/რედაქტირება (hidden "id": "" = ახალი) ─────────────── */
export async function upsertContentPost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = contentSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    body: formData.get("body") ?? "",
    authorName: formData.get("authorName") ?? "",
    collectionSlug: formData.get("collectionSlug") ?? "",
    clubId: formData.get("clubId") ?? "",
    youtubeUrl: formData.get("youtubeUrl") ?? "",
    fileUrl: formData.get("fileUrl") ?? "",
    media: formData.get("media") ?? "[]",
    relatedLinks: formData.get("relatedLinks") ?? "[]",
    publishedAt: formData.get("publishedAt") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const id = String(formData.get("id") ?? "");
  const values = {
    type: parsed.data.type,
    title: parsed.data.title,
    slug: parsed.data.slug || null,
    body: parsed.data.body || null,
    authorName: parsed.data.authorName || null,
    /* ტიპისთვის შეუსაბამო ველები null-დება — ტიპის შეცვლისას ძველი არ რჩება */
    collectionSlug:
      parsed.data.type === "news" ? null : parsed.data.collectionSlug || null,
    clubId: parsed.data.clubId || null,
    youtubeUrl:
      parsed.data.type === "work_video" ? parsed.data.youtubeUrl || null : null,
    fileUrl:
      parsed.data.type === "work_research" ? parsed.data.fileUrl || null : null,
    media: parsed.data.media,
    relatedLinks:
      parsed.data.relatedLinks.length > 0 ? parsed.data.relatedLinks : null,
    isFeatured: Boolean(formData.get("isFeatured")),
    publishedAt: parsed.data.publishedAt
      ? new Date(parsed.data.publishedAt)
      : null,
    isActive: Boolean(formData.get("isActive")),
  };

  try {
    if (id) {
      await db.update(contentPosts).set(values).where(eq(contentPosts.id, id));
    } else {
      await db.insert(contentPosts).values(values);
    }
  } catch (error) {
    console.error("[admin/content] შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - შეამოწმე slug უნიკალურია.",
    };
  }

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

/* ── წაშლა (bind-ით: form action={deleteContentPost.bind(null, id)}) ─ */
export async function deleteContentPost(id: string, _formData: FormData) {
  await requireOwner();
  await db.delete(contentPosts).where(eq(contentPosts.id, id));
  revalidatePath("/admin/content");
}

/* ── ჩართვა/გამორთვა ──────────────────────────────────────────── */
export async function toggleContentActive(id: string, _formData: FormData) {
  await requireOwner();
  const [post] = await db
    .select({ isActive: contentPosts.isActive })
    .from(contentPosts)
    .where(eq(contentPosts.id, id));
  if (!post) return;
  await db
    .update(contentPosts)
    .set({ isActive: !post.isActive })
    .where(eq(contentPosts.id, id));
  revalidatePath("/admin/content");
}
