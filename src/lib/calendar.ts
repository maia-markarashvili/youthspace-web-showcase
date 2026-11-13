/**
 * Drop-in კალენდრის წმინდა ფუნქციები — თბილისის კალენდარული დღეები.
 * წესი: შაბათ-კვირა default-ით დაკეტილია; calendar_overrides ცვლის default-ს
 * (isOpen=true → ხელით გახსნილი შაბ-კვირა, isOpen=false → დახურული დღე/უქმე).
 * საქართველოში DST არ მოქმედებს — Asia/Tbilisi ფიქსირებული UTC+4-ია.
 */

const DAY_MS = 86_400_000;
export const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000;

/** მოცემული მომენტის კალენდარული დღე თბილისში — 'YYYY-MM-DD' */
export function tbilisiDateISO(value: Date): string {
  return new Date(value.getTime() + TBILISI_OFFSET_MS).toISOString().slice(0, 10);
}

/** დღევანდელი კალენდარული დღე თბილისში — 'YYYY-MM-DD' */
export function todayTbilisi(): string {
  return tbilisiDateISO(new Date());
}

/** დღევანდელი დღის დასაწყისი (00:00 თბილისით) — UTC Date-ად */
export function tbilisiDayStart(now: Date = new Date()): Date {
  return new Date(`${tbilisiDateISO(now)}T00:00:00+04:00`);
}

/** „14:35" — დროის ნიშნული თბილისის დროით (ვიზიტების ჟურნალი/ბეჯები) */
export function formatTimeKa(value: Date): string {
  return new Intl.DateTimeFormat("ka-GE", {
    timeZone: "Asia/Tbilisi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

/* date-სტრიქონი T12:00Z-ზე იჭედება — თბილისში 16:00 იმავე კალენდარულ დღეს,
   ამიტომ label ზუსტია დღის საზღვრებთანაც */
const SHORT_DAY_FORMAT = new Intl.DateTimeFormat("ka-GE", {
  timeZone: "Asia/Tbilisi",
  day: "numeric",
  month: "short",
  weekday: "short",
});

const BOOKING_DATE_FORMAT = new Intl.DateTimeFormat("ka-GE", {
  timeZone: "Asia/Tbilisi",
  day: "numeric",
  month: "long",
});

/** „12 აგვ, სამ" — (თარიღი, სლოტი) ბადეები და ადმინის დაფები */
export function shortDayLabelKa(dateISO: string): string {
  return SHORT_DAY_FORMAT.format(new Date(`${dateISO}T12:00:00Z`));
}

/** „12 აგვისტო" — ჯავშნის თარიღი წარმატების ბარათზე */
export function bookingDateLabelKa(dateISO: string): string {
  return BOOKING_DATE_FORMAT.format(new Date(`${dateISO}T12:00:00Z`));
}

/**
 * date-სტრიქონი თავად თბილისის კალენდარული დღეა, ამიტომ ამ თარიღის
 * ჩვეულებრივი UTC კვირის დღე ზუსტია (0=კვირა, 6=შაბათი).
 */
export function isWeekend(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** ღიაა თუ არა დღე: override ჯაბნის default-ს (შაბ-კვირა დაკეტილი) */
export function isDateOpen(
  dateStr: string,
  override: boolean | undefined,
): boolean {
  return override ?? !isWeekend(dateStr);
}

/** 'YYYY-MM-DD' + n დღე → 'YYYY-MM-DD' */
export function addDays(dateStr: string, n: number): string {
  const time = new Date(`${dateStr}T00:00:00Z`).getTime() + n * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
}

/**
 * კურსი/ღონისძიება დასრულებულია, თუ (endDate ?? startDate) დღევანდელზე
 * ადრეა. კლუბების 30-დღიანი lead-წესი აქ განზრახ არ მოქმედებს —
 * კურსი ბოლო დღემდე იყიდება.
 */
export function courseHasEnded(
  course: { startDate: string | null; endDate: string | null },
  today: string = todayTbilisi(),
): boolean {
  const end = course.endDate ?? course.startDate;
  return end !== null && end < today;
}
