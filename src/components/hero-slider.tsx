"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { HeroSlide } from "@/lib/db/schema";

/**
 * მთავარი გვერდის ჰერო-სლაიდერი — სლაიდები DB-დან (hero_slides).
 * crossfade: სლაიდები grid-ის ერთ უჯრაშია დაწყობილი (სიმაღლე ყველაზე მაღალ
 * სლაიდს მიჰყვება და გადართვისას არ ხტება), აქტიური opacity-100, დანარჩენი
 * opacity-0 + inert. ავტოგადართვა 7 წამში; hover-ზე/ფოკუსზე ჩერდება,
 * prefers-reduced-motion-ზე საერთოდ ითიშება.
 */

const AUTOPLAY_MS = 7000;

/* prefers-reduced-motion, როგორც გარე store — SSR-ზე false */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function SlideView({
  slide,
  index,
  active,
  carousel,
}: {
  slide: HeroSlide;
  index: number;
  active: boolean;
  carousel: boolean;
}) {
  const hidden = carousel && !active;
  /* h1 გვერდზე მხოლოდ ერთია — პირველი სლაიდის სათაური */
  const TitleTag: "h1" | "p" = index === 0 ? "h1" : "p";

  return (
    <div
      role={carousel ? "group" : undefined}
      aria-roledescription={carousel ? "slide" : undefined}
      aria-hidden={hidden ? true : undefined}
      inert={hidden ? true : undefined}
      className={cn(
        "relative col-start-1 row-start-1 flex items-center transition-opacity duration-700",
        hidden ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <Image
        src={slide.image}
        alt={slide.imageAlt}
        fill
        priority={index === 0}
        unoptimized
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-ink/85 via-ink/65 to-ink/35"
      />
      <div className="container-page relative w-full py-12 sm:py-16">
        <div className="max-w-3xl">
          {slide.eyebrow ? (
            <p className="eyebrow text-green-light">{slide.eyebrow}</p>
          ) : null}
          <TitleTag className="mt-4 text-display font-bold text-white">
            {slide.title}
          </TitleTag>
          {slide.sloganUnder ? (
            <p className="eyebrow mt-4 text-green-light">{slide.sloganUnder}</p>
          ) : null}
          {slide.stats.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
              {slide.stats.map((stat) => (
                <div key={`${stat.value}-${stat.label}`}>
                  <p className="text-h1 font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-white/75">{stat.label}</p>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-6 max-w-xl text-lead text-white/85">{slide.body}</p>
          {(slide.cta1Label && slide.cta1Href) ||
          (slide.cta2Label && slide.cta2Href) ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {slide.cta1Label && slide.cta1Href ? (
                <ButtonLink href={slide.cta1Href} size="lg" variant="inverted">
                  {slide.cta1Label}
                </ButtonLink>
              ) : null}
              {slide.cta2Label && slide.cta2Href ? (
                <ButtonLink
                  href={slide.cta2Href}
                  size="lg"
                  variant="invertedOutline"
                >
                  {slide.cta2Label}
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const count = slides.length;
  const isCarousel = count > 1;

  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    () => false,
  );
  /* ხელით ნავიგაცია key-ს ზრდის — ეფექტი თავიდან ეშვება და ტაიმერი ნულდება */
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    void timerKey; // მხოლოდ ტაიმერის გადასატვირთად
    if (!isCarousel || hovered || focused || reducedMotion) return;
    const id = setInterval(
      () => setActive((current) => (current + 1) % count),
      AUTOPLAY_MS,
    );
    return () => clearInterval(id);
  }, [isCarousel, count, hovered, focused, reducedMotion, timerKey]);

  const goTo = useCallback(
    (index: number) => {
      setActive(((index % count) + count) % count);
      setTimerKey((key) => key + 1);
    },
    [count],
  );

  if (count === 0) return null;

  return (
    <section
      aria-roledescription={isCarousel ? "carousel" : undefined}
      aria-label={isCarousel ? "მთავარი ბანერები" : undefined}
      onMouseEnter={isCarousel ? () => setHovered(true) : undefined}
      onMouseLeave={isCarousel ? () => setHovered(false) : undefined}
      onFocusCapture={isCarousel ? () => setFocused(true) : undefined}
      onBlurCapture={
        isCarousel
          ? (event) => {
              if (
                !event.currentTarget.contains(event.relatedTarget as Node | null)
              ) {
                setFocused(false);
              }
            }
          : undefined
      }
      className="relative isolate grid min-h-[480px] overflow-hidden bg-green-dark sm:min-h-[440px]"
    >
      {slides.map((slide, index) => (
        <SlideView
          key={slide.id}
          slide={slide}
          index={index}
          active={index === active}
          carousel={isCarousel}
        />
      ))}

      {isCarousel ? (
        <>
          <div className="absolute bottom-9 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`სლაიდი ${index + 1}`}
                aria-current={index === active ? true : undefined}
                className={cn(
                  "h-2.5 rounded-pill transition-all duration-300",
                  index === active
                    ? "w-7 bg-white"
                    : "w-2.5 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>

          <div className="absolute right-4 bottom-5 z-10 flex gap-2">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              aria-label="წინა სლაიდი"
              className="flex size-11 items-center justify-center rounded-pill bg-white/15 text-2xl text-white hover:bg-white/25"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              aria-label="შემდეგი სლაიდი"
              className="flex size-11 items-center justify-center rounded-pill bg-white/15 text-2xl text-white hover:bg-white/25"
            >
              ›
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
