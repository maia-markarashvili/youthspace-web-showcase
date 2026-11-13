/**
 * საიტის საჯარო კონსტანტები — გამოიყენება სერვერზეც და კლიენტზეც.
 * ეს არ არის პროდუქტის/ფასის მონაცემი (ის ყოველთვის DB-დან მოდის, PRD §5).
 */

/** NEXT_PUBLIC_SITE_URL სქემის გარეშეც მუშაობს (მაგ. Railway-ს დომენი) —
 *  new URL() სქემის გარეშე ვარდება და build-ს აგდებდა */
function normalizeSiteUrl(raw: string | undefined): string {
  const value = (raw || "http://localhost:3000").trim().replace(/\/$/, "");
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

export const siteConfig = {
  name: "სივრცე",
  fullName: "სივრცე ახალგაზრდების განვითარებისთვის",
  /** იურიდიული პირი (youthspace.ge-ის დოკუმენტებიდან) */
  legalName: "შპს „სივრცე ახალგაზრდების განვითარებისთვის“",
  legalId: "400150778",
  slogan: "გართობა · ურთიერთობა · განვითარება",
  description:
    "სივრცე ახალგაზრდების განვითარებისთვის - პრაქტიკული გამოცდილება, რეალური ჩართულობა და კრიტიკული აზროვნება.",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  email: "info@youthspace.ge",
  /** ტელეფონი და მისამართი — facebook.com/YouthSpace.ge-ის About სექციიდან */
  phone: "+995 555 11 31 11",
  address: "თბილისი, გლდანი, ილია ვეკუას ქ. 16ა",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  social: {
    facebook: "https://www.facebook.com/YouthSpace.ge/",
    instagram: "https://www.instagram.com/youthspace.ge",
    tiktok: "https://www.tiktok.com/@youthspace.ge",
    youtube: "https://www.youtube.com/channel/UC1MIFEKt6EZXN6-AK3UpZaA",
  },
} as const;

export function whatsappLink(message?: string) {
  if (!siteConfig.whatsappNumber) return null;
  const base = `https://wa.me/${siteConfig.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
