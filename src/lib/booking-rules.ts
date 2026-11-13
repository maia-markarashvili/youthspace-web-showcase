/**
 * ჯავშნის გაუქმების წესი: შესაძლებელია ჯავშნის თარიღის **წინა დღის
 * 10:00-მდე თბილისის დროით**. საქართველოში DST არ მოქმედებს — Asia/Tbilisi
 * ფიქსირებული UTC+4-ია, ამიტომ ზღვარი პირდაპირ UTC-ში ითვლება:
 * წინა დღის 10:00 Tbilisi = წინა დღის 06:00 UTC.
 *
 * წმინდა ფუნქციები — გამოიყენება UI-შიც (ღილაკის ჩვენება/დამალვა) და
 * server action-შიც (საბოლოო შემოწმება).
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** 10:00 Tbilisi (UTC+4) = 06:00 UTC */
const DEADLINE_UTC_HOUR = 6;

/** bookingDate — 'YYYY-MM-DD' (bookings.booking_date) */
export function cancellationDeadline(bookingDate: string): Date {
  const dayStartUtc = new Date(`${bookingDate}T00:00:00Z`).getTime();
  return new Date(dayStartUtc - DAY_MS + DEADLINE_UTC_HOUR * HOUR_MS);
}

export function canCancel(bookingDate: string, now: Date = new Date()): boolean {
  return now.getTime() < cancellationDeadline(bookingDate).getTime();
}

/** „14 ივლისი, 10:00-მდე“ — UI-სთვის, თბილისის დროით */
export function formatCancellationDeadline(bookingDate: string): string {
  const deadline = cancellationDeadline(bookingDate);
  const formatted = new Intl.DateTimeFormat("ka-GE", {
    timeZone: "Asia/Tbilisi",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(deadline);
  return `${formatted}-მდე`;
}
