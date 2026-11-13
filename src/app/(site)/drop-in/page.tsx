import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { listMyProfiles } from "@/lib/db/queries/account";
import { getPricingSettings } from "@/lib/db/queries/availability";
import { shortDayLabelKa } from "@/lib/calendar";
import { upcomingEntrySlots } from "@/lib/db/queries/calendar";
import { getDropinSettings } from "@/lib/db/queries/catalog";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { resolvePayContext } from "@/lib/pay-texts";
import { ENTRY_SLOTS } from "@/lib/slots";
import { t } from "@/lib/site-texts";
import { EntryForms, type SlotOption } from "./entry-forms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "dropin.seo.title"),
    description: t(texts, "dropin.seo.description"),
  };
}

export default async function DropInPage(props: PageProps<"/drop-in">) {
  const sp = await props.searchParams;
  const { cardEnabled, payTexts } = await resolvePayContext(sp);

  /* კაბინეტის deep-link: ?tab=pass პირდაპირ აბონემენტის ტაბზე გადადის,
     ?code=CWK-##### კი კოდის ველს წინასწარ ავსებს (მკაცრი ვალიდაციით) */
  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const initialTab =
    rawTab === "single" || rawTab === "pack" || rawTab === "pass"
      ? rawTab
      : undefined;
  const rawCode = (Array.isArray(sp.code) ? sp.code[0] : (sp.code ?? ""))
    .toUpperCase()
    .trim();
  const passCode = /^[A-Z]{3}-\d{5}$/.test(rawCode) ? rawCode : undefined;
  /* საჯავშნო ფანჯრის (დღე, სლოტი) წყვილები — შაბ-კვირა/უქმეები/სავსე ან
     დახურული სლოტები გამოტოვებულია */
  const [texts, settings, dropin, slotOptions, profiles] = await Promise.all([
    getSiteTexts(),
    getPricingSettings(),
    getDropinSettings(),
    upcomingEntrySlots(),
    /* შესულ მომხმარებელს „ვისთვის ყიდულობ" ამომრჩევი ეჩვენება (სტუმარზე []) */
    listMyProfiles(),
  ]);

  const slots: SlotOption[] = slotOptions.map((option) => ({
    date: option.date,
    // T12:00Z → თბილისში 16:00 იმავე კალენდარულ დღეს — label ზუსტია
    dateLabel: shortDayLabelKa(option.date),
    slot: option.slot,
    slotLabel: option.slotLabel,
    remaining: option.remaining,
    capacity: option.capacity,
  }));

  return (
    <Section tone="cream">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="eyebrow">{t(texts, "dropin.hero.eyebrow")}</p>
          <h1 className="mt-3 text-h1 font-bold text-green-dark">
            {t(texts, "dropin.hero.title")}
          </h1>
          <p className="mt-4 text-lead text-ink-muted">
            {dropin?.description ?? t(texts, "dropin.hero.lead")}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="eyebrow">{t(texts, "dropin.benefits.eyebrow")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i}>{t(texts, `dropin.benefits.${i}`)}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <p className="eyebrow">{t(texts, "dropin.how.eyebrow")}</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
                {[1, 2, 3].map((i) => (
                  <li key={i}>{t(texts, `dropin.how.${i}`)}</li>
                ))}
              </ul>
            </Card>
          </div>

          <ul className="mt-6 flex flex-col gap-2 text-sm text-ink-muted">
            <li>
              {t(texts, "dropin.bullets.slots").replace(
                "{slots}",
                ENTRY_SLOTS.map((slot) => slot.label).join(" / "),
              )}
            </li>
            <li>{t(texts, "dropin.bullets.midday")}</li>
            <li>{t(texts, "dropin.bullets.capacity")}</li>
            <li>{t(texts, "dropin.bullets.cancellation")}</li>
          </ul>
        </div>

        <Card className="lg:sticky lg:top-24">
          <p className="eyebrow">{t(texts, "dropin.booking.eyebrow")}</p>
          <p className="mt-3 text-sm text-ink-muted">
            {t(texts, "dropin.booking.lead")}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            {t(texts, "dropin.booking.weekendNote")}
          </p>
          <div className="mt-5">
            {slots.length === 0 ? (
              <p className="rounded-card border border-line bg-cream px-4 py-3 text-sm text-ink-muted">
                {t(texts, "dropin.booking.empty")}
              </p>
            ) : (
              <EntryForms
                cardEnabled={cardEnabled}
                payTexts={payTexts}
                passNote={t(texts, "dropin.pass.note")}
                initialTab={initialTab}
                passCode={passCode}
                slots={slots}
                singlePrice={{
                  standard: settings.singleEntryPrice,
                  sale: settings.saleSingleEntryPrice,
                }}
                fourPackPrice={{
                  standard: settings.fourPackPrice,
                  sale: settings.saleFourPackPrice,
                }}
                fourPackValidityDays={settings.fourPackValidityDays}
                profiles={profiles}
              />
            )}
          </div>
        </Card>
      </div>
    </Section>
  );
}
