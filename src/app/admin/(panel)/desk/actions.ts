"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { isDateOpen, todayTbilisi } from "@/lib/calendar";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/db/mutations/audit";
import { confirmBookingById } from "@/lib/db/mutations/confirm-order";
import { findOrderContact } from "@/lib/db/queries/contact";
import {
  deskCodeCandidates,
  findAtDesk,
  findAtDeskById,
  isValidDeskCode,
  isValidDeskPhone,
} from "@/lib/db/queries/desk";
import {
  findTodayVisit,
  recordVisit,
} from "@/lib/db/mutations/visits";
import { adminUsers, calendarOverrides } from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { notifyOrderCodeReminder } from "@/lib/notify-customer";
import { checkRateLimit } from "@/lib/rate-limit";
import { formatTimeKa } from "@/lib/calendar";
import type { AdmitState, DeskState } from "./types";

/**
 * მისაღების („reception") ეკრანის action-ები — ყველა `requireStaff()`-ით
 * იწყება (owner-იც შედის), თითოეული `logAudit()`-ს იძახებს. ⚠ მხოლოდ
 * async ფუნქციების ექსპორტი.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DESK_KINDS = ["subscription", "booking", "pass"] as const;
type DeskKind = (typeof DESK_KINDS)[number];

/* ── ძებნა ─────────────────────────────────────────────────────── */

export async function searchCustomer(
  _prev: DeskState,
  formData: FormData,
): Promise<DeskState> {
  const session = await requireStaff();

  /* ადმინის id-ზე ლიმიტდება, არა IP-ზე — ერთი ოფისი, ერთი IP */
  if (!checkRateLimit(`desk:${session.adminId}`, { limit: 30 })) {
    return {
      status: "error",
      message: "ძალიან ბევრი ძებნა - სცადე ცოტა ხანში.",
    };
  }

  const raw = String(formData.get("query") ?? "").trim();
  if (!raw) {
    return { status: "error", message: "შეიყვანე ტელეფონი ან კოდი." };
  }

  /* ციფრებით ძებნისას კანდიდატი ყველა პრეფიქსზეა (CLB/CRS/CWK/PSS/SPC + ძველი SIV) */
  const candidates = deskCodeCandidates(raw);
  const isCode = candidates.every((candidate) => isValidDeskCode(candidate));

  if (!isCode && !isValidDeskPhone(raw)) {
    return {
      status: "error",
      message: "შეიყვანე სრული ტელეფონი (9 ციფრი) ან სრული კოდი (მაგ. PSS-#####).",
    };
  }

  const matches = isCode
    ? await findAtDesk({ kind: "code", codes: candidates })
    : await findAtDesk({ kind: "phone", phone: raw });
  const total = matches.active.length + matches.cancelled.length;

  /* ⚠ ნედლი query (ტელეფონი/კოდი) აქ არასდროს იწერება - მხოლოდ ტიპი და
     რაოდენობა, თორემ ჟურნალი თავად გახდებოდა საძებნი მონაცემების წყარო */
  await logAudit({
    session,
    action: "desk.search",
    detail: { query_kind: isCode ? "code" : "phone", matched: total },
  });

  if (total === 0) {
    return { status: "error", message: "ვერაფერი მოიძებნა." };
  }
  return { status: "success", results: matches };
}

/* ── ჯავშნის დადასტურება ──────────────────────────────────────── */

export async function confirmBookingAtDesk(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireStaff();

  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  const confirmed = await confirmBookingById(id);
  if (!confirmed) {
    return {
      status: "error",
      message: "ვერ დადასტურდა - შეიძლება უკვე დადასტურებულია, თავიდან მოძებნე.",
    };
  }

  await logAudit({
    session,
    action: "desk.checkin",
    targetType: "booking",
    targetId: id,
  });

  return { status: "success", message: "დადასტურდა." };
}

/* ── ვიზიტის აღრიცხვა („მიღება") ──────────────────────────────── */

export async function admitVisitor(
  _prev: AdmitState,
  formData: FormData,
): Promise<AdmitState> {
  const session = await requireStaff();

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const method = String(formData.get("method") ?? "");
  const force = formData.get("force") === "1";
  if (
    !UUID_RE.test(id) ||
    !DESK_KINDS.includes(kind as DeskKind) ||
    !["qr", "manual"].includes(method)
  ) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  /* არსებობა/orderRef SQL-იდან — გამოგონილი id ვერ ჩაიწერება */
  const match = await findAtDeskById(kind as DeskKind, id);
  if (!match) {
    return { status: "error", message: "ჩანაწერი ვერ მოიძებნა." };
  }

  if (!force) {
    const existing = await findTodayVisit({ kind: kind as DeskKind, id });
    if (existing) {
      return {
        status: "duplicate",
        message: `უკვე აღრიცხულია დღეს ${formatTimeKa(existing.createdAt)}-ზე (${existing.adminEmail}).`,
      };
    }
  }

  await recordVisit({
    target: { kind: kind as DeskKind, id },
    adminId: session.adminId,
    adminEmail: session.email,
    method: method as "qr" | "manual",
  });

  await logAudit({
    session,
    action: "desk.visit",
    targetType: kind as DeskKind,
    targetId: id,
    targetRef: match.orderRef || undefined,
    detail: { method, forced: force },
  });

  return { status: "success", message: "აღრიცხულია." };
}

/* ── კოდის ხელახლა გაგზავნა ───────────────────────────────────── */

export async function resendCodeAtDesk(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireStaff();

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id) || !DESK_KINDS.includes(kind as DeskKind)) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  const contact = await findOrderContact(kind as DeskKind, id);
  if (!contact) {
    return { status: "error", message: "ჩანაწერი ვერ მოიძებნა." };
  }

  const result = await notifyOrderCodeReminder(contact);

  await logAudit({
    session,
    action: "desk.resend_code",
    targetType: kind as DeskKind,
    targetId: id,
    targetRef: contact.orderRef,
    detail: { sms: result.sms, email: result.email },
  });

  if (result.sms || result.email) {
    return { status: "success", message: "გაიგზავნა." };
  }
  return {
    status: "error",
    message: "ვერ გაიგზავნა - შეამოწმე კონფიგურაცია.",
  };
}

/* ── საკუთარი პაროლის შეცვლა (owner-იც, reception-იც) ───────────── */

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "მიუთითე ახლანდელი პაროლი"),
  newPassword: z.string().min(10, "ახალი პაროლი მინიმუმ 10 სიმბოლო"),
});

export async function changeOwnPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireStaff();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "შეამოწმე ველები.",
    };
  }

  const [admin] = await db
    .select({ passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.adminId))
    .limit(1);
  if (!admin) return { status: "error", message: "ანგარიში ვერ მოიძებნა." };

  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!ok) {
    return { status: "error", message: "ახლანდელი პაროლი არასწორია." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  /* token_version +1 — არსებული ცოცხალი სესიები (სხვა მოწყობილობაზეც) დახურულია */
  await db
    .update(adminUsers)
    .set({ passwordHash, tokenVersion: sql`${adminUsers.tokenVersion} + 1` })
    .where(eq(adminUsers.id, session.adminId));

  return {
    status: "success",
    message: "პაროლი შეიცვალა - ხელახლა შესვლა დაგჭირდება.",
  };
}

/* ── დღესვე გაყიდვის ტოგლი (F5/F6) ─────────────────────────────── */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** სლოტი → calendar_overrides-ის სვეტი — ხისტი რუკა (სტრიქონული აწყობა არასდროს) */
const SAME_DAY_COLUMN = {
  morning: "sameDayMorning",
  midday: "sameDayMidday",
  evening: "sameDayEvening",
} as const;

/**
 * დღევანდელ სლოტზე დღესვე-გაყიდვის ჩართვა/გამორთვა — რეგისტრატორსაც
 * შეუძლია (requireStaff): დილით რომ ირკვევა ოპერატორი ადგილზეა, სლოტი
 * საიტზე გამოდის. მხოლოდ მიმდინარე დღეზე მუშაობს - მომავალ დღეებს
 * დროშა არ სჭირდება (ისინი ისედაც იყიდება), წარსული აზრს მოკლებულია.
 */
export async function setSameDaySale(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireStaff();

  const date = String(formData.get("date") ?? "");
  const slot = String(formData.get("slot") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";

  if (!DATE_RE.test(date) || !(slot in SAME_DAY_COLUMN)) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }
  if (date !== todayTbilisi()) {
    return {
      status: "error",
      message: "დღესვე გაყიდვის ჩართვა მხოლოდ მიმდინარე დღეზე შეიძლება.",
    };
  }
  const column = SAME_DAY_COLUMN[slot as keyof typeof SAME_DAY_COLUMN];

  try {
    const [existing] = await db
      .select()
      .from(calendarOverrides)
      .where(eq(calendarOverrides.date, date))
      .limit(1);
    /* ღიაობა უცვლელი რჩება (default: შაბ-კვირა დაკეტილი); conflict-ზე
       მხოლოდ ეს ერთი დროშა იწერება - კაპასიტეტები/შენიშვნა არ ზიანდება */
    const isOpen = existing?.isOpen ?? isDateOpen(date, undefined);
    await db
      .insert(calendarOverrides)
      .values({
        date,
        isOpen,
        note: existing?.note ?? null,
        [column]: enabled,
      })
      .onConflictDoUpdate({
        target: calendarOverrides.date,
        set: { [column]: enabled },
      });
  } catch (error) {
    console.error("[desk] დღესვე გაყიდვის შენახვა ჩავარდა", error);
    return {
      status: "error",
      message: "შენახვა ვერ მოხერხდა - სცადეთ ხელახლა.",
    };
  }

  await logAudit({
    session,
    action: "desk.same_day",
    detail: { date, slot, enabled },
  });
  revalidatePath("/admin/desk");
  revalidatePath("/drop-in");

  return {
    status: "success",
    message: enabled
      ? "სლოტი დღესვე გასაყიდად გამოვიდა საიტზე."
      : "დღესვე გაყიდვა გამოირთო.",
  };
}
