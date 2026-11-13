"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import {
  CapacityError,
  createClubSubscription,
} from "@/lib/db/mutations/club-subscription";
import { ReferralError } from "@/lib/db/mutations/referral";
import type { FormState } from "@/lib/form-state";
import { toTetri } from "@/lib/money";

/**
 * წევრის ხელით დამატება (admin) — ზუსტად იგივე გზა, რაც საიტიდან ყიდვას:
 * createClubSubscription ამოწმებს კვოტებს ტრანზაქციაში და თანხას ტარიფით
 * ითვლის (თუ ადმინმა ხელით არ მიუთითა). status='active' = გადახდილი →
 * currentPeriodEnd მაშინვე +1 თვე; 'pending' = გადარიცხვის მოლოდინში.
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_EMAIL = "მიუთითეთ სწორი ელფოსტა";
const INVALID_AMOUNT = "მიუთითეთ დადებითი რიცხვი";

const memberSchema = z.object({
  clubId: z.uuid("აირჩიე კლუბი"),
  name: z.string({ error: REQUIRED }).trim().min(2, REQUIRED).max(120),
  phone: z.string({ error: REQUIRED }).trim().min(5, REQUIRED).max(40),
  email: z.email(INVALID_EMAIL).optional().or(z.literal("")),
  amountGel: z.coerce
    .number({ error: INVALID_AMOUNT })
    .min(0, INVALID_AMOUNT)
    .max(100000, INVALID_AMOUNT)
    .optional(),
  referralCode: z.string().trim().max(24).optional().or(z.literal("")),
  status: z.enum(["active", "pending"], { error: "აირჩიე სტატუსი" }),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** ცარიელი სტრიქონი → undefined — „ცარიელი = ავტომატური ტარიფით" */
function numeric(value: FormDataEntryValue | null): string | undefined {
  const raw = String(value ?? "").trim();
  return raw === "" ? undefined : raw;
}

export async function addMember(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = memberSchema.safeParse({
    clubId: formData.get("clubId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    amountGel: numeric(formData.get("amountGel")),
    referralCode: formData.get("referralCode"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  try {
    await createClubSubscription({
      clubId: data.clubId,
      name: data.name,
      phone: data.phone,
      email: data.email || "",
      status: data.status,
      /* ადმინი ხელით ქმნის შეკვეთას მომხმარებელთან შეთანხმებით — ნომერი
         გადამოწმებულად ითვლება, ე.ი. კრედიტიც ჩვეულებრივ ერგება */
      phoneProven: true,
      /* „მიღება დასრულებულია" მხოლოდ საჯარო რეგისტრაციას კეტავს */
      allowClosed: true,
      referralCode: data.referralCode || null,
      amountTetriOverride:
        data.amountGel === undefined ? null : toTetri(data.amountGel),
    });
  } catch (error) {
    if (error instanceof ReferralError) {
      return {
        status: "error",
        message: error.message,
        errors: { referralCode: error.message },
      };
    }
    if (error instanceof CapacityError) {
      return { status: "error", message: error.message };
    }
    console.error("[orders/new] წევრის დამატება ჩავარდა", error);
    return {
      status: "error",
      message: "დროებითი შეფერხებაა - სცადე ხელახლა.",
    };
  }

  revalidatePath("/admin/orders");
  /* redirect ისვრის — try/catch-ის გარეთ უნდა იყოს */
  redirect("/admin/orders");
}
