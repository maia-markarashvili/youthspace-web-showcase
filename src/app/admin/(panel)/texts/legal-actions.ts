"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { legalVersions } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";

/**
 * იურიდიული დოკუმენტების PDF-ვერსიები (წესები/კონფიდენციალურობა) —
 * ტექსტების ადმინის ქვედა ბლოკი. ⚠ მხოლოდ async ფუნქციების ექსპორტი.
 * წაშლა ფაილს /uploads/-იდან არ შლის (ატვირთული ფაილები არასდროს იშლება) —
 * მხოლოდ ჩანაწერი ქრება სიიდან.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const addSchema = z.object({
  kind: z.enum(["terms", "privacy"]),
  fileUrl: z.string().trim().max(300),
  effectiveFrom: z.string().regex(DATE_RE, "აირჩიე თარიღი"),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

function publicPathFor(kind: "terms" | "privacy"): string {
  return kind === "terms" ? "/terms" : "/privacy";
}

export async function addLegalVersion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = addSchema.safeParse({
    kind: formData.get("kind"),
    fileUrl: String(formData.get("fileUrl") ?? ""),
    effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }
  /* ატვირთვა მხოლოდ ჩვენივე uploadDocument-ით (/uploads/<uuid>.pdf) */
  if (!parsed.data.fileUrl.startsWith("/uploads/")) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: { fileUrl: "ატვირთე PDF ღილაკით" },
    };
  }

  try {
    await db.insert(legalVersions).values({
      kind: parsed.data.kind,
      fileUrl: parsed.data.fileUrl,
      effectiveFrom: parsed.data.effectiveFrom,
    });
  } catch (error) {
    console.error("[legal] ვერსიის დამატება ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidatePath("/admin/texts");
  revalidatePath(publicPathFor(parsed.data.kind));
  return { status: "success", message: "ვერსია დაემატა" };
}

export async function deleteLegalVersion(
  id: string,
  _formData: FormData,
): Promise<void> {
  await requireOwner();
  if (!z.uuid().safeParse(id).success) return;

  const [removed] = await db
    .delete(legalVersions)
    .where(eq(legalVersions.id, id))
    .returning({ kind: legalVersions.kind });

  revalidatePath("/admin/texts");
  if (removed?.kind === "terms" || removed?.kind === "privacy") {
    revalidatePath(publicPathFor(removed.kind));
  }
}
