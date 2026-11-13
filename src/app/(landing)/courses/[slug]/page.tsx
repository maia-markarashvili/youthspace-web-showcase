import type { Metadata } from "next";
import { quizClubFromSearchParams } from "@/lib/quiz-attribution";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { Accordion } from "@/components/landing/accordion";
import { SpecList } from "@/components/landing/spec-list";
import { StickyCta } from "@/components/landing/sticky-cta";
import { Markdown } from "@/components/markdown";
import { TrackViewContent } from "@/components/meta-pixel";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gallery } from "@/components/ui/gallery";
import { Section, SectionHeader } from "@/components/ui/section";
import {
  courseSeatsRemaining,
  getPricingSettings,
} from "@/lib/db/queries/availability";
import { courseHasEnded } from "@/lib/calendar";
import { resolvePayContext } from "@/lib/pay-texts";
import { listMyProfiles } from "@/lib/db/queries/account";
import { getCourseBySlug, listClubs } from "@/lib/db/queries/catalog";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { resolveCourseLanding } from "@/lib/landing";
import { formatGel } from "@/lib/money";
import {
  courseIsFree,
  coursePaymentPlans,
  discountedCoursePriceTetri,
  maxCourseClubDiscount,
} from "@/lib/pricing";
import { t } from "@/lib/site-texts";
import {
  CoursePurchaseForm,
  type MemberPriceRow,
} from "../course-purchase-form";

export const dynamic = "force-dynamic";

/** ჰეროს თეთრი pill-ბეიჯი (ლენდინგის სპეცი — ბეიჯები ღია კრემისფერ ფონზე) */
const heroPill =
  "inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink";

export async function generateMetadata(
  props: PageProps<"/courses/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const course = await getCourseBySlug(slug);

  if (!course) return { title: "კურსი ვერ მოიძებნა" };

  const resolved = resolveCourseLanding(course);
  const title = resolved.seoTitle ?? course.title;
  const description = resolved.seoDescription ?? resolved.heroDescription;
  const image = resolved.seoImage ?? course.coverImage;

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function CourseLandingPage(
  props: PageProps<"/courses/[slug]">,
) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  /* ქვიზიდან მოსული (?src=quiz&club=) — ფორმასაც და პიქსელსაც მიჰყვება */
  const quizClub = quizClubFromSearchParams(searchParams);
  /* დამოუკიდებელი წამოღებები ერთ batch-ში — serial round-trip-ების ნაცვლად
     (listClubs აქვე, ადრე batch-ის შემდეგ ცალკე ისმებოდა) */
  const [{ cardEnabled, payTexts }, course, texts, settings, clubList, profiles] =
    await Promise.all([
      resolvePayContext(searchParams),
      getCourseBySlug(slug),
      getSiteTexts(),
      getPricingSettings(),
      listClubs(),
      /* შესულ მომხმარებელს „ვისთვის ყიდულობ" ამომრჩევი ეჩვენება (სტუმარზე []) */
      listMyProfiles(),
    ]);

  if (!course) notFound();

  /* course.id/capacity-ზე დამოკიდებული — მას შემდეგ */
  const seatsLeft = await courseSeatsRemaining(course.id, course.capacity);

  /* ბაზა = სააქციო (თუ არის) ან სტანდარტული; ყველა ფასდაკლება მასზე დგება */
  const baseTetri = course.salePrice ?? course.priceRegular;

  /* ორივე გადახდის ვარიანტი საჯარო ფასით (ფასდაკლების გარეშე). განვადება
     ჩართულია მხოლოდ მაშინ, თუ ადმინმა თვიური ფასიც და თვეებიც შეავსო;
     ჩართულზე მთავარი ციფრი თვიურია (მფლობელის წესი, 2026-09-19) */
  const plans = coursePaymentPlans(course, 0);
  const monthlyPlan = plans.monthly;

  /* უფასო ღონისძიება (ფასი 0) — ფასის ბლოკები და გადახდის UI საერთოდ იმალება;
     „უფასო" საჯაროდ არ იწერება (მფლობელის წესი) */
  const isFree = courseIsFree(course);

  /* დასრულებული კურსი/ღონისძიება — ფასი, CTA და ყიდვის ფორმა იმალება */
  const ended = courseHasEnded(course);
  /* ადმინის ტოგლი „მიღება დასრულებულია" — ფასი რჩება, CTA და ფორმა იმალება;
     დასრულებულ კურსზე ended-ის შეტყობინებას აქვს უპირატესობა */
  const closed = !ended && course.registrationClosed;

  /* ჰეროს „წევრებს — X-დან“ ხაზი ამ კურსის მაქსიმალური განაკვეთით ითვლება */
  const maxDiscount = maxCourseClubDiscount(course.clubDiscounts);

  /* წევრის ფასების სია — თითო კლუბს თავისი განაკვეთი აქვს (course.clubDiscounts);
     კლუბის სახელი ბაზიდან მოდის, 0-განაკვეთიანი/წაშლილი კლუბი არ ჩანს */
  const clubTitleById = new Map(
    clubList.map((club) => [club.id, club.title]),
  );
  const memberRows: MemberPriceRow[] = isFree
    ? []
    : course.clubDiscounts
        .filter((rule) => rule.percent > 0)
        .map((rule) => ({
          label: clubTitleById.get(rule.clubId),
          percent: rule.percent,
          priceTetri: discountedCoursePriceTetri(baseTetri, rule.percent),
          /* იმავე განაკვეთით დათვლილი თვიური — თითო თვეზე floor */
          monthlyPerMonthTetri:
            coursePaymentPlans(course, rule.percent).monthly?.perMonthTetri ??
            null,
        }))
        .filter((row): row is MemberPriceRow => typeof row.label === "string")
        .sort((a, b) => b.percent - a.percent);

  /* cross-sell default — ფასებზეა დამოკიდებული, ამიტომ აქ იწყობა და
     resolve*-ს გადაეცემა; ადმინის შევსებული ტექსტი მას გადაფარავს */
  const defaultCrossSell =
    maxDiscount > 0 && !isFree
      ? `ჯერ არ ხარ წევრი? გაწევრიანება ${formatGel(
          settings.saleClubPrice ?? settings.clubPrice,
        )}-ად - და ეს კურსი ${formatGel(
          discountedCoursePriceTetri(baseTetri, maxDiscount),
        )}-მდე გაგიიაფდება`
      : "";

  const resolved = resolveCourseLanding(course, { defaultCrossSell, isFree });

  /* კატეგორია თავად ამბობს ტიპს („შეხვედრა", „კურსი"…) — „კურსი ·" პრეფიქსი
     არ ეწერება; ბეჯის default მხოლოდ ცარიელ კატეგორიაზე ჩანს */
  const typeBadge = course.category || t(texts, "courses.detail.badge");

  /* მონაცვლეობითი ფონები: მასივში მხოლოდ რეალურად დასარენდერებელი სექციები
     გროვდება და ტონი ინდექსით ენიჭება (ლუწი = white, კენტი = cream) — ასე
     ორ მეზობელ სექციას ერთნაირი ფონი ვერასდროს ექნება, პირობითი ბლოკების
     არსებობის მიუხედავად. ჰერო კრემისფერია, ამიტომ პირველი ბლოკი თეთრია. */
  const blocks: { key: string; render: (tone: "white" | "cream") => ReactNode }[] =
    [];

  /* 1.5 · სრული აღწერა — ჰერო მხოლოდ ~160 სიმბოლოს (და ფორმატირების გარეშე)
     აჩვენებს, ამაზე გრძელი ტექსტი (აბზაცები/ჩამონათვალი) საკუთარ ფორმატირებად
     სექციას იღებს; მოკლე აღწერა ჰეროშივე სრულად ჩანს, ამიტომ არ ვიმეორებთ */
  if ((course.description ?? "").trim().length > 160) {
    blocks.push({
      key: "description",
      render: (tone) => (
        <Section tone={tone}>
          <SectionHeader title={t(texts, "courses.detail.about.title")} />
          <Markdown body={course.description ?? ""} className="max-w-2xl" />
        </Section>
      ),
    });
  }

  /* 2 · „რას მიიღებ“ (+ ლექტორის ჰორიზონტალური ბარათი ქვემოთ) */
  blocks.push({
    key: "benefits",
    render: (tone) => (
      <Section tone={tone}>
        <SectionHeader title={t(texts, "courses.detail.benefits.title")} />
        <ul className="flex max-w-2xl flex-col gap-3">
          {resolved.benefits.map((benefit) => (
            <li key={benefit} className="flex gap-3">
              <span aria-hidden className="font-bold text-green-dark">
                ✓
              </span>
              <span className="leading-7 text-ink">{benefit}</span>
            </li>
          ))}
        </ul>

        {course.lecturer ? (
          <Card className="mt-6 max-w-2xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {resolved.lecturerPhoto ? (
                <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-card sm:w-56">
                  <Image
                    src={resolved.lecturerPhoto}
                    alt={course.lecturer}
                    fill
                    unoptimized
                    sizes="(max-width:1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="flex-1">
                <p className="eyebrow">
                  {t(texts, "courses.detail.lecturer.eyebrow")}
                </p>
                <p className="mt-2 text-h3 font-bold text-green-dark">
                  {course.lecturer}
                </p>
                {resolved.lecturerBio ? (
                  <p className="mt-2 text-sm leading-7 text-ink-muted">
                    {resolved.lecturerBio}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}
      </Section>
    ),
  });

  /* 3 · პროგრამა — მხოლოდ თუ ადმინმა შეავსო */
  if (resolved.program.length > 0) {
    blocks.push({
      key: "program",
      render: (tone) => (
        <Section tone={tone}>
          <SectionHeader title={t(texts, "courses.landing.program.title")} />
          <Accordion
            className="max-w-2xl"
            items={resolved.program.map((item) => ({
              title: item.title,
              body: item.text,
            }))}
          />
        </Section>
      ),
    });
  }

  /* 4 · გალერეა, თუ არსებობს */
  if (course.gallery.length > 0) {
    blocks.push({
      key: "gallery",
      render: (tone) => (
        <Section tone={tone}>
          <h2 className="text-h2 font-bold text-green-dark">
            {t(texts, "courses.detail.gallery.title")}
          </h2>
          <Gallery images={course.gallery} alt={course.title} className="mt-6" />
        </Section>
      ),
    });
  }

  /* 5 · FAQ — დასრულებულ ღონისძიებაზე აზრი აღარ აქვს (სარეგისტრაციო კითხვებია) */
  if (!ended) {
    blocks.push({
      key: "faq",
      render: (tone) => (
        <Section tone={tone}>
          <SectionHeader title={t(texts, "courses.landing.faq.title")} />
          <Accordion
            className="max-w-2xl"
            items={resolved.faq.map((item) => ({
              title: item.q,
              body: item.a,
            }))}
          />
        </Section>
      ),
    });
  }

  /* 6 · ყიდვის ბლოკი — ყოველთვის ბოლო სექცია; დასრულებულზე — შეტყობინება */
  if (ended || closed) {
    blocks.push({
      key: "ended",
      render: (tone) => (
        <Section tone={tone}>
          <Card className="w-full max-w-2xl">
            <p className="text-base font-semibold leading-7 text-ink">
              {t(texts, ended ? "courses.detail.ended" : "courses.detail.closed")}
            </p>
          </Card>
        </Section>
      ),
    });
  } else {
    blocks.push({
      key: "buy",
      render: (tone) => (
        <Section id="buy" tone={tone} className="scroll-mt-24">
          <Card className="w-full max-w-2xl">
            <h2 className="text-h2 font-bold text-green-dark">
              {t(texts, "courses.landing.buy.title")}
            </h2>
            {isFree ? (
              <p className="mt-2 leading-7 text-ink">
                {t(texts, "courses.landing.free.priceLine")}
              </p>
            ) : (
              <p className="mt-2 leading-7 text-ink">
                {t(texts, "courses.landing.buy.priceLine")} -{" "}
                <span className="font-bold text-green-dark">
                  {monthlyPlan
                    ? `${formatGel(monthlyPlan.perMonthTetri)} × ${monthlyPlan.months} თვე`
                    : formatGel(baseTetri)}
                </span>
                {monthlyPlan ? (
                  <span className="text-ink-muted">
                    {" "}
                    ({t(texts, "courses.landing.plan.totalNote")}{" "}
                    {formatGel(monthlyPlan.totalTetri)}){" "}
                    {t(texts, "courses.landing.plan.fullPrefix")}{" "}
                    {formatGel(plans.full.totalTetri)}
                  </span>
                ) : null}
              </p>
            )}

            <div className="mt-5">
              {seatsLeft === 0 ? (
                <p className="rounded-card bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {t(texts, "courses.detail.soldOut")}
                </p>
              ) : (
                <CoursePurchaseForm
                  cardEnabled={cardEnabled && !isFree}
                  payTexts={payTexts}
                  askAge={resolved.askAge}
                  courseId={course.id}
                  courseSlug={course.slug}
                  basePlans={plans}
                  planTexts={{
                    legend: t(texts, "courses.landing.plan.legend"),
                    monthly: t(texts, "courses.landing.plan.monthly"),
                    monthlyHint: t(texts, "courses.landing.plan.monthlyHint"),
                    full: t(texts, "courses.landing.plan.full"),
                    fullHint: t(texts, "courses.landing.plan.fullHint"),
                    totalNote: t(texts, "courses.landing.plan.totalNote"),
                    saveNote: t(texts, "courses.landing.plan.saveNote"),
                  }}
                  firstMonthLabel={t(texts, "courses.landing.plan.firstMonth")}
                  planSuccessNote={t(
                    texts,
                    "courses.landing.plan.successNote",
                  )}
                  memberRows={memberRows}
                  memberAccordionTitle={t(
                    texts,
                    "courses.landing.member.accordion",
                  )}
                  crossSell={resolved.crossSell ?? ""}
                  fieldsMicrocopy={t(
                    texts,
                    isFree
                      ? "courses.landing.free.microcopy"
                      : "courses.landing.fields.microcopy",
                  )}
                  trustLine={t(texts, "courses.landing.trust")}
                  profiles={profiles}
                  quizClub={quizClub}
                />
              )}
            </div>
          </Card>
        </Section>
      ),
    });
  }

  return (
    <>
      <TrackViewContent
        category="event"
        name={course.slug}
        ids={[course.slug]}
        valueTetri={baseTetri > 0 ? baseTetri : undefined}
        quizClub={quizClub}
      />
      {/* ── 1. კომპაქტური ჰერო: ფოტო მარცხნივ, ტექსტი მარჯვნივ ── */}
      <div className="container-page py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-16/9 overflow-hidden rounded-card">
            {course.coverImage ? (
              <Image
                src={course.coverImage}
                alt={course.title}
                fill
                priority
                unoptimized
                sizes="(max-width:1024px) 100vw, 50vw"
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
              <span className={heroPill}>{typeBadge}</span>
              <span className={heroPill}>{resolved.scheduleBadge}</span>
              {ended ? (
                <span className="inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-muted">
                  {t(texts, "shared.cards.ended")}
                </span>
              ) : closed ? (
                <span className="inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-muted">
                  {t(texts, "shared.cards.closed")}
                </span>
              ) : null}
              {/* დადებით რიცხვს გლობალური ჩამრთველიც სჭირდება; sold-out და
                  ულიმიტო („მიმდინარეობს მიღება") ვარიანტები ყოველთვის ჩანს */}
              {resolved.showSeats &&
              !ended &&
              !closed &&
              (seatsLeft === 0 ||
                seatsLeft === null ||
                settings.showPublicSeats) ? (
                seatsLeft === 0 ? (
                  <span className="inline-flex items-center rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-muted">
                    ადგილები ამოიწურა
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-pill bg-green-dark px-3 py-1 text-xs font-semibold text-white">
                    {seatsLeft !== null && seatsLeft > 0
                      ? `დარჩა ${seatsLeft} ადგილი`
                      : "მიმდინარეობს მიღება"}
                  </span>
                )
              ) : null}
            </div>

            <h1 className="mt-4 text-h2 font-bold text-ink">{course.title}</h1>

            {resolved.heroDescription ? (
              <p className="mt-3 text-base leading-7 text-ink-muted">
                {resolved.heroDescription}
              </p>
            ) : null}

            {/* კომპაქტური სპეც-სია (ყოფილი „ფაქტების ზოლის" ჩამნაცვლებელი) */}
            <SpecList facts={resolved.facts} />

            {!ended ? (
              <>
                {!isFree ? (
                  <div className="mt-5">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="text-h3 font-bold text-ink">
                        {monthlyPlan
                          ? `${formatGel(monthlyPlan.perMonthTetri)} / თვე`
                          : formatGel(baseTetri)}
                      </span>
                      {course.salePrice !== null && !monthlyPlan ? (
                        <span className="text-base text-ink-muted line-through">
                          {formatGel(course.priceRegular)}
                        </span>
                      ) : null}
                    </div>
                    {monthlyPlan ? (
                      <p className="mt-1 text-sm text-ink-muted">
                        {t(texts, "courses.landing.plan.fullPrefix")}{" "}
                        <span className="font-semibold text-ink">
                          {formatGel(plans.full.totalTetri)}
                        </span>
                        {course.salePrice !== null ? (
                          <span className="ml-2 line-through">
                            {formatGel(course.priceRegular)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {maxDiscount > 0 && !isFree ? (
                  <p className="mt-1 text-sm font-semibold text-green-dark">
                    {t(texts, "courses.landing.member.heroPrefix")} -{" "}
                    {formatGel(
                      discountedCoursePriceTetri(baseTetri, maxDiscount),
                    )}
                    -დან
                  </p>
                ) : null}

                {!closed ? (
                  <>
                    <div id="hero-cta" className="mt-5">
                      <ButtonLink href="#buy" className="w-full">
                        {resolved.ctaLabel}
                      </ButtonLink>
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">
                      {resolved.ctaMicrocopy}
                    </p>
                  </>
                ) : null}
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

      {/* ── 7. მობილურის sticky CTA — დასრულებულ/დახურულ მიღებაზე არ ჩანს ── */}
      {!ended && !closed ? (
        <StickyCta
          heroCtaId="hero-cta"
          formSectionId="buy"
          priceLabel={
            isFree
              ? undefined
              : monthlyPlan
                ? `${formatGel(monthlyPlan.perMonthTetri)}/თვე`
                : formatGel(baseTetri)
          }
          ctaLabel={resolved.ctaLabel}
        />
      ) : null}
    </>
  );
}
