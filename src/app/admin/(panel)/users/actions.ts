"use server";

import bcrypt from "bcryptjs";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ADMIN_ROLES, normalizeRole } from "@/lib/auth/roles";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/db/mutations/audit";
import { adminUsers } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";

/**
 * ადმინების მართვა — owner-only (§3.2). ორი დამცავი ყველგან მეორდება:
 *  · საკუთარი თავის დეაქტივაცია/დაქვეითება აკრძალულია (თავის ჩაკეტვისგან);
 *  · მინიმუმ ერთი აქტიური 'admin' უნდა დარჩეს ყოველთვის.
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function activeOwnerCount(excludeId?: string) {
  const [row] = await db
    .select({ n: count() })
    .from(adminUsers)
    .where(
      excludeId
        ? and(
            eq(adminUsers.role, "admin"),
            eq(adminUsers.isActive, true),
            ne(adminUsers.id, excludeId),
          )
        : and(eq(adminUsers.role, "admin"), eq(adminUsers.isActive, true)),
    );
  return row?.n ?? 0;
}

/* ── ახალი ადმინის შექმნა ─────────────────────────────────────── */

const createSchema = z.object({
  email: z.email("მიუთითეთ სწორი ელფოსტა"),
  password: z.string().min(10, "პაროლი მინიმუმ 10 სიმბოლო"),
  role: z.enum(ADMIN_ROLES),
});

export async function createAdminUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOwner();

  const parsed = createSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    const result: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      result[key] ??= issue.message;
    }
    return { status: "error", message: "შეამოწმეთ ველები.", errors: result };
  }

  const email = parsed.data.email.toLowerCase();
  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  if (existing) {
    return {
      status: "error",
      message: "ეს ელფოსტა უკვე დარეგისტრირებულია.",
      errors: { email: "დაკავებულია" },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const [created] = await db
    .insert(adminUsers)
    .values({ email, passwordHash, role: parsed.data.role })
    .returning({ id: adminUsers.id });

  await logAudit({
    session,
    action: "user.create",
    targetType: "admin_user",
    targetId: created?.id,
    detail: { role: parsed.data.role },
  });

  revalidatePath("/admin/users");
  return { status: "success", message: "ადმინი დაემატა." };
}

/* ── აქტივაცია/დეაქტივაცია ────────────────────────────────────── */

export async function setAdminActive(
  id: string,
  active: boolean,
  _formData: FormData,
): Promise<void> {
  const session = await requireOwner();
  if (!UUID_RE.test(id)) return;

  if (id === session.adminId) {
    /* საკუთარი თავის დეაქტივაცია/რეაქტივაცია აზრს მოკლებულია და
       შემთხვევით ჩაკეტვის რისკს ქმნის — ჩუმად გამოტოვება */
    return;
  }

  if (!active) {
    const [row] = await db
      .select({ role: adminUsers.role })
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);
    if (row && normalizeRole(row.role) === "admin") {
      const remaining = await activeOwnerCount(id);
      if (remaining < 1) return; // ბოლო აქტიური owner - არ დავუშვათ
    }
  }

  await db
    .update(adminUsers)
    .set(
      active
        ? { isActive: true }
        : {
            isActive: false,
            /* ცოცხალი სესია (სხვა მოწყობილობაზეც) მყისვე უქმდება */
            tokenVersion: sql`${adminUsers.tokenVersion} + 1`,
          },
    )
    .where(eq(adminUsers.id, id));

  await logAudit({
    session,
    action: active ? "user.activate" : "user.deactivate",
    targetType: "admin_user",
    targetId: id,
  });

  revalidatePath("/admin/users");
}

/* ── პაროლის განულება (owner სხვისთვის) ──────────────────────── */

const resetSchema = z.object({
  id: z.uuid(),
  newPassword: z.string().min(10, "პაროლი მინიმუმ 10 სიმბოლო"),
});

export async function resetAdminPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOwner();

  const parsed = resetSchema.safeParse({
    id: formData.get("id"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "შეამოწმე ველები.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const [updated] = await db
    .update(adminUsers)
    .set({ passwordHash, tokenVersion: sql`${adminUsers.tokenVersion} + 1` })
    .where(eq(adminUsers.id, parsed.data.id))
    .returning({ id: adminUsers.id });

  if (!updated) {
    return { status: "error", message: "ანგარიში ვერ მოიძებნა." };
  }

  await logAudit({
    session,
    action: "user.reset_password",
    targetType: "admin_user",
    targetId: parsed.data.id,
  });

  revalidatePath("/admin/users");
  return { status: "success", message: "პაროლი განულდა." };
}
