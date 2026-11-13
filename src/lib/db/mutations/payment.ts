import "server-only";
import { randomUUID } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  findOrderByRef,
  type OrderTarget,
} from "@/lib/db/mutations/confirm-order";
import {
  bookings,
  entryPasses,
  payments,
  subscriptions,
} from "@/lib/db/schema";
import { HOLD_MINUTES, createCheckout } from "@/lib/flitt";
import { siteConfig } from "@/lib/site-config";

/**
 * ბარათით გადახდის მუტაციები — `payments` ცხრილის ერთადერთი მწერი.
 *
 * `payments.updatedAt`-ს `$onUpdate` არ აქვს, ამიტომ ყოველი UPDATE მას
 * ხელით სვამს.
 */

/** ჰოლდის ვადა ახალი ბარათის შეკვეთისთვის */
export function cardHoldExpiry(): Date {
  return new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
}

/** გადმორიცხვის pending ჯავშნის ჰოლდის ვადა — 0 საათი = უვადოდ (null, ძველი ქცევა) */
export function transferHoldExpiry(transferHoldHours: number): Date | null {
  if (!transferHoldHours) return null;
  return new Date(Date.now() + transferHoldHours * 60 * 60 * 1000);
}

/** `payments.{bookingId|subscriptionId|passId}` ტიპის მიხედვით */
function targetColumns(target: OrderTarget) {
  switch (target.kind) {
    case "subscription":
      return { subscriptionId: target.id };
    case "booking":
      return { bookingId: target.id };
    case "pass":
      return { passId: target.id };
  }
}

/**
 * გადახდის სესიის დაწყება. აბრუნებს გადამისამართების URL-ს, ან null-ს —
 * მაშინ ყიდვა გადმორიცხვის ნაკადში რჩება (ჩანაწერი უკვე შექმნილია).
 *
 * `order_id` პირველ ცდაზე = order_ref, ხოლო განმეორებით ცდაზე „-2", „-3"…
 * (Flitt ერთსა და იმავე order_id-ს მეორედ არ იღებს).
 */
export async function startCardPayment(input: {
  orderRef: string;
  amountTetri: number;
  description: string;
  email?: string | null;
}): Promise<string | null> {
  const target = await findOrderByRef(input.orderRef);
  if (!target) return null;

  const [attempts] = await db
    .select({ n: count() })
    .from(payments)
    .where(eq(payments.orderRef, input.orderRef));
  const attempt = attempts?.n ?? 0;
  const flittOrderId =
    attempt === 0 ? input.orderRef : `${input.orderRef}-${attempt + 1}`;

  const returnToken = randomUUID();
  const checkout = await createCheckout({
    orderRef: flittOrderId,
    amountTetri: input.amountTetri,
    description: input.description,
    email: input.email || undefined,
    responseUrl: `${siteConfig.url}/payment/return?t=${returnToken}`,
    callbackUrl: `${siteConfig.url}/api/flitt/callback`,
  });
  if (!checkout) return null;

  await db.insert(payments).values({
    ...targetColumns(target),
    flittPaymentId: checkout.paymentId,
    orderRef: input.orderRef,
    amountGel: input.amountTetri,
    currency: "GEL",
    method: "card",
    status: "created",
    returnToken,
    rawResponse: {
      request: { orderId: flittOrderId, amount: input.amountTetri },
      checkoutUrl: checkout.checkoutUrl,
    },
  });

  return checkout.checkoutUrl;
}

/** ჰოლდის მოხსნა — checkout ვერ შეიქმნა, შეკვეთა გადმორიცხვაზე რჩება */
export async function clearHold(
  orderRef: string,
  kind: OrderTarget["kind"],
): Promise<void> {
  const patch = { holdExpiresAt: null };
  if (kind === "subscription") {
    await db
      .update(subscriptions)
      .set(patch)
      .where(eq(subscriptions.orderRef, orderRef));
  } else if (kind === "booking") {
    await db.update(bookings).set(patch).where(eq(bookings.orderRef, orderRef));
  } else {
    await db
      .update(entryPasses)
      .set(patch)
      .where(eq(entryPasses.orderRef, orderRef));
  }
}

export type CallbackOutcome = "paid" | "failed" | "refunded";

/**
 * callback-ის დაფიქსირება `payments`-ში. ჯერ `flitt_payment_id`-ით ვეძებთ,
 * მერე ამ შეკვეთის უახლეს რიგს; თუ ვერცერთი — ახალი რიგი (Flitt-ის შეტყობინება
 * არასდროს უნდა დაიკარგოს, თუნდაც ჩვენი „created" რიგი აკლდეს).
 * აბრუნებს რიგის **წინა** სტატუსს (null = ახალი რიგი ჩაიწერა) — გამომძახებელი
 * ამით ხვდება, პირველი გადასვლაა თუ Flitt-ის განმეორებითი ცდა (მაგ.
 * refunded-შეტყობინება მომხმარებელს მხოლოდ ერთხელ გაეგზავნოს).
 */
export async function recordCallbackPayment(params: {
  target: OrderTarget;
  payload: Record<string, unknown>;
  outcome: CallbackOutcome;
}): Promise<{ previousStatus: string | null }> {
  const { target, payload, outcome } = params;
  const flittPaymentId =
    typeof payload.payment_id === "string" || typeof payload.payment_id === "number"
      ? String(payload.payment_id)
      : null;
  const amountTetri = Number(payload.amount);

  const patch = {
    status: outcome,
    flittPaymentId,
    method:
      typeof payload.payment_system === "string" ? payload.payment_system : "card",
    rawResponse: payload,
    paidAt: outcome === "paid" ? new Date() : null,
    updatedAt: new Date(),
  };

  const existing = flittPaymentId
    ? await db
        .select({ id: payments.id, status: payments.status })
        .from(payments)
        .where(eq(payments.flittPaymentId, flittPaymentId))
        .limit(1)
    : [];

  const row =
    existing[0] ??
    (
      await db
        .select({ id: payments.id, status: payments.status })
        .from(payments)
        .where(eq(payments.orderRef, target.orderRef))
        .orderBy(desc(payments.createdAt))
        .limit(1)
    )[0];

  if (row) {
    /* დაქვეითების დაცვა: paid რიგს დაგვიანებული failed ვერ გადააწერს
       (refunded კი ლეგიტიმური გადასვლაა — reversal) */
    if (row.status === "paid" && outcome === "failed") {
      console.warn(
        `[flitt:callback] ${target.orderRef}: failed callback უკვე paid რიგზე - იგნორირდება`,
      );
      return { previousStatus: row.status };
    }
    await db.update(payments).set(patch).where(eq(payments.id, row.id));
    return { previousStatus: row.status };
  }

  await db.insert(payments).values({
    ...targetColumns(target),
    orderRef: target.orderRef,
    amountGel: Number.isFinite(amountTetri) ? amountTetri : target.amountTetri,
    currency: typeof payload.currency === "string" ? payload.currency : "GEL",
    ...patch,
  });
  return { previousStatus: null };
}

/** სტატუსის გვერდისთვის — ტოკენით (order_ref საჯაროდ ვრცელდება) */
export async function findPaymentByReturnToken(token: string) {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.returnToken, token))
    .limit(1);
  return row ?? null;
}
