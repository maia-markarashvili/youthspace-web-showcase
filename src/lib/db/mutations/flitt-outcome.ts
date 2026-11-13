import "server-only";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  confirmOrderTarget,
  findOrderByRef,
  type OrderTarget,
} from "@/lib/db/mutations/confirm-order";
import {
  findPaymentByReturnToken,
  recordCallbackPayment,
  type CallbackOutcome,
} from "@/lib/db/mutations/payment";
import { payments } from "@/lib/db/schema";
import { fetchOrderStatus } from "@/lib/flitt";
import { sendMail } from "@/lib/mail";
import { formatGel } from "@/lib/money";
import { notifyOrderRefunded } from "@/lib/notify-customer";
import { checkRateLimit } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";

/**
 * Flitt-ის შედეგის დამუშავების ერთი წყარო ორი არხისთვის:
 *  · server callback (api/flitt/callback/route.ts) — payload ან callback-ის
 *    სხეულია (ხელმოწერა-გავლილი), ან fetchOrderStatus-ის პასუხი (fallback);
 *  · reconcile — სტატუს-გვერდის პოლერი pending-გადახდაზე თვითონ ეკითხება
 *    Flitt-ს, ამიტომ დადასტურება callback-ის მიღწევაზე აღარაა დამოკიდებული.
 *
 * იდემპოტენტურია ბაზის დონეზე: confirm მხოლოდ pending-სტატუსს ეხება,
 * ამიტომ პარალელური არხები ერთმანეთს ვერ დააზიანებენ და მეორე SMS
 * არ იგზავნება.
 */

export type FlittOutcomeResult = "paid" | "failed" | "refunded" | "skipped";

const DEAD_STATUSES = ["cancelled", "expired", "refunded"];

export async function applyFlittOutcome(params: {
  target: OrderTarget;
  payload: Record<string, unknown>;
}): Promise<FlittOutcomeResult> {
  const { target, payload } = params;

  const status = String(payload.order_status ?? "");
  /* processing/created = ჯერ არაფერი გადაწყვეტილა; საბოლოო შედეგი მოგვიანებით */
  if (status === "" || status === "processing" || status === "created") {
    return "skipped";
  }

  const outcome: CallbackOutcome =
    status === "approved"
      ? "paid"
      : status === "reversed"
        ? "refunded"
        : "failed";

  /* თანხის/ვალუტის დამოწმება — გაჟონილ გასაღებს შეზღუდულ ზიანამდე დაიყვანს */
  const amountOk = Number(payload.amount) === target.amountTetri;
  const currencyOk = String(payload.currency ?? "") === "GEL";
  if (outcome === "paid" && (!amountOk || !currencyOk)) {
    console.error(
      `[flitt] თანხა/ვალუტა არ ემთხვევა: ${payload.amount} ${payload.currency} vs ${target.amountTetri} GEL`,
    );
    await recordCallbackPayment({ target, payload, outcome: "failed" });
    return "failed";
  }

  const { previousStatus } = await recordCallbackPayment({
    target,
    payload,
    outcome,
  });

  /* უკუგატარება დადასტურდა → მომხმარებელს ეცნობება, რომ თანხა ბარათზე
     ბრუნდება. მხოლოდ პირველ გადასვლაზე - Flitt-ის განმეორებითი callback
     მეორე SMS-ს ვერ გააგზავნის (fire-and-forget, notify* არ throw-ობს) */
  if (outcome === "refunded" && previousStatus !== "refunded") {
    void notifyOrderRefunded({
      phone: target.phone,
      email: target.email,
      name: target.name,
      orderRef: target.orderRef,
      itemTitle: target.title,
      amountTetri: target.amountTetri,
    });

    /* ფინანსური ბადე: თუ შეკვეთა ჯერ არ გაუქმებულა (active/confirmed/pending),
       მაგრამ თანხა დაბრუნდა - ეს უკუგატარება/chargeback-ია გაუქმების გარეშე:
       მომსახურება (წევრობა/ჯავშანი/პასი) აქტიური რჩება, ხოლო ფული უკან წავიდა.
       ნორმალურ ნაკადში (გააუქმა → მფლობელმა პორტალიდან დააბრუნა) შეკვეთა უკვე
       cancelled-ია და alert არ ისვრება. ხმამაღალი მეილი მფლობელს
       (fire-and-forget - sendMail არ throw-ობს). */
    if (!DEAD_STATUSES.includes(target.status)) {
      console.error(
        `[flitt] !!! REVERSED-ON-${target.status.toUpperCase()} ${target.orderRef}: ` +
          `თანხა დაბრუნდა, მაგრამ შეკვეთა ${target.status}-ია - სერვისი აქტიური რჩება`,
      );
      void sendMail({
        to: siteConfig.email,
        subject: `საყურადღებო: თანხა დაბრუნდა აქტიურ შეკვეთაზე ${target.orderRef}`,
        text:
          `შეკვეთაზე ${target.orderRef} (${target.title}) თანხა ბარათზე უკან დაბრუნდა ` +
          `(უკუგატარება/chargeback), მაგრამ შეკვეთა ჯერ კიდევ "${target.status}"-ია - ` +
          `მომსახურება (წევრობა/ჯავშანი/პასი) აქტიური რჩება.\n\n` +
          `თანხა: ${formatGel(target.amountTetri)}\n` +
          `მყიდველის ტელეფონი: ${target.phone}\n\n` +
          `საჭიროა: შეამოწმე და საჭიროებისამებრ ხელით გააუქმე შეკვეთა ადმინ პანელიდან.`,
      });
    }
  }

  if (outcome === "paid") {
    /* ფინანსური ბადე: paid უკვე გაუქმებულ/ვადაგასულ შეკვეთაზე — ფული
       ჩამოჭრილია, მომსახურება ვერ გააქტიურდება. ხმამაღალი სიგნალი +
       წერილი მფლობელს (fire-and-forget — პასუხს არ აყოვნებს, sendMail
       არასდროს throw-ობს). */
    if (DEAD_STATUSES.includes(target.status)) {
      console.error(
        `[flitt] !!! PAID-ON-${target.status.toUpperCase()} ${target.orderRef}: ` +
          `თანხა ჩამოიჭრა, მაგრამ შეკვეთა ${target.status}-ია - საჭიროა ხელით დაბრუნება`,
      );
      void sendMail({
        to: siteConfig.email,
        subject: `საყურადღებო: გადახდა გაუქმებულ შეკვეთაზე ${target.orderRef}`,
        text:
          `შეკვეთაზე ${target.orderRef} (${target.title}) ბარათით გადახდა შესრულდა, ` +
          `მაგრამ შეკვეთა უკვე "${target.status}" სტატუსშია - მომსახურება არ გააქტიურებულა.\n\n` +
          `თანხა: ${formatGel(target.amountTetri)}\n` +
          `მყიდველის ტელეფონი: ${target.phone}\n\n` +
          `საჭიროა: შეამოწმე Flitt-ის კაბინეტში და ან დაუბრუნე თანხა, ` +
          `ან ხელით აღადგინე შეკვეთა ადმინ პანელიდან.`,
      });
    } else {
      /* იდემპოტენტურია: განმეორებაზე 0 რიგი იცვლება და SMS არ იგზავნება */
      const confirmed = await confirmOrderTarget(target);
      console.info(
        `[flitt] ${target.orderRef} გადახდილია${confirmed ? " - დადასტურდა" : " (უკვე დადასტურებული იყო)"}`,
      );
    }
  } else {
    console.info(`[flitt] ${target.orderRef} → ${status}`);
  }

  return outcome;
}

const DAY_MS = 86_400_000;

/**
 * ბოლოდროინდელი ბარათ-გადახდების სინქრონი Flitt-თან — პორტალიდან
 * დაბრუნების (reversed) დასაჭერად callback-ის გარეშე: Flitt-ის
 * callback-მიწოდება არასაიმედოა (2026-08-27, სატესტო გარემო) და paid→
 * refunded გადასვლა სხვანაირად იკარგებოდა. /admin/orders-ის გახსნაზე
 * ეშვება fire-and-forget-ად; 5 წუთში ერთხელ (throttle), მაქს. 20 გადახდა.
 * იდემპოტენტურია — refunded-ზე მეორედ არაფერი ხდება (recordCallbackPayment
 * previousStatus-ბადე SMS-საც ერთხელ უშვებს).
 */
export async function reconcileRecentPaidCardPayments(
  limit = 20,
): Promise<void> {
  if (
    !checkRateLimit("flitt:refund-sweep", { limit: 1, windowMs: 5 * 60_000 })
  ) {
    return;
  }
  try {
    const rows = await db
      .select({ orderRef: payments.orderRef, rawResponse: payments.rawResponse })
      .from(payments)
      .where(
        and(
          eq(payments.status, "paid"),
          isNotNull(payments.flittPaymentId),
          gte(payments.updatedAt, new Date(Date.now() - 14 * DAY_MS)),
        ),
      )
      .orderBy(desc(payments.updatedAt))
      .limit(limit);

    for (const row of rows) {
      /* Flitt-ის ზუსტი order_id: paid-რიგზე rawResponse callback/status-
         payload-ია (order_id-თი), created-რიგზე — {request:{orderId}} */
      const raw = row.rawResponse as {
        order_id?: unknown;
        request?: { orderId?: unknown };
      } | null;
      const flittOrderId =
        typeof raw?.order_id === "string"
          ? raw.order_id
          : typeof raw?.request?.orderId === "string"
            ? raw.request.orderId
            : row.orderRef;

      const status = await fetchOrderStatus(flittOrderId);
      if (!status || String(status.order_status ?? "") !== "reversed") continue;

      const target = await findOrderByRef(row.orderRef);
      if (!target) continue;
      await applyFlittOutcome({ target, payload: status });
      console.info(`[flitt:sweep] ${row.orderRef} → refunded (პორტალიდან)`);
    }
  } catch (error) {
    console.error("[flitt:sweep] ჩავარდა", error);
  }
}

const RETURN_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * pending-გადახდის აქტიური გადამოწმება Flitt-ში — სტატუს-გვერდის პოლერი
 * იძახებს (POST server action-ით). Flitt-ის callback რომ დაიკარგოს ან
 * დაგვიანდეს, მომხმარებელი დადასტურებას მაინც წამებში იღებს.
 */
export async function reconcilePaymentByReturnToken(
  token: string,
): Promise<void> {
  if (!RETURN_TOKEN_RE.test(token)) return;
  /* პოლერი 3 წამში ერთხელ იძახებს — Flitt-ის API არ დაიბომბოს */
  if (!checkRateLimit(`reconcile:${token}`, { limit: 6 })) return;

  const payment = await findPaymentByReturnToken(token);
  if (!payment || payment.status !== "created") return;

  /* Flitt-ის order_id retry-სუფიქსიანი შეიძლება იყოს — ზუსტი მნიშვნელობა
     checkout-ისას rawResponse.request.orderId-ში ჩაიწერა */
  const raw = payment.rawResponse as { request?: { orderId?: unknown } } | null;
  const flittOrderId =
    typeof raw?.request?.orderId === "string"
      ? raw.request.orderId
      : payment.orderRef;

  const status = await fetchOrderStatus(flittOrderId);
  if (!status) return;

  const target = await findOrderByRef(payment.orderRef);
  if (!target) return;

  await applyFlittOutcome({ target, payload: status });
}
