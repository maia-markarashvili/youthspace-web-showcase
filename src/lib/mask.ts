import { normalizePhoneDigits } from "@/lib/phone";

/**
 * კონტაქტის ნიღბები რეგისტრატორის (`reception`) ეკრანისთვის (§3.4) —
 * სახელი სრულად ჩანს (სწორედ ის დასტურდება ხმამაღლა), ტელეფონი/მეილი კი
 * ნაწილობრივ. სუფთა მოდულია — client-კომპონენტსაც შეუძლია გამოიყენოს.
 */

/** „599112233" → „5** ** 22 33"; ბოლო `visible` ციფრი ჩანს (default 4) */
export function maskPhone(phone: string, visible = 4): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < visible) return "*".repeat(digits.length);

  const hidden = digits.slice(0, -visible);
  const shown = digits.slice(-visible);
  const maskedGroup = hidden.length > 0 ? `${hidden[0]}${"*".repeat(hidden.length - 1)}` : "";
  const shownPairs = shown.match(/.{1,2}/g)?.join(" ") ?? shown;
  return [maskedGroup, shownPairs].filter(Boolean).join(" ");
}

/** „giorgi@gmail.com" → „gi***@gmail.com"; ≤2 სიმბოლოზე — „g*@…" */
export function maskEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  if (!trimmed || !trimmed.includes("@")) return null;

  const [local, domain] = trimmed.split("@");
  if (local.length <= 2) {
    return `${local[0] ?? ""}*@${domain}`;
  }
  return `${local.slice(0, 2)}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
}
