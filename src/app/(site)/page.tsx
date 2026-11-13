import type { Metadata } from "next";
import { ClubCard, CourseCard } from "@/components/cards";
import { HeroSlider } from "@/components/hero-slider";
import { NewsletterForm } from "@/components/newsletter-form";
import { PricingOffers } from "@/components/pricing-offers";
import { StoryCard } from "@/components/story-card";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { getPricingSettings } from "@/lib/db/queries/availability";
import { listClubs, listFeaturedCourses } from "@/lib/db/queries/catalog";
import { listContentPosts } from "@/lib/db/queries/content";
import { listHeroSlides } from "@/lib/db/queries/hero";
import { WORK_TYPES } from "@/lib/db/schema";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { clubMonthlyPrice } from "@/lib/pricing";
import { siteConfig } from "@/lib/site-config";
import { t } from "@/lib/site-texts";
import { homeJsonLd } from "@/lib/structured-data";

/** ყველა კონტენტი DB-დან — admin-ის ცვლილება მაშინვე უნდა აისახოს (§5) */
export const dynamic = "force-dynamic";

/**
 * გაზიარების სურათი = პირველი აქტიური ჰერო-სლაიდი, რომ FB/მესენჯერზე ზუსტად
 * ის ჩანდეს, რასაც სტუმარი პირველად ხედავს (ადმინიდან სლაიდის შეცვლას თავად
 * გაჰყვება). სლაიდების გარეშე — სტატიკური og-image.jpg. openGraph აქ მთლიანად
 * ხელახლა იწერება: Next ბავშვის openGraph-ს root-ისას მთლიანად ანაცვლებს.
 *
 * ⚠ `title` აქ განზრახ არ იწერება: მთავარი გვერდის სათაური root-ლეიაუთის
 * `title.default`-ია (ადმინის „Google და გაზიარება" → seo.home.title). თუ აქ
 * ჩაიწერება, template მიაწერს „| სივრცე"-ს და სახელი გაორმაგდება.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [slides, texts] = await Promise.all([listHeroSlides(), getSiteTexts()]);
  const first = slides[0];
  return {
    description: t(texts, "seo.home.description"),
    /* კანონიკური მისამართი — www/utm ვარიანტები ერთ გვერდად ითვლება */
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "ka_GE",
      siteName: siteConfig.name,
      title: t(texts, "seo.og.title"),
      description: t(texts, "seo.og.description"),
      images: first
        ? [{ url: first.image, alt: first.imageAlt }]
        : [
            {
              url: "/images/og-image.jpg",
              width: 1200,
              height: 630,
              alt: "„სივრცის“ ცენტრი - ახალგაზრდები შეხვედრაზე",
            },
          ],
    },
  };
}

export default async function HomePage() {
  const [clubs, courses, featured, pricing, slides, texts] = await Promise.all([
    listClubs(),
    listFeaturedCourses(3),
    /* მეტს ვიღებთ, რომ მონიშნული ნამუშევარი ახალმა სიახლემ არ გამოდევნოს */
    listContentPosts({ featuredOnly: true, limit: 12 }),
    getPricingSettings(),
    listHeroSlides(),
    getSiteTexts(),
  ]);

  /* კლუბის ფასის ერთადერთი წყარო — pricing_settings; ბარათებზეც ეს მიდის */
  const clubPair = clubMonthlyPrice(pricing);

  /* მთავარ გვერდზე მონიშნული ნამუშევრები პრიორიტეტულია: work_* jer, სიახლე
     მერე; თითო ჯგუფში თარიღით (query უკვე desc-ია, sort სტაბილურია) → პირველი 3 */
  const workTypeSet = new Set<string>(WORK_TYPES);
  const stories = [...featured]
    .sort(
      (a, b) =>
        (workTypeSet.has(a.type) ? 0 : 1) - (workTypeSet.has(b.type) ? 0 : 1),
    )
    .slice(0, 3);

  return (
    <>
      {/* schema.org — საიტის სახელი და ორგანიზაცია Google-ისთვის */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: homeJsonLd(texts) }}
      />

      {/* 1 — ჰერო-სლაიდერი: სლაიდები DB-დან (hero_slides), ტექსტი ფოტოზე
             მხოლოდ მუქი overlay-თი (რეფერენსების პრინციპი) */}
      <HeroSlider slides={slides} />

      {/* 2 — კლუბები (დომინანტი) */}
      <Section tone="cream">
        <SectionHeader
          eyebrow={t(texts, "home.clubs.eyebrow")}
          title={t(texts, "home.clubs.title")}
          description={t(texts, "home.clubs.description")}
          action={{ href: "/clubs", label: t(texts, "home.clubs.action") }}
        />
        {clubs.length === 0 ? (
          <EmptyState
            title={t(texts, "home.clubs.empty.title")}
            description={t(texts, "home.clubs.empty.description")}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {clubs.slice(0, 3).map((club) => (
              <ClubCard key={club.id} club={club} pricePair={clubPair} />
            ))}
          </div>
        )}

        {/* ტესტის თიზერი — მუქ მწვანე ბარათად გამოკვეთილი (Card-ს cn-merge არ
            აქვს, ამიტომ ცალკე div მუქი ფონით, არა className-გადაფარვა) */}
        <div className="mt-6 flex flex-col gap-4 rounded-card bg-green-dark p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-white">
            {t(texts, "home.quiz.teaser")}
          </p>
          <ButtonLink
            href="/tests/romeli-klubia-shentvis"
            variant="inverted"
            className="shrink-0"
          >
            {t(texts, "home.quiz.cta")}
          </ButtonLink>
        </div>
      </Section>

      {/* 3 — კურსები */}
      <Section tone="white">
        <SectionHeader
          eyebrow={t(texts, "home.courses.eyebrow")}
          title={t(texts, "home.courses.title")}
          description={t(texts, "home.courses.description")}
          action={{ href: "/courses", label: t(texts, "home.courses.action") }}
        />
        {courses.length === 0 ? (
          <EmptyState
            title={t(texts, "home.courses.empty.title")}
            description={t(texts, "home.courses.empty.description")}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </Section>

      {/* 4 — შეთავაზებები: იგივე სამი ბარათი, რაც /membership-ზე */}
      <Section tone="cream">
        <SectionHeader
          eyebrow={t(texts, "home.membership.eyebrow")}
          title={t(texts, "home.membership.title")}
          description={t(texts, "home.membership.description")}
          action={{
            href: "/membership",
            label: t(texts, "home.membership.action"),
          }}
        />
        <PricingOffers settings={pricing} texts={texts} titleAs="h3" />
      </Section>

      {/* 5 — ისტორიები + გამოხმაურებები */}
      <Section tone="white">
        <SectionHeader
          eyebrow={t(texts, "home.stories.eyebrow")}
          title={t(texts, "home.stories.title")}
          description={t(texts, "home.stories.description")}
          action={{ href: "/stories", label: t(texts, "home.stories.action") }}
        />
        {stories.length === 0 ? (
          <EmptyState
            title={t(texts, "home.stories.empty.title")}
            description={t(texts, "home.stories.empty.description")}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((post) => (
              <StoryCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </Section>

      {/* 6 — B2B ბენდი (დისკრეტული) */}
      <Section tone="dark">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="eyebrow text-green-light">
              {t(texts, "home.b2b.eyebrow")}
            </p>
            <h2 className="mt-3 text-h2 font-bold">
              {t(texts, "home.b2b.title")}
            </h2>
            <p className="mt-4 max-w-xl text-lead text-white/80">
              {t(texts, "home.b2b.body")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <ButtonLink href="/spaces" size="lg" variant="inverted">
              {t(texts, "home.b2b.cta1")}
            </ButtonLink>
            <ButtonLink href="/partner" size="lg" variant="invertedOutline">
              {t(texts, "home.b2b.cta2")}
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* 7 — ნიუსლეთერი + კონტაქტი */}
      <Section tone="cream">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{t(texts, "home.newsletter.eyebrow")}</p>
            <h2 className="mt-3 text-h2 font-bold text-green-dark">
              {t(texts, "home.newsletter.title")}
            </h2>
            <p className="mt-3 text-ink-muted">
              {t(texts, "home.newsletter.body")}
            </p>
            <div className="mt-6 max-w-md">
              <NewsletterForm source="home" />
            </div>
          </div>

          <Card>
            <p className="eyebrow">{t(texts, "home.contact.eyebrow")}</p>
            <h3 className="mt-3 text-h3 font-bold text-green-dark">
              {t(texts, "home.contact.title")}
            </h3>
            <div className="mt-4 flex flex-col gap-2 text-ink-muted">
              <a
                href={`mailto:${siteConfig.email}`}
                className="hover:text-green-dark"
              >
                {siteConfig.email}
              </a>
              <a
                href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                className="hover:text-green-dark"
              >
                {siteConfig.phone}
              </a>
              <span>{siteConfig.address}</span>
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-dark"
              >
                {t(texts, "home.contact.facebook")}
              </a>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-dark"
              >
                {t(texts, "home.contact.instagram")}
              </a>
            </div>
            <ButtonLink
              href="/contact"
              variant="secondary"
              className="mt-6 w-fit"
            >
              {t(texts, "home.contact.cta")}
            </ButtonLink>
            <p className="mt-4 text-sm text-ink-muted">
              {t(texts, "home.contact.whatsapp")}
            </p>
          </Card>
        </div>
      </Section>
    </>
  );
}
