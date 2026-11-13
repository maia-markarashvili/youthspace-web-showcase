"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homeForRole, normalizeRole, safeAdminPath } from "@/lib/auth/roles";
import { createSession, deleteSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/** ⚠ "use server" ფაილიდან მხოლოდ async ფუნქციები ექსპორტირდება */

const loginSchema = z.object({
  email: z.email("მიუთითეთ სწორი ელფოსტა"),
  password: z.string().min(1, "ეს ველი აუცილებელია"),
});

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  /* ⚠ IP მხოლოდ clientIp()-იდან — თავისი ასლი აქ გაყალბებადი იყო
     (x-forwarded-for-ის პირველი რგოლი), ანუ ადმინის პაროლის გამოცნობას
     ლიმიტი ფაქტობრივად არ ედო. იხ. lib/rate-limit.ts-ის კომენტარი. */
  const ip = await clientIp();
  if (!checkRateLimit(`admin-login:${ip}`, { limit: 5 })) {
    return {
      status: "error",
      message: "ძალიან ბევრი მცდელობა - სცადეთ ერთ წუთში.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "შეავსეთ ელფოსტა და პაროლი." };
  }

  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, parsed.data.email.toLowerCase()))
    .limit(1);

  /* დროის მიხედვით user-enumeration-ის შესარბილებლად ჰეშს ყოველთვის ვადარებთ */
  const passwordOk = await bcrypt.compare(
    parsed.data.password,
    admin?.passwordHash ??
      "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva",
  );

  if (!admin || !passwordOk) {
    return { status: "error", message: "ელფოსტა ან პაროლი არასწორია." };
  }

  /* დეაქტივირებული ანგარიშის შემოწმება bcrypt-ის შემდეგ - რომ დეაქტივაციის
     სტატუსი დროით არ გაჟონოს (loginSchema-ს იგივე დისციპლინა, რაც
     user-enumeration-ის წინააღმდეგ ზემოთაა) */
  if (!admin.isActive) {
    return { status: "error", message: "ელფოსტა ან პაროლი არასწორია." };
  }

  const role = normalizeRole(admin.role);
  await createSession({
    adminId: admin.id,
    email: admin.email,
    role,
    ver: admin.tokenVersion,
  });
  /* QR-სკანიდან მოსული `next` — მხოლოდ მკაცრად გაფილტრული შიდა /admin-გზა
     (safeAdminPath), თორემ login open redirect-ად იქცეოდა */
  const next = safeAdminPath(formData.get("next"));
  redirect(next ?? homeForRole(role));
}

export async function logoutAction() {
  await deleteSession();
  redirect("/admin/login");
}
