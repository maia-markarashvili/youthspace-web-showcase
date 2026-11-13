import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { t } from "@/lib/site-texts";
import { PartnerForm } from "./partner-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "partner.seo.title"),
    description: t(texts, "partner.seo.description"),
  };
}

/** §5.6 — ერთადერთი enquiry ფორმა საიტზე */
export default async function PartnerPage() {
  const texts = await getSiteTexts();
  const steps = [1, 2, 3].map((i) => ({
    title: t(texts, `partner.steps.${i}.title`),
    text: t(texts, `partner.steps.${i}.text`),
  }));

  return (
    <Section tone="cream">
      <div className="max-w-3xl">
        <p className="eyebrow">{t(texts, "partner.hero.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">
          {t(texts, "partner.hero.title")}
        </h1>
        <p className="mt-4 text-lead text-ink-muted">
          {t(texts, "partner.hero.lead")}
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <p className="eyebrow">{index + 1}</p>
            <h2 className="mt-2 text-h3 font-bold text-green-dark">
              {step.title}
            </h2>
            <p className="mt-3 leading-8 text-ink-muted">{step.text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-12 max-w-3xl">
        <h2 className="text-h2 font-bold text-green-dark">
          {t(texts, "partner.form.title")}
        </h2>
        <p className="mt-3 text-ink-muted">{t(texts, "partner.form.text")}</p>
        <Card className="mt-6">
          <PartnerForm />
        </Card>
      </div>
    </Section>
  );
}
