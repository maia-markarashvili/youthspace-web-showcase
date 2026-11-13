import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { RegistrationForm } from "@/components/registration-form";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Gallery } from "@/components/ui/gallery";
import { Section } from "@/components/ui/section";
import { listMyProfiles } from "@/lib/db/queries/account";
import { getPricingSettings } from "@/lib/db/queries/availability";
import { shortDayLabelKa } from "@/lib/calendar";
import { upcomingEventSlots } from "@/lib/db/queries/calendar";
import { listSpaces } from "@/lib/db/queries/catalog";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { resolvePayContext } from "@/lib/pay-texts";
import { eventPeopleTiers, eventSlotPricesByKey } from "@/lib/pricing";
import { t } from "@/lib/site-texts";
import {
  EventBookingForm,
  type EventFormTexts,
  type EventSlot,
} from "./event-booking-form";

export const dynamic = "force-dynamic";

/**
 * ღონისძიების დაჯავშნის ერთიანი გვერდი (2026-08-30 რედიზაინი): სივრცე
 * მხოლოდ მთლიანად ქირავდება. კონტენტი (აღწერა/გალერეა/ინვენტარი) ერთადერთი
 * აქტიური space-რიგიდან მოდის (ადმინი → სივრცეები), ფასები — ფასების
 * გვერდიდან, ხელმისაწვდომობა — კალენდრის ღონისძიების დროშებიდან.
 */

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "spaces.seo.title"),
    description: t(texts, "spaces.seo.description"),
  };
}

export default async function SpacesPage(props: PageProps<"/spaces">) {
  const sp = await props.searchParams;
  const { cardEnabled, payTexts } = await resolvePayContext(sp);

  const [texts, spaceRows, settings, slotOptions, profiles] =
    await Promise.all([
      getSiteTexts(),
      listSpaces(),
      getPricingSettings(),
      upcomingEventSlots(),
      /* შესულ მომხმარებელს „ვისთვის ყიდულობ" ამომრჩევი ეჩვენება (სტუმარზე []) */
      listMyProfiles(),
    ]);
  const space = spaceRows[0] ?? null;

  /* ფასები მხოლოდ ჯავშნის ფორმაშია (ცალკე ღირებულების ბლოკი მოხსნილია) */
  const slotPrices = eventSlotPricesByKey(settings);
  const tiers = eventPeopleTiers(settings);

  const slots: EventSlot[] = slotOptions.map((option) => ({
    date: option.date,
    dateLabel: shortDayLabelKa(option.date),
    slot: option.slot,
    slotLabel: option.slotLabel,
    priceTetri: slotPrices[option.slot].standard,
  }));

  const formTexts: EventFormTexts = {
    slotLegend: t(texts, "spaces.form.slot.legend"),
    tierLegend: t(texts, "spaces.form.tier.legend"),
    tierRow: t(texts, "spaces.tiers.row"),
    nameLabel: t(texts, "spaces.form.name.label"),
    phoneLabel: t(texts, "spaces.form.phone.label"),
    emailLabel: t(texts, "spaces.form.email.label"),
    noteLabel: t(texts, "spaces.form.note.label"),
    noteHint: t(texts, "spaces.form.note.hint"),
    totalLabel: t(texts, "spaces.form.total.label"),
    submit: t(texts, "spaces.form.submit"),
    pending: t(texts, "spaces.form.pending"),
    successTitle: t(texts, "spaces.success.title"),
    successCodeLabel: t(texts, "spaces.success.code.label"),
    successAmountLabel: t(texts, "spaces.success.amount.label"),
    successRequisitesEmpty: t(texts, "spaces.success.requisites.empty"),
    successTransferNote: t(texts, "spaces.success.transfer.note"),
    successSaveCode: t(texts, "spaces.success.saveCode"),
    successAccountLink: t(texts, "spaces.success.account.link"),
  };

  /* ჯავშნის სამი ნაბიჯი — ტექსტები რეესტრიდან ინდექსური გასაღებებით */
  const steps = [1, 2, 3].map((i) => ({
    i,
    title: t(texts, `spaces.steps.${i}.title`),
    text: t(texts, `spaces.steps.${i}.text`),
  }));

  return (
    <>
      <Section tone="cream">
        <div className="max-w-3xl">
          <p className="eyebrow">{t(texts, "spaces.hero.eyebrow")}</p>
          <h1 className="mt-3 text-h1 font-bold text-green-dark">
            {t(texts, "spaces.hero.title")}
          </h1>
          <p className="mt-4 text-lead text-ink-muted">
            {t(texts, "spaces.hero.lead")}
          </p>
        </div>

        {!space ? (
          <div className="mt-10">
            <EmptyState
              title={t(texts, "spaces.empty.title")}
              description={t(texts, "spaces.empty.description")}
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{space.title}</Badge>
                {space.capacity ? (
                  <Badge>
                    {t(texts, "spaces.tiers.row").replace(
                      "{n}",
                      String(space.capacity),
                    )}
                  </Badge>
                ) : null}
              </div>

              {space.description ? (
                <Markdown body={space.description} className="mt-5" />
              ) : null}

              {space.inventory.length > 0 ? (
                <div className="mt-8 rounded-card border border-line bg-white p-6">
                  <p className="eyebrow">
                    {t(texts, "spaces.inventory.eyebrow")}
                  </p>
                  <ul className="mt-3 grid gap-2 text-ink sm:grid-cols-2">
                    {space.inventory.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden className="text-green-mid">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* ღირებულების ცალკე ბლოკი მოხსნილია (მფლობელის გადაწყვეტილება,
                  2026-08-30) — ფასები მხოლოდ ჯავშნის ფორმაშია, სლოტისა და
                  ხალხის საფეხურის ღილაკებზე */}
            </div>

            {/* ჯავშნის ბარათი — გადახდით; თავისუფალი დროის გარეშე lead-ფორმა */}
            <Card className="lg:sticky lg:top-24">
              {slots.length > 0 ? (
                <EventBookingForm
                  slots={slots}
                  tiers={tiers}
                  texts={formTexts}
                  cardEnabled={cardEnabled}
                  payTexts={payTexts}
                  profiles={profiles}
                />
              ) : (
                <>
                  <p className="text-sm text-ink-muted">
                    {t(texts, "spaces.empty.slots")}
                  </p>
                  <div className="mt-4">
                    <RegistrationForm
                      itemType="space"
                      itemSlug={space.slug}
                      itemTitle={`${space.title} - დაჯავშნა`}
                      messageHint={t(texts, "spaces.lead.hint")}
                      submitLabel={t(texts, "spaces.lead.submit")}
                    />
                  </div>
                </>
              )}
              <ButtonLink
                href="/contact"
                variant="ghost"
                className="mt-2 border border-line"
              >
                {t(texts, "spaces.cta.question")}
              </ButtonLink>
            </Card>
          </div>
        )}
      </Section>

      <Section tone="white">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.i}>
              <p className="eyebrow">{step.title}</p>
              <p className="mt-3 leading-8 text-ink">{step.text}</p>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-card border border-line bg-cream p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-h3 font-bold text-green-dark">
              {t(texts, "spaces.banner.title")}
            </p>
            <p className="mt-2 max-w-2xl text-ink-muted">
              {t(texts, "spaces.banner.text")}
            </p>
          </div>
          <ButtonLink href="/contact" className="mt-4 shrink-0 sm:mt-0">
            {t(texts, "spaces.banner.cta")}
          </ButtonLink>
        </div>
      </Section>

      {space && space.gallery.length > 0 ? (
        <Section tone="cream">
          <h2 className="text-h2 font-bold text-green-dark">
            {t(texts, "spaces.gallery.title")}
          </h2>
          <Gallery images={space.gallery} alt={space.title} className="mt-6" />
        </Section>
      ) : null}
    </>
  );
}
