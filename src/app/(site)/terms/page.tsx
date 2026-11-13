import type { Metadata } from "next";
import { LegalVersionsList } from "@/components/legal-versions";
import { Markdown } from "@/components/markdown";
import { Section } from "@/components/ui/section";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

/**
 * წესები და პირობები — ერთი ერთიანი markdown-ტექსტი (terms.body, ადმინი →
 * ტექსტები → წესები და პირობები), ქვემოთ კი ატვირთული PDF-ვერსიები
 * „მოქმედია {თარიღი}-დან" სიად (legal_versions). ძველი 9 ხელით აწყობილი
 * სექცია 2026-08-28-ს ერთიან ტექსტად შეიკრა - მფლობელი მთლიანს ერთად ცვლის.
 */

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "terms.seo.title"),
    description: t(texts, "terms.seo.description"),
  };
}

export default async function TermsPage() {
  const texts = await getSiteTexts();

  return (
    <Section tone="cream">
      <article className="mx-auto flex max-w-3xl flex-col gap-10">
        <div>
          <p className="eyebrow">{t(texts, "terms.hero.eyebrow")}</p>
          <h1 className="mt-3 text-h1 font-bold text-green-dark">
            {t(texts, "terms.hero.title")}
          </h1>
        </div>

        <Markdown body={t(texts, "terms.body")} />

        <LegalVersionsList kind="terms" />
      </article>
    </Section>
  );
}
