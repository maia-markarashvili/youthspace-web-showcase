import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * n8n ავტომატიზაციის ტრიგერი (PRD §8).
 *
 * Fire-and-forget — ჩავარდნა მომხმარებლის ნაკადს **არ ბლოკავს** (retry n8n-ში).
 * `N8N_WEBHOOK_URL`-ის არარსებობისას no-op-ია, ამიტომ credentials-ის მოსვლამდე
 * აპლიკაცია სრულად მუშაობს.
 */
export type N8nEvent =
  | "booking_paid"
  | "subscription_started"
  | "subscription_renewal_due"
  | "subscription_renewed"
  | "subscription_expired"
  | "booking_refunded"
  | "member_otp"
  | "b2b_partner"
  | "contact"
  | "newsletter"
  | "registration";

export type N8nPayload = {
  name?: string;
  email?: string;
  phone?: string;
  order_ref?: string;
  amount_gel?: number;
  item_title?: string;
  ref_id?: string;
  [key: string]: unknown;
};

export async function notify(event: N8nEvent, data: N8nPayload) {
  const { N8N_WEBHOOK_URL, N8N_SECRET } = serverEnv();

  if (!N8N_WEBHOOK_URL) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[n8n:noop] ${event}`, data);
    }
    return;
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(N8N_SECRET ? { "x-n8n-secret": N8N_SECRET } : {}),
      },
      body: JSON.stringify({ event, secret: N8N_SECRET ?? "", data }),
      // ჩავარდნა UX-ს არ ბლოკავს
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`[n8n] ${event} → HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`[n8n] ${event} ჩავარდა`, error);
  }
}
