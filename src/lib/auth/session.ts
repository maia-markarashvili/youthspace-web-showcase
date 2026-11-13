import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { serverEnv } from "@/lib/env";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import {
  type AdminRole,
  homeForRole,
  normalizeRole,
} from "@/lib/auth/roles";

/**
 * Admin სესია — jose JWT httpOnly cookie-ში (PRD ფაზა 2, Next auth guide).
 *
 * ორი შრე:
 *  · proxy.ts — ოპტიმისტური შემოწმება (მხოლოდ cookie-ის არსებობა/ვადა/როლი)
 *  · loadAdmin() (DAL) — ყოველი გვერდი/action ამას ეყრდნობა (defense in depth)
 *
 * როლი და დეაქტივაცია **ბაზიდან** მოწმდება ყოველ მოთხოვნაზე (React cache-ით
 * ერთხელ) და არა მხოლოდ JWT-დან — წინააღმდეგ შემთხვევაში როლის ცვლილება
 * ან ანგარიშის დეაქტივაცია 7 დღემდე გადაიდებოდა (ტოკენის ვადის ბოლომდე).
 */

const COOKIE_NAME = "admin_session";
const SESSION_DAYS = 7;

/** JWT-ის ტვირთი — `ver` პაროლის შეცვლის/დეაქტივაციის დროს იზრდება
 *  (token_version), ამიტომ ძველი ტოკენები მყისვე კვდება */
export type SessionPayload = {
  adminId: string;
  email: string;
  role: AdminRole;
  ver: number;
};

/** loadAdmin()-ის შედეგი — ყოველთვის ბაზიდან დადასტურებული, ცოცხალი მონაცემი */
export type AdminSession = {
  adminId: string;
  email: string;
  role: AdminRole;
};

function secretKey() {
  const { SESSION_SECRET } = serverEnv();
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET აუცილებელია admin პანელისთვის (.env.local)");
  }
  return new TextEncoder().encode(SESSION_SECRET);
}

export async function encryptSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function decryptSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * ერთი PK-SELECT მოთხოვნაზე (React cache) — cookie-ს ვადასთან ერთად
 * ბაზიდან ცოცხლად ამოწმებს isActive/tokenVersion/role-ს. `null` ნიშნავს:
 * cookie არ არის, გაყალბებულია, ანგარიში დეაქტივირებულია, ან პაროლი
 * შეიცვალა/ტოკენი გაუქმდა ცოცხალი სესიის დროს.
 */
const loadAdmin = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies();
  const payload = await decryptSession(cookieStore.get(COOKIE_NAME)?.value);
  if (!payload) return null;

  const [row] = await db
    .select({
      email: adminUsers.email,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      tokenVersion: adminUsers.tokenVersion,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, payload.adminId))
    .limit(1);

  if (!row || !row.isActive || row.tokenVersion !== payload.ver) return null;

  return {
    adminId: payload.adminId,
    email: row.email,
    role: normalizeRole(row.role),
  };
});

/** `/admin/login`-ისთვის - სესია არ არსებობს → null, redirect/throw არაფერზე
 *  (თავად login-გვერდი წყვეტს, გვერდის ჩვენება თუ დაშბორდზე გადაყვანა) */
export async function getSession(): Promise<AdminSession | null> {
  return loadAdmin();
}

/** გვერდებისთვის: სესია არ არის → login; როლი არასაკმარისია → საკუთარი მთავარი */
export async function verifyRole(
  ...allowed: AdminRole[]
): Promise<AdminSession> {
  const admin = await loadAdmin();
  if (!admin) redirect("/admin/login");
  if (!allowed.includes(admin.role)) redirect(homeForRole(admin.role));
  return admin;
}

/** Server Action-ებისთვის — redirect-ის ნაცვლად შეცდომა (fetch-კონტექსტი) */
export async function requireRole(
  ...allowed: AdminRole[]
): Promise<AdminSession> {
  const admin = await loadAdmin();
  if (!admin) throw new Error("ავტორიზაცია საჭიროა");
  if (!allowed.includes(admin.role)) {
    throw new Error("ამ მოქმედებისთვის საკმარისი უფლება არ გაქვს");
  }
  return admin;
}

/* ── შაქარი — რეალურ კოდში მხოლოდ ესენი გამოიყენება ─────────────
   ⚠ გამიზნულად არ არსებობს „ნებისმიერი შესული ადმინი"-ის ვარიანტი:
   ყოველი ახალი გვერდი/action ცალსახად აცხადებს, ვისთვისაა. */
export const verifyOwner = () => verifyRole("admin");
export const requireOwner = () => requireRole("admin");
export const verifyStaff = () => verifyRole("admin", "reception");
export const requireStaff = () => requireRole("admin", "reception");

export { COOKIE_NAME as SESSION_COOKIE_NAME };
