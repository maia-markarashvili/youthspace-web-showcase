import { revalidatePath } from "next/cache";
import { findOrderByRef } from "@/lib/db/mutations/confirm-order";
import { applyFlittOutcome } from "@/lib/db/mutations/flitt-outcome";
import { serverEnv } from "@/lib/env";
import {
  FLITT_CALLBACK_IPS,
  fetchOrderStatus,
  parseOrderId,
  verifyCallbackSignature,
} from "@/lib/flitt";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Flitt-ის server-to-server callback — გადახდის შედეგის ერთადერთი სანდო წყარო
 * (ბრაუზერის დაბრუნებას არ ვენდობით).
 *
 * **HTTP 200 ბრუნდება ყოველთვის, როცა შეტყობინება დამუშავდა** — მათ შორის
 * უარყოფილ გადახდაზე, არასწორ ხელმოწერაზე და უცნობ შეკვეთაზე. მიზეზი:
 * Flitt არა-200-ს ხელახლა ცდის 2, 60, 300, 600, 3600 და 86400 წამში, ხოლო
 * ამ შემთხვევებს ხელახალი ცდა ვერაფერს შველის. 500 მხოლოდ დროებით
 * შეფერხებაზე (ბაზა) — მაშინ ხელახალი ცდა აზრიანია.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const env = serverEnv();
  const secret = env.FLITT_SECRET_KEY;

  if (!secret) {
    console.error("[flitt:callback] FLITT_SECRET_KEY არ არის - იგნორირდება");
    return new Response("OK", { status: 200 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    console.error("[flitt:callback] სხეული JSON არ არის");
    return new Response("OK", { status: 200 });
  }

  /* IP მხოლოდ დამატებითი ფენაა — ნამდვილი ავთენტიფიკაცია ხელმოწერაა.
     წყარო clientIp()-ია (cf-connecting-ip → XFF-ის ბოლო რგოლი): XFF-ის
     პირველი რგოლი კლიენტის გაყალბებადია (rate-limit.ts-ის აუდიტ-კომენტარი),
     დომენი კი მხოლოდ Cloudflare-ს გავლით მუშაობს, ამიტომ cf-connecting-ip
     ყოველთვის გამგზავნის რეალური IP-ა */
  const sourceIp = await clientIp();
  const fromKnownFlitt = Boolean(sourceIp) && FLITT_CALLBACK_IPS.includes(sourceIp);
  if (!sourceIp || sourceIp === "unknown") {
    console.warn("[flitt:callback] წყაროს IP ვერ დადგინდა");
  } else if (!fromKnownFlitt) {
    if (env.FLITT_ENFORCE_IP === "1") {
      console.error(`[flitt:callback] უცნობი IP უარყოფილია: ${sourceIp}`);
      return new Response("OK", { status: 200 });
    }
    console.warn(`[flitt:callback] მოულოდნელი IP: ${sourceIp}`);
  }

  if (!verifyCallbackSignature(payload, secret)) {
    /* 2026-08-27: რეალურ (ლაივ) callback-ებზე ხელმოწერის ველების ნაკრები
       დოკუმენტაციას აცდენილია და ვერიფიკაცია ვერ გადის. payload-ს აღარ
       ვენდობით: order_id მხოლოდ მინიშნებაა, სტატუსი კი პირდაპირ Flitt-ს
       ეკითხება ჩვენივე ხელმოწერილი მოთხოვნით (fetchOrderStatus) — ეს არხი
       გაყალბებას გამორიცხავს: ყალბი POST მაქსიმუმ იმას მიაღწევს, რომ
       Flitt-ის ნამდვილი მდგომარეობა დასინქრონდეს. */
    const keys = Object.keys(payload).sort().join(",");
    console.warn(
      `[flitt:callback] ხელმოწერა არ ემთხვევა - გადამოწმება status API-თ (ველები: ${keys})`,
    );

    const rawOrderId = String(payload.order_id ?? "");
    if (!parseOrderId(rawOrderId)) {
      return new Response("OK", { status: 200 });
    }
    /* ლიმიტი per-IP — ყალბი POST-ებით Flitt-ის API არ დაიბომბოს. ნამდვილი
       Flitt-IP-ები ცალკე, უხვ ბუკეტშია (ლაივზე ყველა callback ამ გზას გადის),
       უცნობი წყაროები კი მკაცრ per-IP ბუკეტში — ასე ერთი გამყალბებელი ვერ
       ამოწურავს ნამდვილი callback-ის ბიუჯეტს. გადაჭარბებაზე 500, რომ Flitt-მა
       მოგვიანებით სცადოს. */
    const fallbackKey = fromKnownFlitt
      ? "flitt:status-fallback:flitt"
      : `flitt:status-fallback:${sourceIp || "unknown"}`;
    const fallbackLimit = fromKnownFlitt ? 120 : 10;
    if (!checkRateLimit(fallbackKey, { limit: fallbackLimit })) {
      console.error("[flitt:callback] status-fallback ლიმიტი ამოიწურა");
      return new Response("retry", { status: 500 });
    }
    const status = await fetchOrderStatus(rawOrderId);
    if (!status) {
      console.error(
        `[flitt:callback] status API-მაც ვერ დაადასტურა: ${rawOrderId}`,
      );
      return new Response("OK", { status: 200 });
    }
    payload = status;
  }

  if (
    env.FLITT_MERCHANT_ID &&
    String(payload.merchant_id) !== String(env.FLITT_MERCHANT_ID)
  ) {
    console.error(`[flitt:callback] სხვისი merchant_id: ${payload.merchant_id}`);
    return new Response("OK", { status: 200 });
  }

  const orderRef = parseOrderId(String(payload.order_id ?? ""));
  if (!orderRef) {
    console.error(`[flitt:callback] order_id გაურკვეველია: ${payload.order_id}`);
    return new Response("OK", { status: 200 });
  }

  try {
    const target = await findOrderByRef(orderRef);
    if (!target) {
      console.error(`[flitt:callback] შეკვეთა ვერ მოიძებნა: ${orderRef}`);
      return new Response("OK", { status: 200 });
    }

    /* დამუშავება საზიარო პროცესორშია (flitt-outcome.ts) — იგივე ლოგიკა
       სტატუს-გვერდის reconcile-საც ემსახურება */
    await applyFlittOutcome({ target, payload });

    try {
      revalidatePath("/admin/orders");
    } catch {
      /* revalidate-ის ჩავარდნა callback-ს არ ამტვრევს */
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    /* დროებითი შეფერხება — Flitt-ის ხელახალი ცდა აზრიანია */
    console.error("[flitt:callback] დამუშავება ჩავარდა", error);
    return new Response("retry", { status: 500 });
  }
}
