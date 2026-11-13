import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "about.seo.title"),
    description: t(texts, "about.seo.description"),
  };
}

export default async function AboutPage() {
  const texts = await getSiteTexts();

  /* პირველი 100 დღის შედეგები — facebook.com/YouthSpace.ge-ის შეჯამებიდან */
  const first100Days = [1, 2, 3, 4].map((i) => ({
    value: t(texts, `about.stats.${i}.value`),
    label: t(texts, `about.stats.${i}.label`),
  }));

  /* ტექსტები youthspace.ge-დან — სამი ღირებულების რეალური განმარტებები */
  const values = [1, 2, 3].map((i) => ({
    title: t(texts, `about.values.${i}.title`),
    text: t(texts, `about.values.${i}.text`),
  }));

  /* youthspace.ge — „ვისთვის არის სივრცე?" (ასაკი დაზუსტებულია: 13–18) */
  const audiences = [1, 2, 3].map((i) => ({
    title: t(texts, `about.audiences.${i}.title`),
    text: t(texts, `about.audiences.${i}.text`),
  }));

  return (
    <>
      <Section tone="cream">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow">{t(texts, "about.hero.eyebrow")}</p>
            <h1 className="mt-3 text-h1 font-bold text-green-dark">
              {t(texts, "about.hero.title")}
            </h1>
            <div className="mt-6 flex flex-col gap-5 text-lead leading-9 text-ink">
              <p>{t(texts, "about.hero.p1")}</p>
              <p>{t(texts, "about.hero.p2")}</p>
              <p>{t(texts, "about.hero.p3")}</p>
            </div>
          </div>

          <div>
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-card shadow-card">
              <Image
                src={t(texts, "about.image")}
                alt={t(texts, "about.image.alt")}
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {first100Days.map((stat) => (
                <div key={stat.label} className="rounded-card bg-white p-4">
                  <p className="text-h3 font-bold text-green-dark">
                    {stat.value}
                  </p>
                  <p className="text-sm text-ink-muted">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {t(texts, "about.stats.caption")}
            </p>
          </div>
        </div>
      </Section>

      <Section tone="white">
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">{t(texts, "about.audiences.eyebrow")}</p>
          <h2 className="mt-2 text-h2 font-bold text-green-dark">
            {t(texts, "about.audiences.title")}
          </h2>
          <p className="mt-3 text-lead text-ink-muted">
            {t(texts, "about.audiences.lead")}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {audiences.map((audience) => (
            <Card key={audience.title}>
              <h3 className="text-h3 font-bold text-green-dark">
                {audience.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-ink-muted">
                {audience.text}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="cream">
        <h2 className="text-h2 font-bold text-green-dark">
          {t(texts, "about.values.title")}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {values.map((value) => (
            <Card key={value.title}>
              <h3 className="text-h3 font-bold text-green-dark">
                {value.title}
              </h3>
              <p className="mt-3 leading-8 text-ink-muted">{value.text}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="white">
        <div className="rounded-card bg-green-dark p-8 text-white sm:p-12">
          <div className="max-w-2xl">
            <h2 className="text-h2 font-bold">
              {t(texts, "about.closing.title")}
            </h2>
            <p className="mt-4 text-lead text-white/80">
              {t(texts, "about.closing.text")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/clubs" size="lg" variant="inverted">
                {t(texts, "about.closing.cta.clubs")}
              </ButtonLink>
              <ButtonLink href="/contact" size="lg" variant="invertedOutline">
                {t(texts, "about.closing.cta.contact")}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
