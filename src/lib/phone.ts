/**
 * ტელეფონის ნომრის ნორმალიზაცია შედარებისთვის: მხოლოდ ციფრები, ბოლო 9
 * (ქართული ნომრის სიგრძე ქვეყნის კოდის გარეშე). „+995 599 11 22 33“,
 * „599112233“ და „599-11-22-33“ ერთსა და იმავე მნიშვნელობას აბრუნებს.
 */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-9);
}

/**
 * საერთაშორისო ფორმატი SMS-გამგზავნისთვის: „995XXXXXXXXX“ (+-ისა და 00-ის
 * გარეშე — ubill სწორედ ასე ითხოვს). null, თუ ნომერი ქართულ მობილურს არ
 * ჰგავს (9 ციფრი, იწყება 5-ით) — არასწორ ნომერზე გაგზავნა ფულის ხარჯვაა.
 */
export function toGeorgianMsisdn(phone: string): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length !== 9 || !digits.startsWith("5")) return null;
  return `995${digits}`;
}
