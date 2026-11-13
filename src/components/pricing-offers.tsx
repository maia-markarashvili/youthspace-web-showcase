import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import type { PricingSettings } from "@/lib/db/schema";
import { formatGel } from "@/lib/money";
import {
  clubMonthlyPrice,
  clubPriceInFourPacks,
  effectivePrice,
  type PricedPair,
} from "@/lib/pricing";
import { t } from "@/lib/site-texts";
import { CLUB_BAND, ENTRY_SLOTS } from "@/lib/slots";

/**
 * სამი გეგმის საზიარო ბადე — ერთჯერადი შესვლა · 4 შესვლა · კლუბის წევრობა.
 * ერთსა და იმავე სახით რენდერდება მთავარ გვერდზე და /membership-ზე
 * (ტექსტები membership.* key-ებიდან, ფასები pricing_settings-იდან).
 * კლუბის გეგმა გამორჩეულია: „120 ₾ = 2 × 60 ₾" math-ხაზი მხოლოდ მაშინ ჩანს,
 * როცა შეფარდება ზუსტია (clubPriceInFourPacks) — ფასების ცვლილებას უძლებს.
 * titleAs: /membership-ზე ბარათის სათაური h2-ია (h1-ის ქვეშ), მთავარზე — h3.
 */

/** სტანდარტული + სააქციო წყვილის ჩვენება — sale=null → მხოლოდ სტანდარტული */
function PairPrice({ pair, suffix }: { pair: PricedPair; suffix?: string }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {pair.sale !== null ? (
        <>
          <span className="text-sm text-ink-muted line-through">
            {formatGel(pair.standard)}
          </span>
          <span className="text-h2 font-bold text-green-dark">
            {formatGel(pair.sale)}
          </span>
        </>
      ) : (
        <span className="text-h2 font-bold text-green-dark">
          {formatGel(pair.standard)}
        </span>
      )}
      {suffix ? <span className="text-sm text-ink-muted">{suffix}</span> : null}
    </span>
  );
}

function OfferList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-6 text-ink">
          <span aria-hidden className="font-bold text-green-dark">
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingOffers({
  settings,
  texts,
  titleAs = "h2",
}: {
  settings: PricingSettings;
  texts: ReadonlyMap<string, string>;
  titleAs?: "h2" | "h3";
}) {
  const Title = titleAs;

  const clubPair = clubMonthlyPrice(settings);
  const single: PricedPair = {
    standard: settings.singleEntryPrice,
    sale: settings.saleSingleEntryPrice,
  };
  const fourPack: PricedPair = {
    standard: settings.fourPackPrice,
    sale: settings.saleFourPackPrice,
  };

  const slotLine = ENTRY_SLOTS.map((slot) => slot.label).join(" / ");

  /* „2 პაკეტის ფასად" — მხოლოდ ზუსტი შეფარდებისას */
  const deal = clubPriceInFourPacks(settings);
  const showDeal = deal !== null && deal.exact && deal.packs >= 2;

  /* registry-ტექსტი placeholder-ებით ({band}, {pack}, {slots}, {days}…) */
  const fill = (key: string, repl: Record<string, string>) =>
    Object.entries(repl).reduce(
      (acc, [token, value]) => acc.replaceAll(`{${token}}`, value),
      t(texts, key),
    );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ერთჯერადი შესვლა */}
      <Card>
        <Badge tone="accent">{t(texts, "membership.single.badge")}</Badge>
        <Title className="mt-3 text-h3 font-bold text-green-dark">
          {t(texts, "membership.single.title")}
        </Title>
        <div className="mt-4">
          <PairPrice pair={single} />
        </div>
        <OfferList
          items={[
            fill("membership.single.feature.1", { slots: slotLine }),
            t(texts, "membership.single.feature.2"),
            t(texts, "membership.single.feature.3"),
          ]}
        />
        <ButtonLink href="/drop-in" className="mt-6 w-fit">
          {t(texts, "membership.single.cta")}
        </ButtonLink>
      </Card>

      {/* 4-ჯერადი შესვლა */}
      <Card>
        <Badge tone="accent">{t(texts, "membership.fourpack.badge")}</Badge>
        <Title className="mt-3 text-h3 font-bold text-green-dark">
          {t(texts, "membership.fourpack.title")}
        </Title>
        <div className="mt-4">
          <PairPrice pair={fourPack} />
        </div>
        <OfferList
          items={[
            fill("membership.fourpack.feature.1", { slots: slotLine }),
            fill("membership.fourpack.feature.2", {
              days: String(settings.fourPackValidityDays),
            }),
            t(texts, "membership.fourpack.feature.3"),
          ]}
        />
        <ButtonLink href="/drop-in" className="mt-6 w-fit">
          {t(texts, "membership.fourpack.cta")}
        </ButtonLink>
      </Card>

      {/* კლუბის წევრობა — გამორჩეული გეგმა */}
      <Card className="ring-2 ring-green-dark ring-inset">
        <Badge tone="accent">
          {showDeal
            ? t(texts, "membership.club.dealBadge")
            : t(texts, "membership.club.badge")}
        </Badge>
        <Title className="mt-3 text-h3 font-bold text-green-dark">
          {t(texts, "membership.club.title")}
        </Title>
        <div className="mt-4">
          <PairPrice pair={clubPair} suffix="თვეში" />
        </div>
        {showDeal ? (
          <p className="mt-3 w-fit rounded-pill bg-green-light/40 px-3 py-1.5 text-sm font-bold text-green-dark">
            {fill("membership.club.mathNote", {
              club: formatGel(deal.clubTetri),
              packs: String(deal.packs),
              pack: formatGel(deal.packTetri),
            })}
          </p>
        ) : null}
        <OfferList
          items={[
            fill("membership.club.feature.1", { band: CLUB_BAND.label }),
            fill("membership.club.feature.2", {
              pack: formatGel(effectivePrice(fourPack)),
            }),
            t(texts, "membership.club.feature.3"),
            t(texts, "membership.club.feature.4"),
            t(texts, "membership.club.feature.5"),
          ]}
        />
        <ButtonLink href="/clubs" className="mt-6 w-fit">
          {t(texts, "membership.club.cta")}
        </ButtonLink>
      </Card>
    </div>
  );
}
