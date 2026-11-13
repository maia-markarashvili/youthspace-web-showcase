import type { Metadata } from "next";
import { quizClubFromSearchParams } from "@/lib/quiz-attribution";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { Accordion } from "@/components/landing/accordion";
import { StickyCta } from "@/components/landing/sticky-cta";
import { Markdown } from "@/components/markdown";
import { TrackViewContent } from "@/components/meta-pixel";
import { ClubPurchaseForm } from "@/components/purchase/club-purchase-form";
import { resolvePayContext } from "@/lib/pay-texts";
import { SpecList } from "@/components/landing/spec-list";
import { WorkLink } from "@/components/works";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gallery } from "@/components/ui/gallery";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import {
  clubSeatsRemainingByClub,
  getPricingSettings,
  seatsFor,
} from "@/lib/db/queries/availability";
import { getClubBySlug } from "@/lib/db/queries/catalog";
import { listContentPosts } from "@/lib/db/queries/content";
import { WORK_TYPES } from "@/lib/db/schema";
import { listMyProfiles } from "@/lib/db/queries/account";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { resolveClubLanding } from "@/lib/landing";
import { formatGel } from "@/lib/money";
import { clubMonthlyPrice, effectivePrice } from "@/lib/pricing";
import { t } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

/**
 * კლუბის ლენდინგი (FB-რეკლამის დანიშნულების გვერდი) — (landing) გარსში,
 * სრული ნავიგაციისა და მუქი დასკვნითი ზოლის გარეშე. კონტენტი resolve-ით
 * მოდის: ცარიელი ადმინ-ველი = ავტო-default (src/lib/landing.ts).
 */

export async function generateMetadata(
  props: PageProps<"/clubs/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const club = await getClubBySlug(slug);

  if (!club) return { title: "კლუბი ვერ მოიძებნა" };

  const resolved = resolveClubLanding(club);
  const title = resolved.seoTitle ?? club.title;
  const description =
    resolved.seoDescription ?? (resolved.heroDescription || undefined);
  const ogImage = resolved.seoImage ?? club.coverImage;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

/** ჰეროს თეთრი pill-ბეიჯი (Badge-ის cream-ფონი cream-ჰეროზე იკარგება) */
function HeroPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-muted">
      {children}
    </span>
  );
}

export default async function ClubLandingPage(
  props: PageProps<"/clubs/[slug]">,
) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  /* ქვიზიდან მოსული (?src=quiz&club=) — ფორმასაც და პიქსელსაც მიჰყვება */
  const quizClub = quizClubFromSearchParams(searchParams);

  /* დამოუკიდებელი წამოღებები ერთ batch-ში — serial round-trip-ების ნაცვლად.
     ფასი **მხოლოდ** pricing_settings-იდან — ერთი ფასი ყველა კლუბზე. */
  const [{ cardEnabled, payTexts }, club, settings, texts, profiles] =
    await Promise.all([
      resolvePayContext(searchParams),
      getClubBySlug(slug),
      getPricingSettings(),
      getSiteTexts(),
      /* შესულ მომხმარებელს „ვისთვის ყიდულობ" ამომრჩევი ეჩვენება (სტუმარზე []) */
      listMyProfiles(),
    ]);

  if (!club) notFound();

  /* club.id/settings-ზე დამოკიდებული — მეორე batch */
  const [outputs, remaining] = await Promise.all([
    listContentPosts({ types: WORK_TYPES, clubId: club.id }),
    clubSeatsRemainingByClub(settings),
  ]);

  const resolved = resolveClubLanding(club, {
    fourPackPriceLabel: formatGel(settings.fourPackPrice),
  });
  const seats = seatsFor(remaining, club.id, settings);
  /* ადმინის ტოგლი „მიღება დასრულებულია" — ფასი ჩანს, CTA და ფორმა იმალება */
  const closed = club.registrationClosed;
  const singlePair = clubMonthlyPrice(settings);
  const heroPriceLabel = `${formatGel(effectivePrice(singlePair))}/თვე`;

  /* „რით სრულდება ციკლი" ბარათის სთორი — მხოლოდ ჩატვირთული პოსტებიდან */
  const cycleStory = resolved.cycleStoryId
    ? (outputs.find((post) => post.id === resolved.cycleStoryId) ?? null)
    : null;

  const typeBadge = club.ageRange
    ? `${t(texts, "clubs.detail.badge")} · ${club.ageRange} წელი`
    : t(texts, "clubs.detail.badge");

  /* მონაცვლეობითი ფონები: მასივში მხოლოდ რეალურად დასარენდერებელი სექციები
     გროვდება და ტონი ინდექსით ენიჭება (ლუწი = white, კენტი = cream) — ასე
     ორ მეზობელ სექციას ერთნაირი ფონი ვერასდროს ექნება, პირობითი ბლოკების
     არსებობის მიუხედავად. ჰერო კრემისფერია, ამიტომ პირველი ბლოკი თეთრია. */
  const blocks: { key: string; render: (tone: "white" | "cream") => ReactNode }[] =
    [];

  /* 2 · რას მიიღებ */
  blocks.push({
    key: "benefits",
    render: (tone) => (
      <Section tone={tone}>
        <h2 className="text-h2 font-bold text-green-dark">
          {t(texts, "clubs.detail.benefits.title")}
        </h2>
        <ul className="mt-6 flex max-w-2xl flex-col gap-4">
          {resolved.benefits.map((benefit) => (
            <li key={benefit} className="flex gap-3">
              <span aria-hidden className="font-bold text-green-dark">
                ✓
              </span>
              <span className="leading-7 text-ink">{benefit}</span>
            </li>
          ))}
        </ul>
      </Section>
    ),
  });

  /* 3 · პროგრამა (შესავალი + აკორდეონი) + „რით სრულდება ციკლი" */
  if (
    resolved.program.length > 0 ||
    resolved.programIntro ||
    resolved.cycleCard
  ) {
    blocks.push({
      key: "program",
      render: (tone) => (
        <Section tone={tone}>
          {resolved.program.length > 0 || resolved.programIntro ? (
            <>
              <h2 className="text-h2 font-bold text-green-dark">
                {t(texts, "clubs.landing.program.title")}
              </h2>
              {/* შესავალი — გრძელი ტექსტისთვის, რომელიც ჰეროში 160 სიმბოლოზე
                  იჭრებოდა; markdown-ით აბზაცები და სიები მუშაობს */}
              {resolved.programIntro ? (
                <Markdown
                  body={resolved.programIntro}
                  className="mt-4 max-w-2xl"
                />
              ) : null}
              {resolved.program.length > 0 ? (
                <Accordion
                  className="mt-6 max-w-2xl"
                  items={resolved.program.map((item) => ({
                    title: item.title,
                    body: item.text,
                  }))}
                />
              ) : null}
            </>
          ) : null}

          {resolved.cycleCard ? (
            <Card
              className={cn(
                "max-w-2xl",
                resolved.program.length > 0 && "mt-6",
              )}
            >
              <p className="eyebrow">
                {t(texts, "clubs.detail.result.eyebrow")}
              </p>
              <p className="mt-3 text-h3 font-semibold text-green-dark">
                {resolved.cycleCard}
              </p>
              {cycleStory?.slug ? (
                <Link
                  href={`/stories/${cycleStory.slug}`}
                  className="mt-4 w-fit font-semibold text-green-dark underline"
                >
                  {t(texts, "clubs.landing.cycle.storyLink")}{" "}
                  <span aria-hidden>→</span>
                </Link>
              ) : null}
            </Card>
          ) : null}
        </Section>
      ),
    });
  }

  /* 4 · სოციალური მტკიცებულება — მხოლოდ როცა მონაცემი არსებობს */
  if (outputs.length > 0) {
    blocks.push({
      key: "outputs",
      render: (tone) => (
        <Section tone={tone}>
          <h2 className="text-h2 font-bold text-green-dark">
            {t(texts, "clubs.detail.outputs.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            {t(texts, "clubs.detail.outputs.text")}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {outputs.map((post) => (
              <WorkLink key={post.id} post={post} />
            ))}
          </div>
        </Section>
      ),
    });
  }

  /* 5 · გალერეა, თუ არსებობს */
  if (club.gallery.length > 0) {
    blocks.push({
      key: "gallery",
      render: (tone) => (
        <Section tone={tone}>
          <h2 className="text-h2 font-bold text-green-dark">
            {t(texts, "clubs.detail.gallery.title")}
          </h2>
          <Gallery images={club.gallery} alt={club.title} className="mt-6" />
        </Section>
      ),
    });
  }

  /* ⚠ FAQ-სექცია განზრახ აღარ არსებობს (2026-08-18): კითხვები ისედაც
     პროგრამის აკორდეონშია და გვერდზე ორი კითხვა-პასუხის ბლოკი ჩანდა
     (ერთი მფლობელის, მეორე კოდში ჩაშენებული). `resolved.faq` კურსებს რჩება. */

  /* 6 · გაწევრიანება — ყიდვის ფორმა, ყოველთვის ბოლო სექცია */
  blocks.push({
    key: "join",
    render: (tone) => (
      <Section id="join" tone={tone} className="scroll-mt-24">
        <div className="max-w-2xl">
          <h2 className="text-h2 font-bold text-green-dark">
            {t(texts, "clubs.landing.join.title")}
          </h2>
          <Card className="mt-6">
            {/* მხოლოდ ეს ერთი კლუბი იყიდება — სხვა კლუბების არჩევანი აღარ არსებობს */}
            {closed ? (
              <p className="text-base font-semibold leading-7 text-ink">
                {t(texts, "clubs.detail.closed")}
              </p>
            ) : (
              <ClubPurchaseForm
                cardEnabled={cardEnabled}
                payTexts={payTexts}
                askAge={resolved.askAge}
                club={{
                  id: club.id,
                  slug: club.slug,
                  title: club.title,
                  seatsRemaining: seats,
                  subtext:
                    [club.meetingDay, club.meetingTime]
                      .filter(Boolean)
                      .join(" · ") || undefined,
                }}
                pricePair={singlePair}
                fourPackPriceTetri={settings.fourPackPrice}
                clubSeatCapacity={settings.clubSeatCapacity}
                showSeatCount={settings.showPublicSeats}
                profiles={profiles}
                quizClub={quizClub}
              />
            )}
          </Card>
        </div>
      </Section>
    ),
  });

  return (
    <>
      <TrackViewContent
        category="club"
        name={club.slug}
        ids={[club.slug]}
        valueTetri={effectivePrice(singlePair)}
        quizClub={quizClub}
      />
      {/* 1 · კომპაქტური ჰერო — ფოტო მარცხნივ, ტექსტი მარჯვნივ, ერთადერთი h1 */}
      <div className="container-page py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-16/9 overflow-hidden rounded-card">
            {club.coverImage ? (
              <Image
                src={club.coverImage}
                alt={club.title}
                fill
                priority
                unoptimized
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 bg-linear-to-br from-green-mid to-green-dark"
              />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <HeroPill>{typeBadge}</HeroPill>
              <HeroPill>{resolved.scheduleBadge}</HeroPill>
              {/* დადებით რიცხვს გლობალური ჩამრთველიც სჭირდება; sold-out ყოველთვის ჩანს */}
              {closed ? (
                <HeroPill>{t(texts, "shared.cards.closed")}</HeroPill>
              ) : resolved.showSeats &&
                (seats <= 0 || settings.showPublicSeats) ? (
                seats > 0 ? (
                  <span className="inline-flex items-center rounded-pill bg-green-dark px-3 py-1 text-xs font-semibold text-white">
                    დარჩა {seats} ადგილი
                  </span>
                ) : (
                  <HeroPill>ადგილები ამოიწურა</HeroPill>
                )
              ) : null}
            </div>

            <h1 className="mt-4 text-h2 font-bold text-green-dark">
              {club.title}
            </h1>

            {resolved.heroDescription ? (
              <p className="mt-3 text-base leading-7 text-ink-muted">
                {resolved.heroDescription}
              </p>
            ) : null}

            {/* კომპაქტური სპეც-სია (ყოფილი „ფაქტების ზოლის" ჩამნაცვლებელი) */}
            <SpecList facts={resolved.facts} />

            <div className="mt-5 flex flex-wrap items-baseline gap-2">
              {singlePair.sale !== null ? (
                <>
                  <span className="text-h3 font-bold text-green-dark">
                    {formatGel(singlePair.sale)}
                  </span>
                  <span className="text-base font-semibold text-ink-muted line-through">
                    {formatGel(singlePair.standard)}
                  </span>
                </>
              ) : (
                <span className="text-h3 font-bold text-green-dark">
                  {formatGel(singlePair.standard)}
                </span>
              )}
              <span className="text-sm text-ink-muted">/ თვეში</span>
            </div>

            {!closed ? (
              <>
                <div id="hero-cta" className="mt-5">
                  <ButtonLink href="#join" className="w-full">
                    {resolved.ctaLabel}
                  </ButtonLink>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  {resolved.ctaMicrocopy}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {blocks.map((block, index) => (
        <Fragment key={block.key}>
          {block.render(index % 2 === 0 ? "white" : "cream")}
        </Fragment>
      ))}

      {!closed ? (
        <StickyCta
          heroCtaId="hero-cta"
          formSectionId="join"
          priceLabel={heroPriceLabel}
          ctaLabel={resolved.ctaLabel}
        />
      ) : null}
    </>
  );
}
