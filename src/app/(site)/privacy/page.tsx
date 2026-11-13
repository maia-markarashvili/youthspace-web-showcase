import type { Metadata } from "next";
import { LegalVersionsList } from "@/components/legal-versions";
import { Markdown } from "@/components/markdown";
import { Section } from "@/components/ui/section";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

/**
 * კონფიდენციალურობის პოლიტიკა — ერთი ერთიანი markdown-ტექსტი (privacy.body,
 * ადმინი → ტექსტები → კონფიდენციალურობა), ქვემოთ PDF-ვერსიები „მოქმედია
 * {თარიღი}-დან" სიად. ძველი სექციები 2026-08-28-ს ერთიან ტექსტად შეიკრა.
 */

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "privacy.seo.title"),
    description: t(texts, "privacy.seo.description"),
  };
}

export default async function PrivacyPage() {
  const texts = await getSiteTexts();

  return (
    <Section tone="cream">
      <article className="mx-auto flex max-w-3xl flex-col gap-10">
        <div>
          <p className="eyebrow">{t(texts, "privacy.hero.eyebrow")}</p>
          <h1 className="mt-3 text-h1 font-bold text-green-dark">
            {t(texts, "privacy.hero.title")}
          </h1>
        </div>

        <Markdown body={t(texts, "privacy.body")} />

        <LegalVersionsList kind="privacy" />
      </article>
    </Section>
  );
}
