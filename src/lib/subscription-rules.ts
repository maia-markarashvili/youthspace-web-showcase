/**
 * კლუბ-გამოწერის ფაზა grace-ფანჯრის მიხედვით (წმინდა ფუნქციები — UI+server):
 *  · active  — ვადა ჯერ არ გასულა (ან ჯერ არ დადგენილა)
 *  · grace   — ვადა გავიდა, მაგრამ ადგილი შენახულია (renewalGraceDays);
 *              განახლებისას ახალი თვე ითვლება ძველი ვადიდან, არა გადახდის დღიდან
 *  · expired — გრეისიც ამოიწურა, ადგილი გათავისუფლდა
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionPhase = "active" | "grace" | "expired";

export function graceEndDate(periodEnd: Date, graceDays: number): Date {
  return new Date(periodEnd.getTime() + graceDays * DAY_MS);
}

export function subscriptionPhase(
  currentPeriodEnd: Date | null,
  graceDays: number,
  now: Date = new Date(),
): SubscriptionPhase {
  if (!currentPeriodEnd) return "active";
  if (now.getTime() <= currentPeriodEnd.getTime()) return "active";
  if (now.getTime() <= graceEndDate(currentPeriodEnd, graceDays).getTime()) {
    return "grace";
  }
  return "expired";
}

/** „14 ივლისი, 2026“ — თბილისის დროით */
export function formatDateKa(value: Date): string {
  return new Intl.DateTimeFormat("ka-GE", {
    timeZone: "Asia/Tbilisi",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}
