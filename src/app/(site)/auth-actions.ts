"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAccountSession,
  deleteAccountSession,
  getAccount,
} from "@/lib/auth/account-session";
import {
  redeemAccountCode,
  sendAccountCode,
} from "@/lib/auth/account-verification";
import { db } from "@/lib/db";
import { accountProfiles, accounts } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { toGeorgianMsisdn } from "@/lib/phone";
import { checkRateLimit, clientIp, clientKey } from "@/lib/rate-limit";

/**
 * მომხმარებლის ანგარიშის ავტორიზაცია — რეგისტრაცია, შესვლა, კოდით
 * დადასტურება, პაროლის აღდგენა. ადმინის auth-actions.ts-ის იგივე
 * დისციპლინა: rate-limit ყველა საჯარო action-ზე, dummy-hash შედარება
 * user-enumeration-ის წინააღმდეგ, დეაქტივაციის სტატუსი bcrypt-ის შემდეგ.
 * ⚠ "use server" ფაილიდან მხოლოდ async ფუნქციები ექსპორტირდება.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const DUMMY_HASH =
  "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

const phoneInput = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .refine((value) => toGeorgianMsisdn(value) !== null, {
    message: "მიუთითე ქართული მობილურის ნომერი (5XX XX XX XX)",
  });

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "მიუთითე სახელი და გვარი"),
  email: z.email("მიუთითე სწორი ელფოსტა"),
  phone: phoneInput,
  password: z.string().min(8, "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს"),
});

export async function registerAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  /* honeypot — ბოტს „წარმატება" ვაჩვენებთ და არაფერს ვწერთ */
  if (formData.get("company_website")) {
    return { status: "success", message: "გმადლობთ!" };
  }
  if (!checkRateLimit(await clientKey("account-register"), { limit: 5 })) {
    return {
      status: "error",
      message: "ძალიან ბევრი მცდელობა - სცადე ერთ წუთში.",
    };
  }

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმე მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone;

  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);
  if (existing) {
    return {
      status: "error",
      errors: {
        email:
          "ამ ელფოსტით ანგარიში უკვე არსებობს - შედი ან აღადგინე პაროლი.",
      },
      message: "შეამოწმე მონიშნული ველები.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  let accountId: string;
  try {
    accountId = await db.transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({
          email,
          passwordHash,
          fullName: parsed.data.fullName,
          phone,
          status: "pending",
        })
        .returning({ id: accounts.id });
      if (!account) throw new Error("insert failed");

      /* self-პროფილი — ყიდვები ამ პროფილს მიება (M5) */
      await tx.insert(accountProfiles).values({
        accountId: account.id,
        fullName: parsed.data.fullName,
        phone,
        email,
        relationship: "self",
      });

      return account.id;
    });
  } catch (error) {
    /* unique-race: პარალელურმა მოთხოვნამ იგივე ელფოსტა დაასწრო */
    console.error("[account/register] ჩაწერა ჩავარდა", error);
    return {
      status: "error",
      message: "რეგისტრაცია ვერ მოხერხდა - სცადე ხელახლა.",
    };
  }

  /* ერთი კოდი, ერთი არხი: ჯერ მეილი, SMS მხოლოდ მისი ჩავარდნის fallback-ია
     (account-verification.ts) — ჩავარდნისას /verify-ზე ხელახლა გაგზავნა
     შეიძლება, ამიტომ აქ არ ვბლოკავთ */
  await sendAccountCode({
    accountId,
    purpose: "activate",
    email,
    phone,
    ip: await clientIp(),
  });

  await createAccountSession({ accountId, ver: 0 });
  redirect("/verify");
}

const loginSchema = z.object({
  email: z.email("მიუთითე სწორი ელფოსტა"),
  password: z.string().min(1, REQUIRED),
});

export async function loginAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!checkRateLimit(await clientKey("account-login"), { limit: 5 })) {
    return {
      status: "error",
      message: "ძალიან ბევრი მცდელობა - სცადე ერთ წუთში.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "შეავსე ელფოსტა და პაროლი." };
  }

  const [account] = await db
    .select({
      id: accounts.id,
      passwordHash: accounts.passwordHash,
      status: accounts.status,
      tokenVersion: accounts.tokenVersion,
    })
    .from(accounts)
    .where(eq(accounts.email, parsed.data.email.toLowerCase()))
    .limit(1);

  /* dummy-hash ყოველთვის ედრება — დროით user-enumeration არ გაჟონოს */
  const passwordOk = await bcrypt.compare(
    parsed.data.password,
    account?.passwordHash ?? DUMMY_HASH,
  );

  if (!account || !account.passwordHash || !passwordOk) {
    return { status: "error", message: "ელფოსტა ან პაროლი არასწორია." };
  }
  if (account.status === "disabled") {
    return { status: "error", message: "ელფოსტა ან პაროლი არასწორია." };
  }

  await createAccountSession({
    accountId: account.id,
    ver: account.tokenVersion,
  });
  redirect(account.status === "pending" ? "/verify" : "/account");
}

export async function logoutAccount() {
  await deleteAccountSession();
  redirect("/");
}

export async function verifyAccountCode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await getAccount();
  if (!account) {
    return { status: "error", message: "სესია ვერ მოიძებნა - შედი თავიდან." };
  }
  if (account.status === "active") redirect("/account");

  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return {
      status: "error",
      errors: { code: "შეიყვანე 6-ნიშნა კოდი" },
      message: "შეამოწმე კოდი.",
    };
  }

  const result = await redeemAccountCode({
    accountId: account.accountId,
    purpose: "activate",
    code,
  });

  if (result.status === "wrong") {
    return {
      status: "error",
      errors: { code: "კოდი არასწორია - სცადე ხელახლა." },
      message: "შეამოწმე კოდი.",
    };
  }
  if (result.status === "dead") {
    return {
      status: "error",
      message:
        "კოდი ვადაგასულია ან ცდები ამოიწურა - გამოითხოვე ახალი კოდი.",
    };
  }

  /* რომელი არხი დადასტურდა: ორივეზე გაგზავნილი კოდი მხოლოდ მეილს ამტკიცებს;
     ტელეფონი მხოლოდ მაშინ, თუ კოდი მარტო SMS-ით გავიდა (schema-ს კომენტარი) */
  const now = new Date();
  await db
    .update(accounts)
    .set({
      status: "active",
      ...(result.emailSent ? { emailVerifiedAt: now } : {}),
      ...(result.smsSent && !result.emailSent ? { phoneVerifiedAt: now } : {}),
    })
    .where(eq(accounts.id, account.accountId));

  redirect("/account");
}

export async function resendAccountCode(
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const account = await getAccount();
  if (!account) {
    return { status: "error", message: "სესია ვერ მოიძებნა - შედი თავიდან." };
  }
  if (account.status === "active") {
    return { status: "success", message: "ანგარიში უკვე დადასტურებულია." };
  }

  const sent = await sendAccountCode({
    accountId: account.accountId,
    purpose: "activate",
    email: account.email,
    phone: account.phone,
    ip: await clientIp(),
  });

  if (!sent.ok) {
    return {
      status: "error",
      message:
        sent.reason === "throttled"
          ? "კოდი უკვე გაიგზავნა - სცადე ერთ წუთში."
          : "კოდი ვერ გაიგზავნა - სცადე მოგვიანებით ან მოგვწერე.",
    };
  }
  return { status: "success", message: "ახალი კოდი გაიგზავნა." };
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("company_website")) {
    return { status: "success", message: "კოდი გაიგზავნა." };
  }
  if (!checkRateLimit(await clientKey("account-forgot"), { limit: 3 })) {
    return {
      status: "error",
      message: "ძალიან ბევრი მცდელობა - სცადე ერთ წუთში.",
    };
  }

  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) {
    return {
      status: "error",
      errors: { email: "მიუთითე სწორი ელფოსტა" },
      message: "შეამოწმე ელფოსტა.",
    };
  }

  const [account] = await db
    .select({ id: accounts.id, phone: accounts.phone, status: accounts.status })
    .from(accounts)
    .where(eq(accounts.email, parsed.data.toLowerCase()))
    .limit(1);

  if (account && account.status !== "disabled") {
    await sendAccountCode({
      accountId: account.id,
      purpose: "password_reset",
      email: parsed.data.toLowerCase(),
      phone: account.phone,
      ip: await clientIp(),
    });
  }

  /* user-enumeration-ის წინააღმდეგ პასუხი ყოველთვის ერთია */
  return {
    status: "success",
    message: "თუ ამ ელფოსტით ანგარიში არსებობს, კოდი გაიგზავნა ელფოსტაზე.",
  };
}

const resetSchema = z.object({
  email: z.email("მიუთითე სწორი ელფოსტა"),
  code: z.string().trim().regex(/^\d{6}$/, "შეიყვანე 6-ნიშნა კოდი"),
  password: z.string().min(8, "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს"),
});

export async function resetPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!checkRateLimit(await clientKey("account-reset"), { limit: 5 })) {
    return {
      status: "error",
      message: "ძალიან ბევრი მცდელობა - სცადე ერთ წუთში.",
    };
  }

  const parsed = resetSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმე მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const [account] = await db
    .select({ id: accounts.id, status: accounts.status })
    .from(accounts)
    .where(eq(accounts.email, parsed.data.email.toLowerCase()))
    .limit(1);

  /* არარსებულ ელფოსტაზეც იგივე პასუხი — enumeration-ის წინააღმდეგ */
  const failMessage = "კოდი არასწორია ან ვადაგასულია.";
  if (!account || account.status === "disabled") {
    return { status: "error", message: failMessage };
  }

  const result = await redeemAccountCode({
    accountId: account.id,
    purpose: "password_reset",
    code: parsed.data.code,
  });
  if (result.status !== "ok") {
    return { status: "error", message: failMessage };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const now = new Date();
  await db
    .update(accounts)
    .set({
      passwordHash,
      /* ძველი სესიები კვდება — tokenVersion იზრდება */
      tokenVersion: sql`${accounts.tokenVersion} + 1`,
      /* კოდის ფლობა არხსაც ადასტურებს (იგივე წესი, რაც აქტივაციაზე) */
      ...(result.emailSent ? { emailVerifiedAt: now } : {}),
      ...(result.smsSent && !result.emailSent ? { phoneVerifiedAt: now } : {}),
      ...(account.status === "pending" ? { status: "active" } : {}),
    })
    .where(eq(accounts.id, account.id));

  return {
    status: "success",
    message: "პაროლი შეიცვალა - ახლა შეგიძლია შესვლა ახალი პაროლით.",
  };
}
