import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { siteConfig, whatsappLink } from "@/lib/site-config";
import { t } from "@/lib/site-texts";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "contact.seo.title"),
    description: t(texts, "contact.seo.description"),
  };
}

export default async function ContactPage() {
  const texts = await getSiteTexts();
  const whatsapp = whatsappLink(t(texts, "contact.whatsapp.prefill"));

  return (
    <Section tone="cream">
      <div className="max-w-3xl">
        <p className="eyebrow">{t(texts, "contact.hero.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">
          {t(texts, "contact.hero.title")}
        </h1>
        <p className="mt-4 text-lead text-ink-muted">
          {t(texts, "contact.hero.lead")}
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-start">
        <Card>
          <ContactForm />
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <p className="eyebrow">{t(texts, "contact.direct.eyebrow")}</p>
            <div className="mt-4 flex flex-col gap-3 text-ink">
              <a
                href={`mailto:${siteConfig.email}`}
                className="font-semibold text-green-dark hover:underline"
              >
                {siteConfig.email}
              </a>
              <a
                href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                className="font-semibold text-green-dark hover:underline"
              >
                {siteConfig.phone}
              </a>
              <span>{siteConfig.address}</span>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-green-dark hover:underline"
                >
                  {t(texts, "contact.direct.whatsapp")}
                </a>
              ) : null}
            </div>
          </Card>

          <Card>
            <p className="eyebrow">{t(texts, "contact.follow.eyebrow")}</p>
            <p className="mt-3 text-sm leading-7 text-ink-muted">
              {t(texts, "contact.follow.text")}
            </p>
            <div className="mt-4 flex flex-col gap-3 text-ink">
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
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-green-dark hover:underline"
                >
                  {label} →
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Section>
  );
}
