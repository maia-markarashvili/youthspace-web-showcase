import "server-only";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { renderEmailHtml } from "@/lib/mail-template";
import { sendMail } from "@/lib/mail";
import { formatGel } from "@/lib/money";
import { t } from "@/lib/site-texts";
import { siteConfig } from "@/lib/site-config";
import { fillTemplate, sendSms } from "@/lib/sms";
import { ticketUrl, type TicketRef } from "@/lib/ticket-token";

/**
 * მომხმარებლისთვის შეტყობინების გამომძახებელი ნაკადებისთვის — ერთ ადგილას,
 * რომ ყიდვის ყველა action-მა SMS-იც და მეილიც ერთნაირად გამოიძახოს
 * (ცალკე გამომძახებელი წერტილები = არხები ერთმანეთს დაშორდებოდა).
 *
 * არასდროს throw-ობს: ტექსტის წაკითხვაც კი (DB) try-ში ზის, რადგან ყიდვა
 * ამ მომენტისთვის უკვე შესრულებულია და შეტყობინების გამო ტრანზაქცია არ
 * უნდა ჩავარდეს. ორივე არხი დამოუკიდებელია — SMS-ის ჩავარდნა მეილს არ
 * აჩერებს და პირიქით. ცარიელი შაბლონი (SMS) ან ცარიელი სათაური/ტექსტი
 * (მეილი) = ჩუმად გამოტოვება.
 */

/** null/"" ორივე "მეილი არაა" — entryPasses.buyerEmail nullable-ია,
 *  bookings/subscriptions კი "" წერენ, როცა მომხმარებელს არ მიუთითებია */
function sendable(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  return trimmed ? trimmed : null;
}

function myUrl(): string {
  return `${siteConfig.url}/account`;
}

/** {qrUrl}-ის მნიშვნელობა — ჩავარდნაზე ცარიელი სტრიქონი და არა throw:
 *  fillTemplate-ს მნიშვნელობა ყოველთვის უნდა მიუვიდეს, თორემ მეილში
 *  literal „{qrUrl}" დარჩებოდა */
async function qrUrlValue(ticket: TicketRef | null): Promise<string> {
  if (!ticket) return "";
  try {
    return await ticketUrl(ticket.kind, ticket.id, ticket.expiresAt);
  } catch (error) {
    console.error("[ticket] qrUrl ვერ აიგო", error);
    return "";
  }
}

function emailFooter(): string {
  return `${siteConfig.name} · ${siteConfig.phone} · ${siteConfig.address}\nეს წერილი ავტომატურადაა გაგზავნილი შენი შეკვეთის გამო.`;
}

async function sendSmsPart(
  key: string,
  phone: string,
  values: Record<string, string>,
): Promise<boolean> {
  try {
    const texts = await getSiteTexts();
    const template = t(texts, key);
    /* უცნობი key t()-ს key-დვე აბრუნებს — ასეთს არ ვგზავნით */
    if (!template || template === key) return false;
    return await sendSms(phone, fillTemplate(template, values));
  } catch (error) {
    console.error(`[sms] ${key} გამოძახება ჩავარდა`, error);
    return false;
  }
}

async function sendEmailPart(
  subjectKey: string,
  bodyKey: string,
  email: string | null,
  values: Record<string, string>,
): Promise<boolean> {
  if (!email) return false;
  try {
    const texts = await getSiteTexts();
    const subjectTpl = t(texts, subjectKey);
    const bodyTpl = t(texts, bodyKey);
    /* ორივე საჭიროა — ერთის ცარიელობაც კმარა, რომ წერილი არ გაიგზავნოს */
    if (
      !subjectTpl ||
      subjectTpl === subjectKey ||
      !bodyTpl ||
      bodyTpl === bodyKey
    ) {
      return false;
    }
    const subject = fillTemplate(subjectTpl, values);
    const body = fillTemplate(bodyTpl, values);
    return await sendMail({
      to: email,
      subject,
      text: body,
      html: renderEmailHtml({
        body,
        siteUrl: siteConfig.url,
        footer: emailFooter(),
      }),
    });
  } catch (error) {
    console.error(`[mail] ${bodyKey} გამოძახება ჩავარდა`, error);
    return false;
  }
}

/** ყიდვა გაფორმდა, გადახდას ველოდებით */
export async function notifyOrderPending(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  amountTetri: number;
  itemTitle: string;
  bankRequisites?: string | null;
}) {
  const values = {
    name: params.name,
    code: params.orderRef,
    amount: formatGel(params.amountTetri),
    item: params.itemTitle,
    requisites: params.bankRequisites?.trim() || "რეკვიზიტებს მალე მიიღებ",
    myUrl: myUrl(),
  };
  await Promise.all([
    sendSmsPart("sms.order.pending", params.phone, values),
    sendEmailPart(
      "email.order.pending.subject",
      "email.order.pending.body",
      sendable(params.email),
      values,
    ),
  ]);
}

/** ადმინმა გადახდა დაადასტურა — სერვისი აქტიურია */
export async function notifyOrderConfirmed(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  itemTitle: string;
  /** QR-ბილეთის სამიზნე — null მხოლოდ მაშინ, როცა ბილეთი აზრს მოკლებულია */
  ticket: TicketRef | null;
}) {
  const values = {
    name: params.name,
    code: params.orderRef,
    item: params.itemTitle,
    myUrl: myUrl(),
    qrUrl: await qrUrlValue(params.ticket),
  };
  await Promise.all([
    sendSmsPart("sms.order.confirmed", params.phone, values),
    sendEmailPart(
      "email.order.confirmed.subject",
      "email.order.confirmed.body",
      sendable(params.email),
      values,
    ),
  ]);
}

/** პასით ჯავშნის გაუქმება — შესვლა პასს უბრუნდება, ფული არ ფიგურირებს
 *  (0₾-იანი ჯავშანია); ცალკე ტიპია, რომ „თანხა დაგიბრუნდება" არ გაიგზავნოს */
export async function notifyBookingReleased(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  itemTitle: string;
}) {
  const values = {
    name: params.name,
    code: params.orderRef,
    item: params.itemTitle,
    myUrl: myUrl(),
    qrUrl: "",
  };
  await Promise.all([
    sendSmsPart("sms.booking.released", params.phone, values),
    sendEmailPart(
      "email.booking.released.subject",
      "email.booking.released.body",
      sendable(params.email),
      values,
    ),
  ]);
}

/** კაბინეტიდან გაუქმება — დასტური მომხმარებელს (self-cancel.ts-ის მერე) */
export async function notifyOrderCancelled(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  itemTitle: string;
}) {
  const values = {
    name: params.name,
    code: params.orderRef,
    item: params.itemTitle,
    myUrl: myUrl(),
    qrUrl: "",
  };
  await Promise.all([
    sendSmsPart("sms.order.cancelled", params.phone, values),
    sendEmailPart(
      "email.order.cancelled.subject",
      "email.order.cancelled.body",
      sendable(params.email),
      values,
    ),
  ]);
}

/** Flitt-ის უკუგატარება დადასტურდა — თანხა ბარათზე ბრუნდება
 *  (flitt-outcome.ts, მხოლოდ პირველ refunded-გადასვლაზე) */
export async function notifyOrderRefunded(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  itemTitle: string;
  amountTetri: number;
}) {
  const values = {
    name: params.name,
    code: params.orderRef,
    item: params.itemTitle,
    amount: formatGel(params.amountTetri),
    myUrl: myUrl(),
    qrUrl: "",
  };
  await Promise.all([
    sendSmsPart("sms.order.refunded", params.phone, values),
    sendEmailPart(
      "email.order.refunded.subject",
      "email.order.refunded.body",
      sendable(params.email),
      values,
    ),
  ]);
}

/** აბონემენტით დაჯავშნა — მაშინვე დადასტურებულია */
export async function notifyBookingConfirmed(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  date: string;
  slot: string;
  remaining?: number;
  ticket: TicketRef | null;
}) {
  const values = {
    name: params.name,
    code: params.orderRef,
    date: params.date,
    slot: params.slot,
    remaining: String(params.remaining ?? ""),
    myUrl: myUrl(),
    qrUrl: await qrUrlValue(params.ticket),
  };
  await Promise.all([
    sendSmsPart("sms.booking.confirmed", params.phone, values),
    sendEmailPart(
      "email.booking.confirmed.subject",
      "email.booking.confirmed.body",
      sendable(params.email),
      values,
    ),
  ]);
}

/** უფასო რეგისტრაცია (ფასი 0 → ადგილი მაშინვე დადასტურებულია) — გადახდის
 *  ხსენების გარეშე; {date} ცარიელია, თუ თარიღი მითითებული არ არის */
export async function notifyRegistrationConfirmed(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  itemTitle: string;
  /** დაწყების თარიღი (formatDateKa-თი ფორმატირებული) */
  date?: string | null;
  ticket: TicketRef | null;
}) {
  const values = {
    name: params.name,
    code: params.orderRef,
    item: params.itemTitle,
    date: params.date ?? "",
    myUrl: myUrl(),
    qrUrl: await qrUrlValue(params.ticket),
  };
  await Promise.all([
    sendSmsPart("sms.registration.confirmed", params.phone, values),
    sendEmailPart(
      "email.registration.confirmed.subject",
      "email.registration.confirmed.body",
      sendable(params.email),
      values,
    ),
  ]);
}

/**
 * მფლობელის ალერტი ღონისძიების ჯავშნის ყოველ მოვლენაზე — მფლობელმა
 * ყოველთვის უნდა იცოდეს, როდის დაიკავეს ან გაათავისუფლეს სლოტი (გაუქმება
 * სლოტს ავტომატურად ხსნის ხელახლა გასაყიდად, სანამ დროშა ჩართულია).
 * chargeback-ალერტის ანალოგიური პირდაპირი წერილია (რეესტრის გარეშე);
 * არასდროს throw-ობს და პასუხს არ აყოვნებს.
 */
export async function notifyOwnerEvent(params: {
  kind: "created" | "confirmed" | "cancelled" | "conflict";
  orderRef: string;
  date: string;
  slot: string;
  peopleUpTo?: number | null;
  amountTetri?: number | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  /** დამატებითი კონტექსტი (მაგ. კონფლიქტის აღწერა) */
  detail?: string;
}): Promise<void> {
  try {
    const heading = {
      created: "ახალი ღონისძიების ჯავშანი",
      confirmed: "ღონისძიების გადახდა დადასტურდა",
      cancelled: "ღონისძიების ჯავშანი გაუქმდა - სლოტი ისევ იყიდება",
      conflict: "⚠ კონფლიქტი: ორი ჯავშანი ერთ სლოტზე",
    }[params.kind];
    const lines = [
      heading,
      `კოდი: ${params.orderRef}`,
      `თარიღი: ${params.date} · ${params.slot}`,
      params.peopleUpTo ? `დამსწრეები: ${params.peopleUpTo} ადამიანამდე` : "",
      params.amountTetri != null ? `თანხა: ${formatGel(params.amountTetri)}` : "",
      params.buyerName ? `მჯავშნელი: ${params.buyerName}` : "",
      params.buyerPhone ? `ტელეფონი: ${params.buyerPhone}` : "",
      params.detail ?? "",
      params.kind === "cancelled"
        ? "თუ სლოტის ხელახლა გაყიდვა აღარ გინდა, გამორთე დროშა კალენდარში: " +
          `${siteConfig.url}/admin/calendar`
        : `დეტალები: ${siteConfig.url}/admin/orders`,
    ].filter(Boolean);
    void sendMail({
      to: siteConfig.email,
      subject: `${heading} (${params.orderRef})`,
      text: lines.join("\n"),
    });
  } catch (error) {
    console.error("[owner-event] ალერტი ვერ გაიგზავნა", error);
  }
}

/**
 * კურსის განვადება — „თვიური გადასახდელია“ შეხსენება (ადმინის ღილაკი).
 * ავტომატური ჩამოჭრა არ ხდება და გადახდის ბმულსაც განზრახ არ ვგზავნით:
 * მფლობელის წესით ეს მხოლოდ შეხსენებაა, მოქმედება კი ოფლაინ ხდება.
 * ორივე არხის შედეგი ცალ-ცალკე ბრუნდება (იხ. notifyOrderCodeReminder).
 */
export async function notifyInstallmentDue(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  itemTitle: string;
  /** ერთი თვის თანხა — ყიდვის მომენტში დაფიქსირებული (bookings.amount_gel) */
  amountTetri: number;
  monthsPaid: number;
  planMonths: number;
  /** უკვე ფორმატირებული ვადა; ცარიელი = ვადა უცნობია */
  dueDate: string;
}): Promise<{ sms: boolean; email: boolean }> {
  const values = {
    name: params.name,
    code: params.orderRef,
    item: params.itemTitle,
    amount: formatGel(params.amountTetri),
    date: params.dueDate,
    paid: String(params.monthsPaid),
    total: String(params.planMonths),
    next: String(Math.min(params.monthsPaid + 1, params.planMonths)),
    myUrl: myUrl(),
  };
  const [sms, email] = await Promise.all([
    sendSmsPart("sms.installment.due", params.phone, values),
    sendEmailPart(
      "email.installment.due.subject",
      "email.installment.due.body",
      sendable(params.email),
      values,
    ),
  ]);
  return { sms, email };
}

/** ადმინის „კოდის გაგზავნა" ღილაკი /admin/orders-ზე — მომხმარებელს დაავიწყდა.
 *  ორივე არხის შედეგი ცალ-ცალკე ბრუნდება, რომ ადმინმა ზუსტად დაინახოს,
 *  რომელი გაიგზავნა (SMS-ის წარმატება მეილის შედეგზე აღარ „ჩრდილავს"). */
export async function notifyOrderCodeReminder(params: {
  phone: string;
  email?: string | null;
  name: string;
  orderRef: string;
  ticket: TicketRef | null;
}): Promise<{ sms: boolean; email: boolean }> {
  const values = {
    name: params.name,
    code: params.orderRef,
    myUrl: myUrl(),
    qrUrl: await qrUrlValue(params.ticket),
  };
  const [sms, email] = await Promise.all([
    sendSmsPart("sms.code.reminder", params.phone, values),
    sendEmailPart(
      "email.code.reminder.subject",
      "email.code.reminder.body",
      sendable(params.email),
      values,
    ),
  ]);
  return { sms, email };
}
