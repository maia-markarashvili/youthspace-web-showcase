"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccount } from "@/lib/auth/account-session";
import { db } from "@/lib/db";
import {
  cancelOwnedItem,
  type SelfCancelKind,
} from "@/lib/db/mutations/self-cancel";
import { accountProfiles } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { sendMail } from "@/lib/mail";
import { formatGel } from "@/lib/money";
import {
  notifyBookingReleased,
  notifyOrderCancelled,
} from "@/lib/notify-customer";
import { toGeorgianMsisdn } from "@/lib/phone";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";

/**
 * კაბინეტის პროფილები — მშობელი ამატებს/ცვლის შვილ(ებ)ის პროფილს.
 * ⚠ Server Functions პირდაპირი POST-ითაც მისაწვდომია: მფლობელობა
 * (profile.accountId === სესიის ანგარიში) ყოველთვის სერვერზე მოწმდება,
 * hidden ველს არასდროს ვენდობით.
 */

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** არასავალდებულო ტელეფონი: ცარიელი → null, შევსებული → ვალიდური ქართული */
const optionalPhone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    if (toGeorgianMsisdn(value) === null) {
      ctx.addIssue({
        code: "custom",
        message: "მიუთითე ქართული მობილურის ნომერი (5XX XX XX XX)",
      });
      return z.NEVER;
    }
    return value;
  });

const optionalEmail = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    if (!z.email().safeParse(value).success) {
      ctx.addIssue({ code: "custom", message: "მიუთითე სწორი ელფოსტა" });
      return z.NEVER;
    }
    return value.toLowerCase();
  });

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "მიუთითე სახელი და გვარი"),
  phone: optionalPhone,
  email: optionalEmail,
  birthDate: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value)),
});

export async function saveProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await requireAccount();

  if (!checkRateLimit(await clientKey("account-profile"), { limit: 20 })) {
    return {
      status: "error",
      message: "ძალიან ბევრი მოთხოვნა - სცადე ერთ წუთში.",
    };
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    birthDate: formData.get("birthDate"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმე მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const rawId = String(formData.get("profileId") ?? "").trim();
  const values = {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    birthDate: parsed.data.birthDate,
  };

  try {
    if (rawId) {
      if (!z.uuid().safeParse(rawId).success) {
        return { status: "error", message: "არასწორი მოთხოვნა." };
      }
      /* მფლობელობა where-შივე — სხვისი პროფილი ვერ შეიცვლება */
      const [updated] = await db
        .update(accountProfiles)
        .set(values)
        .where(
          and(
            eq(accountProfiles.id, rawId),
            eq(accountProfiles.accountId, account.accountId),
          ),
        )
        .returning({ id: accountProfiles.id });
      if (!updated) {
        return { status: "error", message: "პროფილი ვერ მოიძებნა." };
      }
    } else {
      await db.insert(accountProfiles).values({
        accountId: account.accountId,
        relationship: "child",
        ...values,
      });
    }
  } catch (error) {
    console.error("[account/profile] შენახვა ჩავარდა", error);
    return { status: "error", message: "შენახვა ვერ მოხერხდა - სცადე ხელახლა." };
  }

  revalidatePath("/account");
  return { status: "success", message: "შენახულია" };
}

export async function deleteProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await requireAccount();

  const rawId = String(formData.get("profileId") ?? "").trim();
  if (!z.uuid().safeParse(rawId).success) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  try {
    const [profile] = await db
      .select({
        id: accountProfiles.id,
        relationship: accountProfiles.relationship,
      })
      .from(accountProfiles)
      .where(
        and(
          eq(accountProfiles.id, rawId),
          eq(accountProfiles.accountId, account.accountId),
        ),
      )
      .limit(1);

    if (!profile) return { status: "error", message: "პროფილი ვერ მოიძებნა." };
    if (profile.relationship === "self") {
      return {
        status: "error",
        message: "საკუთარი პროფილის წაშლა არ შეიძლება.",
      };
    }

    /* ⚠ ყიდვებზე მიბმული პროფილი არ იშლება — ისტორია არ უნდა დაიკარგოს
       (FK-ც არ დაუშვებდა). ასეთს მხოლოდ რედაქტირება შეიძლება. */
    await db
      .delete(accountProfiles)
      .where(
        and(
          eq(accountProfiles.id, rawId),
          eq(accountProfiles.accountId, account.accountId),
        ),
      );
  } catch {
    return {
      status: "error",
      message: "ამ პროფილს ყიდვები უკავშირდება - წაშლა ვერ ხერხდება.",
    };
  }

  revalidatePath("/account");
  return { status: "success", message: "პროფილი წაიშალა" };
}

/* ── შეკვეთის გაუქმება კაბინეტიდან (ხელშეკრულების §2-ის წესით) ──── */

const CANCEL_KINDS = ["club", "pass", "booking"] as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function cancelOwnItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await requireAccount();

  if (!checkRateLimit(`account-cancel:${account.accountId}`, { limit: 5 })) {
    return {
      status: "error",
      message: "ძალიან ბევრი მცდელობა - სცადე ერთ წუთში.",
    };
  }

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (
    !CANCEL_KINDS.includes(kind as SelfCancelKind) ||
    !UUID_RE.test(id)
  ) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  let result;
  try {
    result = await cancelOwnedItem({
      account,
      kind: kind as SelfCancelKind,
      id,
    });
  } catch (error) {
    console.error("[account/cancel] ჩავარდა", error);
    return {
      status: "error",
      message: "დროებითი შეფერხებაა - სცადე ხელახლა.",
    };
  }
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  /* fire-and-forget: მომხმარებელს დასტური, მფლობელს - თანხის დაბრუნების
     შეხსენება (მხოლოდ მაშინ, თუ დასაბრუნებელი თანხაა). პასით ჯავშნის
     გაუქმება ფულს არ ეხება - შესვლა პასს უბრუნდება და ცალკე ტიპი იგზავნება */
  const notifyParams = {
    phone: result.phone,
    email: result.email,
    name: result.buyerName,
    orderRef: result.orderRef,
    itemTitle: result.itemTitle,
  };
  if (kind === "booking" && result.passId !== null) {
    void notifyBookingReleased(notifyParams);
  } else {
    void notifyOrderCancelled(notifyParams);
  }
  if (result.refundChannel) {
    const channelText =
      result.refundChannel === "card"
        ? `ბარათი (Flitt${result.maskedCard ? `, ${result.maskedCard}` : ""}) - დააბრუნე Flitt-ის კაბინეტიდან`
        : "გადმორიცხვა - დააბრუნე ბანკის გადარიცხვით";
    void sendMail({
      to: siteConfig.email,
      subject: `გაუქმდა შეკვეთა ${result.orderRef} - თანხის დაბრუნება`,
      text:
        `${result.itemTitle} (${result.orderRef}) მომხმარებელმა კაბინეტიდან გააუქმა ვადაში.\n\n` +
        `თანხა: ${formatGel(result.amountTetri)}\n` +
        `გადახდის არხი: ${channelText}\n` +
        `მყიდველი: ${result.buyerName}, ${result.phone}\n\n` +
        `ხელშეკრულების წესით ვადაში გაუქმებაზე თანხა სრულად უბრუნდება.`,
    });
  }

  revalidatePath("/account");
  return { status: "success", message: "გაუქმდა." };
}
