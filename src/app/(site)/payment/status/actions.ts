"use server";

import { reconcilePaymentByReturnToken } from "@/lib/db/mutations/flitt-outcome";

/**
 * პოლერის აქტიური გადამოწმება — pending-გადახდაზე სტატუსი პირდაპირ
 * Flitt-ს ეკითხება, ამიტომ დადასტურება callback-ის მიღწევაზე აღარაა
 * დამოკიდებული. token საიდუმლოა (uuid, payments.return_token) და შიგნით
 * rate-limit-იც ადევს. ⚠ მხოლოდ async ფუნქციების ექსპორტი.
 */
export async function reconcilePayment(token: unknown): Promise<void> {
  if (typeof token !== "string" || token.length === 0 || token.length > 64) {
    return;
  }
  try {
    await reconcilePaymentByReturnToken(token);
  } catch (error) {
    /* გვერდის განახლებას არ ვამტვრევთ — შემდეგი ტიკი ისევ სცდის */
    console.error("[payment:reconcile] ჩავარდა", error);
  }
}
