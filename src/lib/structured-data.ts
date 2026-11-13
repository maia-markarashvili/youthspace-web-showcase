import { siteConfig } from "@/lib/site-config";
import { t } from "@/lib/site-texts";

/**
 * მთავარი გვერდის სტრუქტურირებული მონაცემები (schema.org, JSON-LD).
 *
 * რატომ: სწორედ `WebSite`-ის მიხედვით წყვეტს Google, რა სახელით მოიხსენიოს
 * საიტი ძებნის შედეგებში (სათაურის ზემოთ გამოკვეთილი ხაზი), ხოლო
 * `EducationalOrganization` ლოგოსა და სოციალურ პროფილებს აერთიანებს ერთ
 * ბრენდად. ტექსტები იმავე ადმინის ჯგუფიდან მოდის, რაც metadata-ს.
 *
 * წმინდა მოდულია — მხოლოდ სტრიქონს აწყობს (server-only არაა საჭირო).
 */
export function homeJsonLd(texts: ReadonlyMap<string, string>): string {
  const base = siteConfig.url.replace(/\/$/, "");

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: `${base}/`,
        name: siteConfig.name,
        inLanguage: "ka-GE",
        publisher: { "@id": `${base}/#org` },
      },
      {
        "@type": "EducationalOrganization",
        "@id": `${base}/#org`,
        name: t(texts, "seo.og.title"),
        alternateName: siteConfig.name,
        legalName: siteConfig.legalName,
        url: `${base}/`,
        logo: `${base}/icon.png`,
        image: `${base}/icon.png`,
        email: siteConfig.email,
        telephone: siteConfig.phone,
        description: t(texts, "seo.default.description"),
        address: {
          "@type": "PostalAddress",
          addressCountry: "GE",
          addressLocality: "თბილისი",
          streetAddress: siteConfig.address,
        },
        sameAs: [
          siteConfig.social.facebook,
          siteConfig.social.instagram,
          siteConfig.social.tiktok,
          siteConfig.social.youtube,
        ],
      },
    ],
  };

  /* `<` escape — ადმინიდან შეყვანილმა ტექსტმა script-ტეგი ვერ უნდა დახუროს */
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
