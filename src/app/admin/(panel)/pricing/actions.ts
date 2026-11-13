"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { pricingSettings } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { toTetri } from "@/lib/money";
import { sendSmsDetailed } from "@/lib/sms";

/**
 * ფასების კონფიგი — singleton (id=1), გაყიდვების მოდელის ერთადერთი წყარო:
 * კლუბის ერთი ფასი · შესვლის ფასები · მეგობრის კოდის განაკვეთი ·
 * სლოტების გლობალური კაპასიტეტები. (კურსის ფასდაკლებები კურსშივე იწერება.)
 * ჩანაწერი seed-იდან არსებობს → ჩვეულებრივი update; თუ 0 რიგი შეიცვალა — insert.
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი — სქემა/ჰელფერები ლოკალურია.
 */

const REQUIRED = "ეს ველი აუცილებელია";

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

/** მთელი არაუარყოფითი რიცხვი (კაპასიტეტები, ვადა) */
const intInput = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .transform((value, ctx) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      ctx.addIssue({
        code: "custom",
        message: "მიუთითეთ არაუარყოფითი მთელი რიცხვი",
      });
      return z.NEVER;
    }
    return parsed;
  });

/** ფასდაკლების პროცენტი — მთელი, 0–100 */
const percentInput = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .transform((value, ctx) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      ctx.addIssue({ code: "custom", message: "მთელი რიცხვი 0–100" });
      return z.NEVER;
    }
    return parsed;
  });

/** ღონისძიების სლოტის ფასი — მინიმუმ 1 ლარი (0₾-იანი შეკვეთის დამცავი) */
const eventGelInput = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .transform((value, ctx) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      ctx.addIssue({ code: "custom", message: "მინიმუმ 1 ლარი" });
      return z.NEVER;
    }
    return parsed;
  });

/** ღონისძიების წევრის ფასი: ცარიელი → null (არ მოქმედებს), სხვაგვარად
 *  მინიმუმ 1 ლარი — 0 გადახდის ნაკადს ტეხდა (checkout 0-ზე ვერ იხსნება,
 *  სლოტი კი დაკავებული რჩებოდა) */
const eventMemberGelInput = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      ctx.addIssue({ code: "custom", message: "მინიმუმ 1 ლარი ან ცარიელი" });
      return z.NEVER;
    }
    return parsed;
  });

/** საფეხურის ზღვარი — დადებითი მთელი („X ადამიანამდე") */
const tierUpToInput = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .transform((value, ctx) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9999) {
      ctx.addIssue({ code: "custom", message: "მთელი რიცხვი 1-დან" });
      return z.NEVER;
    }
    return parsed;
  });

const pricingSchema = z.object({
  clubPrice: gelInput,
  singleEntryPrice: gelInput,
  fourPackPrice: gelInput,
  saleClubPrice: saleGelInput,
  saleSingleEntryPrice: saleGelInput,
  saleFourPackPrice: saleGelInput,
  referralDiscountPercent: percentInput,
  clubSeatCapacity: intInput,
  entryCapacityMorning: intInput,
  entryCapacityMidday: intInput,
  entryCapacityEvening: intInput,
  fourPackValidityDays: intInput,
  renewalGraceDays: intInput,
  transferHoldHours: intInput,
  bankRequisites: z.string().trim().max(4000).optional().or(z.literal("")),
  /* ღონისძიების დაჯავშნა: სლოტის ფასები + არასავალდებულო წევრის ფასები +
     ხალხის 4 საფეხური (ზღვარი და ფასი ორივე ცვლადია) */
  eventPriceMorning: eventGelInput,
  eventPriceMidday: eventGelInput,
  eventPriceEvening: eventGelInput,
  eventMemberPriceMorning: eventMemberGelInput,
  eventMemberPriceMidday: eventMemberGelInput,
  eventMemberPriceEvening: eventMemberGelInput,
  tierUpTo1: tierUpToInput,
  tierUpTo2: tierUpToInput,
  tierUpTo3: tierUpToInput,
  tierUpTo4: tierUpToInput,
  tierPrice1: gelInput,
  tierPrice2: gelInput,
  tierPrice3: gelInput,
  tierPrice4: gelInput,
});

/** წევრის ფასი მხოლოდ სტანდარტულზე ნაკლები აზრიანია; ზღვრები - მკაცრად ზრდადი */
const pricingSchemaChecked = pricingSchema.superRefine((data, ctx) => {
  const memberPairs = [
    ["eventMemberPriceMorning", data.eventMemberPriceMorning, data.eventPriceMorning],
    ["eventMemberPriceMidday", data.eventMemberPriceMidday, data.eventPriceMidday],
    ["eventMemberPriceEvening", data.eventMemberPriceEvening, data.eventPriceEvening],
  ] as const;
  for (const [field, member, standard] of memberPairs) {
    if (member !== null && member >= standard) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "სტანდარტულზე ნაკლები უნდა იყოს",
      });
    }
  }
  const upTos = [data.tierUpTo1, data.tierUpTo2, data.tierUpTo3, data.tierUpTo4];
  for (let i = 1; i < upTos.length; i++) {
    if (upTos[i] <= upTos[i - 1]) {
      ctx.addIssue({
        code: "custom",
        path: [`tierUpTo${i + 1}`],
        message: "წინა საფეხურზე მეტი უნდა იყოს",
      });
    }
  }
});

export async function savePricing(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const raw = (name: string) => String(formData.get(name) ?? "");

  const parsed = pricingSchemaChecked.safeParse({
    clubPrice: raw("clubPrice"),
    singleEntryPrice: raw("singleEntryPrice"),
    fourPackPrice: raw("fourPackPrice"),
    saleClubPrice: raw("saleClubPrice"),
    saleSingleEntryPrice: raw("saleSingleEntryPrice"),
    saleFourPackPrice: raw("saleFourPackPrice"),
    referralDiscountPercent: raw("referralDiscountPercent"),
    clubSeatCapacity: raw("clubSeatCapacity"),
    entryCapacityMorning: raw("entryCapacityMorning"),
    entryCapacityMidday: raw("entryCapacityMidday"),
    entryCapacityEvening: raw("entryCapacityEvening"),
    fourPackValidityDays: raw("fourPackValidityDays"),
    renewalGraceDays: raw("renewalGraceDays"),
    transferHoldHours: raw("transferHoldHours"),
    bankRequisites: raw("bankRequisites"),
    eventPriceMorning: raw("eventPriceMorning"),
    eventPriceMidday: raw("eventPriceMidday"),
    eventPriceEvening: raw("eventPriceEvening"),
    eventMemberPriceMorning: raw("eventMemberPriceMorning"),
    eventMemberPriceMidday: raw("eventMemberPriceMidday"),
    eventMemberPriceEvening: raw("eventMemberPriceEvening"),
    tierUpTo1: raw("tierUpTo1"),
    tierUpTo2: raw("tierUpTo2"),
    tierUpTo3: raw("tierUpTo3"),
    tierUpTo4: raw("tierUpTo4"),
    tierPrice1: raw("tierPrice1"),
    tierPrice2: raw("tierPrice2"),
    tierPrice3: raw("tierPrice3"),
    tierPrice4: raw("tierPrice4"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  /* checkbox-ი მონიშნული არარსებობისას FormData-ში საერთოდ არ ჩნდება */
  const otpRequiredForTransfer = formData.get("otpRequiredForTransfer") === "on";
  const showPublicSeats = formData.get("showPublicSeats") === "on";
  const values = {
    clubPrice: toTetri(data.clubPrice),
    singleEntryPrice: toTetri(data.singleEntryPrice),
    fourPackPrice: toTetri(data.fourPackPrice),
    saleClubPrice:
      data.saleClubPrice === null ? null : toTetri(data.saleClubPrice),
    saleSingleEntryPrice:
      data.saleSingleEntryPrice === null
        ? null
        : toTetri(data.saleSingleEntryPrice),
    saleFourPackPrice:
      data.saleFourPackPrice === null ? null : toTetri(data.saleFourPackPrice),
    referralDiscountPercent: data.referralDiscountPercent,
    clubSeatCapacity: data.clubSeatCapacity,
    entryCapacityMorning: data.entryCapacityMorning,
    entryCapacityMidday: data.entryCapacityMidday,
    entryCapacityEvening: data.entryCapacityEvening,
    fourPackValidityDays: data.fourPackValidityDays,
    renewalGraceDays: data.renewalGraceDays,
    transferHoldHours: data.transferHoldHours,
    otpRequiredForTransfer,
    showPublicSeats,
    bankRequisites: data.bankRequisites || null,
    eventPriceMorning: toTetri(data.eventPriceMorning),
    eventPriceMidday: toTetri(data.eventPriceMidday),
    eventPriceEvening: toTetri(data.eventPriceEvening),
    eventMemberPriceMorning:
      data.eventMemberPriceMorning === null
        ? null
        : toTetri(data.eventMemberPriceMorning),
    eventMemberPriceMidday:
      data.eventMemberPriceMidday === null
        ? null
        : toTetri(data.eventMemberPriceMidday),
    eventMemberPriceEvening:
      data.eventMemberPriceEvening === null
        ? null
        : toTetri(data.eventMemberPriceEvening),
    eventPeopleTiers: [
      { upTo: data.tierUpTo1, price: toTetri(data.tierPrice1) },
      { upTo: data.tierUpTo2, price: toTetri(data.tierPrice2) },
      { upTo: data.tierUpTo3, price: toTetri(data.tierPrice3) },
      { upTo: data.tierUpTo4, price: toTetri(data.tierPrice4) },
    ],
    updatedAt: new Date(),
  };

  try {
    const updated = await db
      .update(pricingSettings)
      .set(values)
      .where(eq(pricingSettings.id, 1))
      .returning({ id: pricingSettings.id });

    if (updated.length === 0) {
      await db.insert(pricingSettings).values({ id: 1, ...values });
    }
  } catch (error) {
    console.error("[admin/pricing] შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidatePath("/admin/pricing");
  /* ღონისძიების ფასები საჯარო გვერდზეც ჩანს */
  revalidatePath("/spaces");
  return { status: "success", message: "შენახულია" };
}

/**
 * SMS დიაგნოსტიკა — მითითებულ ნომერზე სატესტო SMS და **ზუსტი** მიზეზი
 * (ubill statusID), რომ მფლობელმა დაინახოს რატომ არ იგზავნება (სენდერი
 * დაუმტკიცებელია / ბალანსი / brandID / creds). owner-only.
 */
export async function sendTestSms(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const phone = String(formData.get("phone") ?? "").trim();
  if (phone.length < 5) {
    return { status: "error", message: "მიუთითე ტელეფონის ნომერი." };
  }

  const result = await sendSmsDetailed(
    phone,
    "სივრცე: სატესტო SMS. კონფიგურაცია მუშაობს ✅",
  );

  if (result.ok) {
    return {
      status: "success",
      message: "გაიგზავნა (statusID 0) - შეამოწმე ტელეფონი.",
    };
  }

  const statusPart =
    result.statusID != null ? ` (statusID ${result.statusID})` : "";
  return {
    status: "error",
    message: `ვერ გაიგზავნა: ${result.reason ?? "უცნობი მიზეზი"}${statusPart}`,
  };
}
