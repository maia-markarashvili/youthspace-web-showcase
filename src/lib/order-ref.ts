import { randomInt } from "node:crypto";

/**
 * შეკვეთის მოკლე კოდი — ტელეფონთან ერთად მომხმარებლის იდენტიფიკატორი
 * (კაბინეტში ნახვა/გაუქმება, desk-ძებნა). პრეფიქსი პროდუქტის ტიპს აჩვენებს
 * (2026-08-27, მფლობელის მოთხოვნა): CLB კლუბი, CRS კურსი, CWK ოთხჯერადი
 * პასი, PSS ერთჯერადი შესვლა, SPC სივრცე. ძველი SIV-კოდები ბაზაშია და
 * ყველა ვალიდატორი მათაც იღებს.
 *
 * ⚠ **უსაფრთხოების ინვარიანტი: მარტო კოდი არაფერს აძლევს.** desk-ის ძებნაც,
 * პასით ჯავშნაც (`bookWithPass`) და გაუქმებაც კოდ **და**
 * ტელეფონს ერთად ითხოვს. კლუბის გამოწერის კოდი ამავე დროს მეგობრის
 * მოსაწვევი კოდია, ანუ საჯაროდ ზიარდება — თუ ოდესმე კოდ-ონლი ძებნა
 * დაემატება, ეს გახდება ანგარიშის მითვისების გზა.
 */

export type OrderRefKind = "club" | "course" | "pass4" | "entry" | "space";

const PREFIX: Record<OrderRefKind, string> = {
  club: "CLB",
  course: "CRS",
  pass4: "CWK",
  entry: "PSS",
  space: "SPC",
};

/** ყველა მოქმედი პრეფიქსი — ვალიდატორები (desk, კაბინეტი, flitt) ამას იყენებენ.
 *  SIV ძველი, ერთიანი ფორმატია (ბაზაში არსებული კოდები/რეფერალები). */
export const ORDER_REF_PREFIXES = [
  ...Object.values(PREFIX),
  "SIV",
] as readonly string[];

export function generateOrderRef(kind: OrderRefKind): string {
  return `${PREFIX[kind]}-${randomInt(10000, 100000)}`;
}

/**
 * უნიკალური კოდი — თითო პრეფიქსზე 90 000 შესაძლო მნიშვნელობაა და კლუბის
 * ყიდვა ერთდროულად ორ ცხრილში წერს (გამოწერა + ბონუს-პასი იმავე კოდით),
 * ამიტომ კოლიზია რეალურია. `exists` ამოწმებს ბაზაში; 3 ცდის შემდეგ ბოლო
 * კოდი ბრუნდება და ჩაწერას unique-შეზღუდვა დაიცავს.
 */
export async function generateUniqueOrderRef(
  exists: (candidate: string) => Promise<boolean>,
  kind: OrderRefKind,
  attempts = 3,
): Promise<string> {
  let candidate = generateOrderRef(kind);
  for (let i = 0; i < attempts; i++) {
    if (!(await exists(candidate))) return candidate;
    candidate = generateOrderRef(kind);
  }
  return candidate;
}
