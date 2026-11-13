import type { Metadata } from "next";
import Link from "next/link";
import { logoutAccount } from "@/app/(site)/auth-actions";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { verifyAccount } from "@/lib/auth/account-session";
import { getCabinetData, type CabinetItem } from "@/lib/db/queries/account";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { formatGel } from "@/lib/money";
import { t } from "@/lib/site-texts";
import { CancelItemForm } from "./cancel-item-form";
import { ProfilesManager } from "./profiles-manager";
import { ReferralCard, type ReferralCardTexts } from "./referral-card";

export const dynamic = "force-dynamic";

/* ტექსტები ადმინიდან იმართება (ტექსტები → ანგარიში) — 2026-08-29 */
export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return {
    title: t(texts, "account.seo.title"),
    robots: { index: false, follow: false },
  };
}

/** CabinetItem.kind → cancelOwnItem-ის kind (კურსი/სივრცე/შესვლა = booking) */
const CANCEL_KIND: Record<CabinetItem["kind"], "club" | "pass" | "booking"> = {
  club: "club",
  pass: "pass",
  course: "booking",
  space: "booking",
  dropin: "booking",
};

type BadgeLabels = { active: string; done: string; bookEntry: string };

function ItemRow({ item, badges }: { item: CabinetItem; badges: BadgeLabels }) {
  return (
    <li className="flex flex-col gap-1 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{item.title}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{item.entitlement}</p>
        {/* აქტიური პასიდან პირდაპირ დაჯავშნა — კოდი წინასწარ შევსებული */}
        {item.kind === "pass" && item.isActive && item.orderRef ? (
          <Link
            href={`/drop-in?tab=pass&code=${item.orderRef}`}
            className="mt-1 inline-block text-sm font-semibold text-green-dark underline"
          >
            {badges.bookEntry}
          </Link>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {item.profileName ? (
          <Badge tone="outline">{item.profileName}</Badge>
        ) : null}
        {item.orderRef ? (
          <span className="font-mono text-xs text-ink-muted">
            {item.orderRef}
          </span>
        ) : null}
        <Badge tone={item.isActive ? "accent" : "neutral"}>
          {item.isActive ? badges.active : badges.done}
        </Badge>
        {item.cancellable ? (
          <CancelItemForm
            kind={CANCEL_KIND[item.kind]}
            id={item.id}
            hint={item.cancelHint}
          />
        ) : null}
      </div>
    </li>
  );
}

function ItemGroup({
  title,
  items,
  emptyText,
  ctaLabel,
  ctaHref,
  badges,
}: {
  title: string;
  items: CabinetItem[];
  emptyText: string;
  ctaLabel: string;
  ctaHref: string;
  badges: BadgeLabels;
}) {
  /* აქტიურები ზემოთ, დასრულებულები ქვემოთ */
  const sorted = [...items].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 font-bold text-green-dark">{title}</h2>
        <ButtonLink href={ctaHref} variant="ghost">
          {ctaLabel}
        </ButtonLink>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {sorted.map((item) => (
            <ItemRow key={`${item.kind}-${item.id}`} item={item} badges={badges} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function AccountPage() {
  const account = await verifyAccount();
  const [data, texts] = await Promise.all([
    getCabinetData(account),
    getSiteTexts(),
  ]);

  const badges: BadgeLabels = {
    active: t(texts, "account.badge.active"),
    done: t(texts, "account.badge.done"),
    bookEntry: t(texts, "account.passes.bookEntry"),
  };

  const referralTexts: ReferralCardTexts | null = data.referral
    ? {
        title: t(texts, "account.referral.title"),
        body: t(texts, "account.referral.body").replace(
          "{percent}",
          String(data.referral.percent),
        ),
        copy: t(texts, "account.referral.copy"),
        copied: t(texts, "account.referral.copied"),
        accrued: t(texts, "account.referral.accrued").replace(
          "{n}",
          String(data.referral.availableCredits),
        ),
        nextRenewal:
          data.referral.nextRenewalAmountTetri !== null
            ? t(texts, "account.referral.nextRenewal").replace(
                "{amount}",
                formatGel(data.referral.nextRenewalAmountTetri),
              )
            : "",
        footnote: t(texts, "account.referral.footnote"),
      }
    : null;

  const hasAnything =
    data.clubs.length +
      data.passes.length +
      data.courses.length +
      data.bookings.length +
      data.events.length >
    0;

  return (
    <Section tone="cream">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t(texts, "account.hero.eyebrow")}</p>
            <h1 className="mt-3 text-h2 font-bold text-green-dark">
              {t(texts, "account.hero.greeting").replace(
                "{name}",
                account.fullName,
              )}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {account.email}
              {account.phone ? ` · ${account.phone}` : ""}
            </p>
          </div>
          <form action={logoutAccount}>
            <Button type="submit" variant="secondary">
              {t(texts, "account.logout")}
            </Button>
          </form>
        </div>

        {!hasAnything ? (
          <div className="mt-6">
            <EmptyState
              title={t(texts, "account.empty.title")}
              description={t(texts, "account.empty.description")}
            />
          </div>
        ) : null}

        <ItemGroup
          title={t(texts, "account.clubs.title")}
          items={data.clubs}
          emptyText={t(texts, "account.clubs.empty")}
          ctaLabel={t(texts, "account.clubs.cta")}
          ctaHref="/clubs"
          badges={badges}
        />
        <ItemGroup
          title={t(texts, "account.passes.title")}
          items={data.passes}
          emptyText={t(texts, "account.passes.empty")}
          ctaLabel={t(texts, "account.passes.cta")}
          ctaHref="/drop-in?tab=pass"
          badges={badges}
        />
        <ItemGroup
          title={t(texts, "account.courses.title")}
          items={data.courses}
          emptyText={t(texts, "account.courses.empty")}
          ctaLabel={t(texts, "account.courses.cta")}
          ctaHref="/courses"
          badges={badges}
        />
        <ItemGroup
          title={t(texts, "account.bookings.title")}
          items={data.bookings}
          emptyText={t(texts, "account.bookings.empty")}
          ctaLabel={t(texts, "account.bookings.cta")}
          ctaHref="/drop-in"
          badges={badges}
        />
        <ItemGroup
          title={t(texts, "account.events.title")}
          items={data.events}
          emptyText={t(texts, "account.events.empty")}
          ctaLabel={t(texts, "account.events.cta")}
          ctaHref="/spaces"
          badges={badges}
        />

        {data.referral && referralTexts ? (
          <ReferralCard referral={data.referral} texts={referralTexts} />
        ) : null}

        <ProfilesManager profiles={data.profiles} />

        <p className="mt-8 text-sm text-ink-muted">
          {t(texts, "account.footer.helper")}{" "}
          <Link
            href="/contact"
            className="font-semibold text-green-dark underline"
          >
            {t(texts, "account.footer.link")}
          </Link>
        </p>
      </div>
    </Section>
  );
}
