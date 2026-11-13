import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { t } from "@/lib/site-texts";

export default async function NotFound() {
  const texts = await getSiteTexts();

  return (
    <Section tone="cream" className="flex-1">
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="eyebrow">{t(texts, "shared.notfound.eyebrow")}</p>
        <h1 className="mt-3 text-h1 font-bold text-green-dark">
          {t(texts, "shared.notfound.title")}
        </h1>
        <p className="mt-4 text-lead text-ink-muted">
          {t(texts, "shared.notfound.body")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" size="lg">
            {t(texts, "shared.notfound.cta-home")}
          </ButtonLink>
          <ButtonLink href="/clubs" variant="secondary" size="lg">
            {t(texts, "shared.notfound.cta-clubs")}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
