import { canCancel, formatCancellationDeadline } from "@/lib/booking-rules";

/**
 * კაბინეტიდან გაუქმების წესები — ხელშეკრულების §2-ის ერთი წყარო query-სა
 * (account.ts, ღილაკის ჩვენება) და action-ისთვის (self-cancel.ts, საბოლოო
 * შემოწმება): **წინა დღის 10:00-მდე უქმდება ის, რისი სარგებლობის ვადა ჯერ
 * არ დაწყებულა**. წმინდა ფუნქციებია (server-only არაა).
 *
 * ტიპობრივი „სარგებლობის დაწყება":
 *  · dropin/space ჯავშანი — bookingDate (ვიზიტის დღე);
 *  · კურსი — courses.startDate (bookingDate ყიდვის დღეა!); უთარიღო კურსი
 *    ონლაინ არ უქმდება (მფლობელის გადაწყვეტილება, 2026-08-27);
 *  · კლუბი — სეზონის დაწყებამდე (ყველა არჩეული კლუბის startDate მომავალშია);
 *    დაწყებულ წევრობაზე §3 მოქმედებს (თვე ბოლომდე, არ ბრუნდება);
 *  · ნაყიდი პასი — **პირველ ვიზიტამდე** (2026-08-29): შემდგარი ვიზიტი
 *    (occupying ჯავშანი bookingDate<=დღეს) გაუქმებას კეტავს; მომავალი
 *    ჯავშნები ვადას აწესებს (უახლოესის წინა დღის 10:00) და გაუქმებისას
 *    კასკადით უქმდება (0₾-იანებია). ბონუს-პასი ცალკე არასდროს
 *    (კლუბთან ერთად უქმდება კასკადით).
 */

export type CancelCheck = {
  cancellable: boolean;
  /** „14 ივლისი, 10:00-მდე" / „სანამ შესვლას გამოიყენებ" */
  hint: string | null;
};

const NOT_CANCELLABLE: CancelCheck = { cancellable: false, hint: null };

const BOOKING_ACTIVE = ["pending", "confirmed"];
const SUB_ACTIVE = ["pending", "active"];

/** dropin/space/კურსი — usageStartDate: ვიზიტის ან კურსის დაწყების დღე;
 *  null = დაწყების თარიღი უცნობია → ონლაინ არ უქმდება */
export function bookingCancelCheck(
  status: string,
  usageStartDate: string | null,
  now?: Date,
): CancelCheck {
  if (!BOOKING_ACTIVE.includes(status)) return NOT_CANCELLABLE;
  if (!usageStartDate) return NOT_CANCELLABLE;
  if (!canCancel(usageStartDate, now)) return NOT_CANCELLABLE;
  return {
    cancellable: true,
    hint: formatCancellationDeadline(usageStartDate),
  };
}

/** კლუბ-გამოწერა — startDates: არჩეული კლუბების startDate-ები */
export function clubCancelCheck(
  status: string,
  startDates: (string | null)[],
  todayISO: string,
  now?: Date,
): CancelCheck {
  if (!SUB_ACTIVE.includes(status)) return NOT_CANCELLABLE;
  if (startDates.length === 0) return NOT_CANCELLABLE;
  if (!startDates.every((date) => date !== null && date > todayISO)) {
    return NOT_CANCELLABLE;
  }
  const earliest = (startDates as string[]).reduce((a, b) => (a < b ? a : b));
  if (!canCancel(earliest, now)) return NOT_CANCELLABLE;
  return { cancellable: true, hint: formatCancellationDeadline(earliest) };
}

/** ნაყიდი ოთხჯერადი პასი — პირველ ვიზიტამდე */
export function passCancelCheck(
  status: string,
  expired: boolean,
  /** occupying ჯავშნები bookingDate <= დღეს (ვიზიტი შედგა/მიმდინარეობს) */
  consumedEntries: number,
  /** ყველაზე ადრეული მომავალი occupying ჯავშნის თარიღი; null = არ არის */
  earliestUpcomingISO: string | null,
  isBonus: boolean,
  now?: Date,
): CancelCheck {
  if (isBonus || expired || consumedEntries > 0) return NOT_CANCELLABLE;
  if (!SUB_ACTIVE.includes(status)) return NOT_CANCELLABLE;
  if (earliestUpcomingISO) {
    if (!canCancel(earliestUpcomingISO, now)) return NOT_CANCELLABLE;
    return {
      cancellable: true,
      hint: formatCancellationDeadline(earliestUpcomingISO),
    };
  }
  return { cancellable: true, hint: "პირველ ვიზიტამდე" };
}
