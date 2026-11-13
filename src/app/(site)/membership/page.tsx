import type { Metadata } from "next";
import { PricingOffers } from "@/components/pricing-offers";
import { Card } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { getPricingSettings } from "@/lib/db/queries/availability";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

/**
 * „პაკეტები და ფასები" — სამი შეთავაზება: ერთჯერადი შესვლა · 4-ჯერადი შესვლა ·
 * კლუბის წევრობა. ბადე საზიარო კომპონენტშია (PricingOffers) — მთავარი გვერდიც
 * ზუსტად ამას აჩვენებს. ყიდვა → /drop-in და /clubs.
 */

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "membership.seo.title"),
    description: t(texts, "membership.seo.description"),
  };
}

export default async function MembershipPage() {
  const [settings, texts] = await Promise.all([
    getPricingSettings(),
    getSiteTexts(),
  ]);

  return (
    <>
      {/* 1 — სამი შეთავაზება */}
      <Section tone="cream">
        <div className="max-w-3xl">
          <p className="eyebrow">{t(texts, "membership.hero.eyebrow")}</p>
          <h1 className="mt-3 text-h1 font-bold text-green-dark">
            {t(texts, "membership.hero.title")}
          </h1>
          <p className="mt-4 text-lead text-ink-muted">
            {t(texts, "membership.hero.lead")}
          </p>
        </div>

        <div className="mt-10">
          <PricingOffers settings={settings} texts={texts} />
        </div>
      </Section>

      {/* 2 — მეგობრის კოდი */}
      {settings.referralDiscountPercent > 0 ? (
        <Section tone="white">
          <SectionHeader
            eyebrow={t(texts, "membership.referral.eyebrow")}
            title={t(texts, "membership.referral.title")}
          />
          <Card className="max-w-2xl">
            <p className="leading-8 text-ink">
              {t(texts, "membership.referral.body").replaceAll(
                "{percent}",
                String(settings.referralDiscountPercent),
              )}
            </p>
          </Card>
        </Section>
      ) : null}

      {/* 3 — განრიგის შენიშვნა */}
      <Section tone="cream">
        <Card className="max-w-2xl">
          <p className="eyebrow">{t(texts, "membership.slots.eyebrow")}</p>
          <p className="mt-3 leading-8 text-ink">
            {t(texts, "membership.slots.note")}
          </p>
        </Card>
      </Section>
    </>
  );
}
