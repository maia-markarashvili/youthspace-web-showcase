import Link from "next/link";
import { CookieSettingsLink } from "@/components/cookie-settings-link";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { siteConfig, whatsappLink } from "@/lib/site-config";
import { t } from "@/lib/site-texts";
import {
  ApplePayMark,
  GooglePayMark,
  MastercardMark,
  VisaMark,
} from "./card-brand-marks";
import { LogoMark } from "./logo";
import { NewsletterForm } from "./newsletter-form";

/** ფუტერი — სამივე მიმართულება; B2B **ცალკე სვეტში** (§3).
    ლეიბლები ტექსტების რეესტრიდან, hrefs/სტრუქტურა კოდში რჩება */
const COLUMNS = [
  {
    titleKey: "menu.footer.col1.title",
    links: [
      { href: "/clubs", labelKey: "menu.footer.link.clubs" },
      { href: "/courses", labelKey: "menu.footer.link.courses" },
      { href: "/membership", labelKey: "menu.footer.link.membership" },
      { href: "/drop-in", labelKey: "menu.footer.link.dropin" },
      { href: "/tests", labelKey: "menu.footer.link.tests" },
    ],
  },
  {
    titleKey: "menu.footer.col2.title",
    links: [
      { href: "/spaces", labelKey: "menu.footer.link.spaces" },
      { href: "/partner", labelKey: "menu.footer.link.partner" },
    ],
  },
  {
    titleKey: "menu.footer.col3.title",
    links: [
      { href: "/about", labelKey: "menu.footer.link.about" },
      { href: "/stories", labelKey: "menu.footer.link.stories" },
      { href: "/account", labelKey: "menu.footer.link.my" },
      { href: "/contact", labelKey: "menu.footer.link.contact" },
      { href: "/terms", labelKey: "menu.footer.link.terms" },
      { href: "/privacy", labelKey: "menu.footer.link.privacy" },
    ],
  },
];

export async function Footer() {
  const texts = await getSiteTexts();
  const whatsapp = whatsappLink(t(texts, "menu.footer.whatsapp.prefill"));

  return (
    <footer className="border-t border-line bg-white">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="flex items-center gap-2 text-xl font-bold text-ink">
            <LogoMark className="h-7 w-auto" />
            {siteConfig.name}
          </p>
          <p className="mt-1 text-sm font-semibold tracking-wide text-green-mid">
            {siteConfig.slogan}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-ink-muted">
            {siteConfig.description}
          </p>

          <div className="mt-6">
            <p className="text-sm font-semibold text-ink">
              {t(texts, "menu.footer.newsletter.title")}
            </p>
            <div className="mt-2 max-w-sm">
              <NewsletterForm source="footer" />
            </div>
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.titleKey}>
            <p className="text-sm font-bold text-green-dark">
              {t(texts, column.titleKey)}
            </p>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-ink-muted">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-green-dark">
                    {t(texts, link.labelKey)}
                  </Link>
                </li>
              ))}
              {column.titleKey === "menu.footer.col3.title" ? (
                <li>
                  {/* ეტაპი 5: თანხმობის გამოხმობა ერთი კლიკით */}
                  <CookieSettingsLink label="Cookie ფაილების პარამეტრები" />
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <a href={`mailto:${siteConfig.email}`} className="hover:text-green-dark">
              {siteConfig.email}
            </a>
            {siteConfig.address ? <span>{siteConfig.address}</span> : null}
            <span className="text-xs">
              {siteConfig.legalName} · ს.კ. {siteConfig.legalId}
            </span>
            <div
              className="mt-1 flex items-center gap-2"
              aria-label="მიიღება ბარათები"
            >
              <VisaMark className="h-6 w-auto" />
              <MastercardMark className="h-6 w-auto" />
              <ApplePayMark className="h-6 w-auto" />
              <GooglePayMark className="h-6 w-auto" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {(
              [
                ["Facebook", siteConfig.social.facebook],
                ["Instagram", siteConfig.social.instagram],
                ["TikTok", siteConfig.social.tiktok],
                ["YouTube", siteConfig.social.youtube],
              ] as const
            ).map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="hover:text-green-dark"
                rel="noopener noreferrer"
                target="_blank"
              >
                {label}
              </a>
            ))}
            {whatsapp ? (
              <a
                href={whatsapp}
                className="hover:text-green-dark"
                rel="noopener noreferrer"
                target="_blank"
              >
                WhatsApp
              </a>
            ) : null}
            <span>© {new Date().getFullYear()} {siteConfig.name}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
