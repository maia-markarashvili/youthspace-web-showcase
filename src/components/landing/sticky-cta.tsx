"use client";

import { useEffect, useState } from "react";

/**
 * მობილურის sticky ქვედა CTA-ზოლი (ლენდინგები): ჩნდება, როცა ჰეროს CTA
 * (sentinel id-ით) ეკრანიდან გავიდა, და ქრება, როცა ყიდვის ბლოკი ჩანს.
 * ≥md ეკრანებზე საერთოდ არ რენდერდება ხილულად (md:hidden).
 */
export function StickyCta({
  heroCtaId,
  formSectionId,
  priceLabel,
  ctaLabel,
}: {
  heroCtaId: string;
  formSectionId: string;
  /** არ არსებობს (უფასო ღონისძიება) → ფასის ადგილი ცარიელია, ღილაკი მთელ სიგანეზე */
  priceLabel?: string;
  ctaLabel: string;
}) {
  const [heroOut, setHeroOut] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroCtaId);
    const form = document.getElementById(formSectionId);
    if (!hero || !form) return;

    const heroObserver = new IntersectionObserver(
      ([entry]) => setHeroOut(!entry.isIntersecting),
      { threshold: 0 },
    );
    const formObserver = new IntersectionObserver(
      ([entry]) => setFormVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    heroObserver.observe(hero);
    formObserver.observe(form);
    return () => {
      heroObserver.disconnect();
      formObserver.disconnect();
    };
  }, [heroCtaId, formSectionId]);

  const visible = heroOut && !formVisible;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {priceLabel ? (
          <p className="text-lg font-bold text-ink">{priceLabel}</p>
        ) : null}
        <a
          href={`#${formSectionId}`}
          tabIndex={visible ? 0 : -1}
          className={`inline-flex min-h-11 items-center justify-center rounded-pill bg-green-dark px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#264D2A] ${
            priceLabel ? "" : "flex-1"
          }`}
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
