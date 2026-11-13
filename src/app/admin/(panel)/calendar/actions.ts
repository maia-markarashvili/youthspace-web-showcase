"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/session";
import { isDateOpen, isWeekend, todayTbilisi } from "@/lib/calendar";
import { db } from "@/lib/db";
import { calendarOverrides, pricingSettings } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import {
  ENTRY_SLOT_KEYS,
  WEEKDAY_KEYS,
  type EventWeekdays,
  type WeekdayCapacities,
} from "@/lib/slots";

/**
 * კალენდრის მართვა (§6.16) — გამონაკლისების ჩასმა/წაშლა და სლოტების
 * per-date კაპასიტეტები: ჩანაწერი არ არის = default (სამუშაო დღე ღია,
 * შაბ-კვირა დაკეტილი, კაპასიტეტი გლობალური pricing_settings-იდან).
 * ცვლილება მაშინვე აისახება საიტის drop-in კალენდარზეც.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

function revalidateCalendar() {
  revalidatePath("/admin/calendar");
  revalidatePath("/drop-in");
  /* ღონისძიების დროშები/ჯვარედინი ბლოკი საჯარო გვერდზეც აისახება */
  revalidatePath("/spaces");
}

/** override-რიგში სლოტ-კონფიგი დევს? — წაშლის დამცავი პრედიკატი:
 *  კაპასიტეტები, დღესვე-დროშები ან ღონისძიების გამონაკლისები.
 *  ⚠ ღონისძიების დროშა სამმდგომარეობიანია — `false` (ხელით დაკეტილი)
 *  ისეთივე ცხადი კონფიგია, როგორც `true`, ამიტომ შემოწმება !== null-ია */
function hasSlotConfig(override: {
  capacityMorning: number | null;
  capacityMidday: number | null;
  capacityEvening: number | null;
  sameDayMorning: boolean;
  sameDayMidday: boolean;
  sameDayEvening: boolean;
  eventMorning: boolean | null;
  eventMidday: boolean | null;
  eventEvening: boolean | null;
}): boolean {
  return (
    override.capacityMorning !== null ||
    override.capacityMidday !== null ||
    override.capacityEvening !== null ||
    override.sameDayMorning ||
    override.sameDayMidday ||
    override.sameDayEvening ||
    override.eventMorning !== null ||
    override.eventMidday !== null ||
    override.eventEvening !== null
  );
}

/**
 * დღის გადართვა ღია↔დაკეტილზე. რიგი მთლიანად იშლება მხოლოდ მაშინ, როცა
 * სასურველი მდგომარეობა default-ს ემთხვევა **და** კაპასიტეტებიც ცარიელია —
 * თორემ „გახსენი/დახურე"-ს ორჯერ დაჭერა დღის კაპასიტეტ-კონფიგსაც წაშლიდა.
 */
export async function toggleDay(date: string, _formData: FormData) {
  await requireOwner();
  if (!DATE_RE.test(date)) return;

  const [override] = await db
    .select()
    .from(calendarOverrides)
    .where(eq(calendarOverrides.date, date))
    .limit(1);

  const desiredOpen = !isDateOpen(date, override?.isOpen);
  const defaultOpen = !isWeekend(date);
  const hasCapacityConfig = override != null && hasSlotConfig(override);

  if (desiredOpen === defaultOpen && !hasCapacityConfig) {
    await db.delete(calendarOverrides).where(eq(calendarOverrides.date, date));
  } else {
    await db
      .insert(calendarOverrides)
      .values({ date, isOpen: desiredOpen, note: null })
      .onConflictDoUpdate({
        target: calendarOverrides.date,
        set: { isOpen: desiredOpen, note: null },
      });
  }

  revalidateCalendar();
}

const closeDaySchema = z.object({
  date: z.string().regex(DATE_RE, "აირჩიე თარიღი"),
  note: z.string().trim().max(500, "მაქსიმუმ 500 სიმბოლო").optional().or(z.literal("")),
});

/** დღის დახურვა შენიშვნით (უქმე/ღონისძიება) — upsert isOpen=false */
export async function closeDayWithNote(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = closeDaySchema.safeParse({
    date: String(formData.get("date") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { date } = parsed.data;
  const note = parsed.data.note || null;

  if (date < todayTbilisi()) {
    return {
      status: "error",
      message: "წარსული დღის დახურვა შეუძლებელია - აირჩიე მომავალი თარიღი.",
      errors: { date: "აირჩიე დღევანდელი ან მომავალი დღე" },
    };
  }

  try {
    await db
      .insert(calendarOverrides)
      .values({ date, isOpen: false, note })
      .onConflictDoUpdate({
        target: calendarOverrides.date,
        set: { isOpen: false, note },
      });
  } catch (error) {
    console.error("[admin/calendar] დახურვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidateCalendar();
  return { status: "success", message: "დღე დაიხურა - საიტის კალენდარშიც აისახა." };
}

/** ცარიელი სტრიქონი → null (გლობალური default); რიცხვი 0-999 */
const capacityInput = z
  .string()
  .trim()
  .transform((raw, ctx) => {
    if (raw === "") return null;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 999) {
      ctx.addIssue({ code: "custom", message: "0-999 ან ცარიელი" });
      return z.NEVER;
    }
    return value;
  });

const dayCapacitySchema = z.object({
  date: z.string().regex(DATE_RE, "აირჩიე თარიღი"),
  capacityMorning: capacityInput,
  capacityMidday: capacityInput,
  capacityEvening: capacityInput,
});

/**
 * კონკრეტული დღის სლოტ-კაპასიტეტები: ცარიელი = გლობალური default,
 * 0 = სლოტი ამ დღეს დაიხურება (ჯავშნებში აღარ გამოჩნდება).
 * ორივე ცარიელი და ღიაობაც default-ზეა → override-რიგი მთლიანად იშლება.
 */
export async function setDayCapacity(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const parsed = dayCapacitySchema.safeParse({
    date: String(formData.get("date") ?? ""),
    capacityMorning: String(formData.get("capacityMorning") ?? ""),
    capacityMidday: String(formData.get("capacityMidday") ?? ""),
    capacityEvening: String(formData.get("capacityEvening") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { date, capacityMorning, capacityMidday, capacityEvening } = parsed.data;

  if (date < todayTbilisi()) {
    return {
      status: "error",
      message: "წარსული დღის შეცვლა შეუძლებელია - აირჩიე მომავალი თარიღი.",
      errors: { date: "აირჩიე დღევანდელი ან მომავალი დღე" },
    };
  }

  try {
    const [override] = await db
      .select()
      .from(calendarOverrides)
      .where(eq(calendarOverrides.date, date))
      .limit(1);

    const isOpen = override?.isOpen ?? !isWeekend(date);
    const defaultOpen = !isWeekend(date);

    const hasFlagConfig =
      override != null &&
      (override.note !== null ||
        override.sameDayMorning ||
        override.sameDayMidday ||
        override.sameDayEvening ||
        override.eventMorning !== null ||
        override.eventMidday !== null ||
        override.eventEvening !== null);
    if (
      capacityMorning === null &&
      capacityMidday === null &&
      capacityEvening === null
    ) {
      /* კაპასიტეტები default-ზე ბრუნდება: ღიაობაც default-ზეა და დღესვე/
         ღონისძიების დროშებიც არ არის → რიგი იშლება (დროშები ჩუმად არ უნდა
         წაიშალოს) */
      if (override && isOpen === defaultOpen && !hasFlagConfig) {
        await db
          .delete(calendarOverrides)
          .where(eq(calendarOverrides.date, date));
      } else if (override) {
        await db
          .update(calendarOverrides)
          .set({
            capacityMorning: null,
            capacityMidday: null,
            capacityEvening: null,
          })
          .where(eq(calendarOverrides.date, date));
      }
    } else {
      await db
        .insert(calendarOverrides)
        .values({
          date,
          isOpen,
          note: override?.note ?? null,
          capacityMorning,
          capacityMidday,
          capacityEvening,
        })
        .onConflictDoUpdate({
          target: calendarOverrides.date,
          set: { capacityMorning, capacityMidday, capacityEvening },
        });
    }
  } catch (error) {
    console.error("[admin/calendar] კაპასიტეტის შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidateCalendar();
  return {
    status: "success",
    message: "შენახულია - ცარიელი ველი გლობალურ რაოდენობას ნიშნავს, 0 კი სლოტს კეტავს.",
  };
}

/** „" = კვირის ბადის მიხედვით (null), "yes" = ხელით გახსნილი,
 *  "no" = ხელით დაკეტილი; უცნობი მნიშვნელობა default-ზე ბრუნდება */
function eventChoice(raw: FormDataEntryValue | null): boolean | null {
  const value = String(raw ?? "");
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

/**
 * ღონისძიების სლოტების **გამონაკლისი** კონკრეტულ დღეს: „კი" ხსნის სლოტს
 * კვირის ბადისა და დღის დახურვის მიუხედავად, „არა" კეტავს ბადის მიუხედავად,
 * ცარიელი კი დღეს ბადეს უბრუნებს (resolveEventSlotOpen). ჯვარედინი ბლოკი
 * (შესვლები ⟷ ღონისძიება) ჯავშნების არსებობით ითვლება. სამივე ცარიელი და
 * სხვა კონფიგიც არ არის → override-რიგი იშლება.
 */
export async function setEventSlots(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const date = String(formData.get("date") ?? "");
  if (!DATE_RE.test(date)) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: { date: "აირჩიე თარიღი" },
    };
  }
  if (date < todayTbilisi()) {
    return {
      status: "error",
      message: "წარსული დღის შეცვლა შეუძლებელია - აირჩიე მომავალი თარიღი.",
      errors: { date: "აირჩიე დღევანდელი ან მომავალი დღე" },
    };
  }

  const eventMorning = eventChoice(formData.get("eventMorning"));
  const eventMidday = eventChoice(formData.get("eventMidday"));
  const eventEvening = eventChoice(formData.get("eventEvening"));

  try {
    const [override] = await db
      .select()
      .from(calendarOverrides)
      .where(eq(calendarOverrides.date, date))
      .limit(1);

    const isOpen = override?.isOpen ?? !isWeekend(date);
    const defaultOpen = !isWeekend(date);
    /* შენიშვნაც ითვლება კონფიგად — დახურული უქმე დღის ახსნა ჩუმად არ უნდა
       წაიშალოს (მაგ. შაბათი, სადაც isOpen=false default-საც ემთხვევა) */
    const hasOtherConfig =
      override != null &&
      (override.note !== null ||
        override.capacityMorning !== null ||
        override.capacityMidday !== null ||
        override.capacityEvening !== null ||
        override.sameDayMorning ||
        override.sameDayMidday ||
        override.sameDayEvening);

    if (eventMorning === null && eventMidday === null && eventEvening === null) {
      /* სამივე ბადეს დაუბრუნდა: სხვა კონფიგი არ დევს და ღიაობაც default-ზეა →
         რიგი იშლება; თორემ მხოლოდ გამონაკლისები ნულდება */
      if (override && isOpen === defaultOpen && !hasOtherConfig) {
        await db
          .delete(calendarOverrides)
          .where(eq(calendarOverrides.date, date));
      } else if (override) {
        await db
          .update(calendarOverrides)
          .set({ eventMorning: null, eventMidday: null, eventEvening: null })
          .where(eq(calendarOverrides.date, date));
      }
    } else {
      await db
        .insert(calendarOverrides)
        .values({
          date,
          isOpen,
          note: override?.note ?? null,
          eventMorning,
          eventMidday,
          eventEvening,
        })
        .onConflictDoUpdate({
          target: calendarOverrides.date,
          set: { eventMorning, eventMidday, eventEvening },
        });
    }
  } catch (error) {
    console.error("[admin/calendar] ღონისძიების დროშების შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidateCalendar();
  return {
    status: "success",
    message:
      "შენახულია - გამონაკლისი ამ თარიღზე კვირის ბადეს ჯაბნის (ონლაინ გაყიდვა ხვალიდან იწყება). გაითვალისწინე: 14:00–18:00 სამუშაო დღეებში კლუბების დროა.",
  };
}

/**
 * ღონისძიების კვირის ბადე (7 დღე × 3 სლოტი) → pricing_settings.event_weekdays.
 * ველის სახელი: ev_{mon..sun}_{morning|midday|evening}; მონიშნული = ის სლოტი
 * იმ კვირის დღეს ღონისძიებად იყიდება, ცარიელი = არ იყიდება. ბადე მოქმედებს
 * მხოლოდ ღია დღეებზე; კონკრეტული თარიღის გამონაკლისი ბადესაც ჯაბნის.
 */
export async function saveEventWeekdays(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const grid: EventWeekdays = {};
  for (const day of WEEKDAY_KEYS) {
    const dayValues: Partial<Record<(typeof ENTRY_SLOT_KEYS)[number], boolean>> =
      {};
    for (const slot of ENTRY_SLOT_KEYS) {
      if (formData.get(`ev_${day}_${slot}`) === "on") dayValues[slot] = true;
    }
    if (Object.keys(dayValues).length > 0) grid[day] = dayValues;
  }

  try {
    await db
      .update(pricingSettings)
      .set({
        eventWeekdays: Object.keys(grid).length > 0 ? grid : null,
        updatedAt: new Date(),
      })
      .where(eq(pricingSettings.id, 1));
  } catch (error) {
    console.error("[admin/calendar] ღონისძიების ბადის შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidateCalendar();
  return {
    status: "success",
    message:
      "შენახულია - მონიშნული სლოტები ღონისძიების კალენდარში გამოჩნდება (ხვალიდან, საჯავშნო ფანჯრის ფარგლებში). დახურულ დღეს ბადე არ მოქმედებს.",
  };
}

/** გამონაკლისის წაშლა — დღე default-წესს უბრუნდება (კაპასიტეტებიც) */
export async function removeOverride(date: string, _formData: FormData) {
  await requireOwner();
  if (!DATE_RE.test(date)) return;

  await db.delete(calendarOverrides).where(eq(calendarOverrides.date, date));
  revalidateCalendar();
}

/**
 * კვირის დღეების რაოდენობები (7 დღე × 3 სლოტი) → pricing_settings.
 * weekday_capacities jsonb. ველის სახელი: cap_{mon..sun}_{morning|midday|
 * evening}; ცარიელი = გლობალურ default-ზე გადასვლა (jsonb-ში არ იწერება),
 * 0 = იმ კვირის დღეს სლოტი დაკეტილია. მოქმედებს მხოლოდ ღია დღეებზე —
 * დღეების ღიაობას ძველი წესი მართავს (შაბ-კვირა default-ად დაკეტილი).
 */
export async function saveWeekdayCapacities(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const errors: Record<string, string> = {};
  const grid: WeekdayCapacities = {};

  for (const day of WEEKDAY_KEYS) {
    const dayValues: Partial<Record<(typeof ENTRY_SLOT_KEYS)[number], number>> =
      {};
    for (const slot of ENTRY_SLOT_KEYS) {
      const field = `cap_${day}_${slot}`;
      const raw = String(formData.get(field) ?? "").trim();
      if (raw === "") continue;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > 999) {
        errors[field] = "0-999 ან ცარიელი";
        continue;
      }
      dayValues[slot] = value;
    }
    if (Object.keys(dayValues).length > 0) grid[day] = dayValues;
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors,
    };
  }

  try {
    await db
      .update(pricingSettings)
      .set({
        weekdayCapacities: Object.keys(grid).length > 0 ? grid : null,
        updatedAt: new Date(),
      })
      .where(eq(pricingSettings.id, 1));
  } catch (error) {
    console.error("[admin/calendar] კვირის დღეების შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  revalidateCalendar();
  return {
    status: "success",
    message:
      "შენახულია - ცარიელი უჯრა გლობალურ რაოდენობას ნიშნავს, 0 კი სლოტს იმ კვირის დღეს კეტავს.",
  };
}
