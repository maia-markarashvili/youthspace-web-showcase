import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { serverEnv } from "@/lib/env";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";

/**
 * მომხმარებლის (customer) სესია — admin session.ts-ის სტრუქტურული სარკე,
 * მისგან **სრულად დამოუკიდებელი**: ცალკე cookie (`member_session`), ცალკე
 * ცხრილი (accounts), ცალკე DAL. ადმინის შესვლა მომხმარებლის სესიას არ ეხება
 * და პირიქით.
 *
 * მდგომარეობები:
 *  · cookie არ არის / გაყალბებულია / ver არ ემთხვევა / disabled → null
 *  · status='pending' — რეგისტრირებულია, კოდი ჯერ არ დაუდასტურებია;
 *    verifyAccount() ასეთს /verify-ზე აგდებს, requireAccount() კი უშლის
 *  · status='active' — სრულფასოვანი ანგარიში
 */

const COOKIE_NAME = "member_session";
const SESSION_DAYS = 30;

/** JWT-ის ტვირთი — `ver` პაროლის შეცვლისას იზრდება და ძველი ტოკენი კვდება */
export type AccountSessionPayload = {
  accountId: string;
  ver: number;
};

/** loadAccount()-ის შედეგი — ყოველთვის ბაზიდან დადასტურებული, ცოცხალი მონაცემი */
export type CustomerAccount = {
  accountId: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: "pending" | "active";
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  /** false = Google-ით შესული, პაროლი არ აქვს */
  hasPassword: boolean;
};

function secretKey() {
  const { SESSION_SECRET } = serverEnv();
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET აუცილებელია ანგარიშებისთვის (.env.local)");
  }
  return new TextEncoder().encode(SESSION_SECRET);
}

async function encryptAccountSession(payload: AccountSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

async function decryptAccountSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<AccountSessionPayload>(
      token,
      secretKey(),
      { algorithms: ["HS256"] },
    );
    if (typeof payload.accountId !== "string" || typeof payload.ver !== "number") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function createAccountSession(payload: AccountSessionPayload) {
  const token = await encryptAccountSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteAccountSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * ერთი PK-SELECT მოთხოვნაზე (React cache) — cookie-ს ვადასთან ერთად ბაზიდან
 * ცოცხლად ამოწმებს status/tokenVersion-ს. `null` ნიშნავს: cookie არ არის,
 * გაყალბებულია, ანგარიში disabled-ია, ან პაროლი შეიცვალა/ტოკენი გაუქმდა.
 */
const loadAccount = cache(async (): Promise<CustomerAccount | null> => {
  const cookieStore = await cookies();
  const payload = await decryptAccountSession(
    cookieStore.get(COOKIE_NAME)?.value,
  );
  if (!payload) return null;

  const [row] = await db
    .select({
      email: accounts.email,
      fullName: accounts.fullName,
      phone: accounts.phone,
      status: accounts.status,
      emailVerifiedAt: accounts.emailVerifiedAt,
      phoneVerifiedAt: accounts.phoneVerifiedAt,
      passwordHash: accounts.passwordHash,
      tokenVersion: accounts.tokenVersion,
    })
    .from(accounts)
    .where(eq(accounts.id, payload.accountId))
    .limit(1);

  if (!row || row.status === "disabled" || row.tokenVersion !== payload.ver) {
    return null;
  }

  return {
    accountId: payload.accountId,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    status: row.status === "active" ? "active" : "pending",
    emailVerifiedAt: row.emailVerifiedAt,
    phoneVerifiedAt: row.phoneVerifiedAt,
    hasPassword: row.passwordHash !== null,
  };
});

/** login/register/verify გვერდებისთვის — null-იც ვალიდური პასუხია */
export async function getAccount(): Promise<CustomerAccount | null> {
  return loadAccount();
}

/** დაცული გვერდებისთვის: სესია არ არის → /login; pending → /verify */
export async function verifyAccount(): Promise<CustomerAccount> {
  const account = await loadAccount();
  if (!account) redirect("/login");
  if (account.status !== "active") redirect("/verify");
  return account;
}

/** Server Action-ებისთვის — redirect-ის ნაცვლად შეცდომა (fetch-კონტექსტი) */
export async function requireAccount(): Promise<CustomerAccount> {
  const account = await loadAccount();
  if (!account || account.status !== "active") {
    throw new Error("ავტორიზაცია საჭიროა");
  }
  return account;
}

export { COOKIE_NAME as ACCOUNT_COOKIE_NAME };
