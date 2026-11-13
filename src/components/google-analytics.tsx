"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  hasAnalyticsConsent,
  setImplicitConsent,
} from "@/lib/analytics-consent";

/**
 * Google Analytics 4 — პრივატულობა-პირველი კონფიგურაცია (მფლობელის წესი,
 * 2026-09-03):
 *  · page_location/page_referrer ყოველთვის query-ს ᲒᲐᲠᲔᲨᲔ იგზავნება —
 *    ტოკენი/პარამეტრი Google-მდე ვერასდროს აღწევს; send_page_view: false
 *    და page_location კონფიგურაციაშივეა გადაწერილი, რომ ყველა ივენთმა
 *    გაწმენდილი მისამართი წაიღოს.
 *  · /admin/* და /ticket/* — GA საერთოდ არ იტვირთება (პირდაპირ გახსნაზე
 *    სკრიპტიც არ ჩნდება; SPA-გადასვლაზე კი config-ს გაწმენდილი, ტოკენის
 *    გარეშე page_location ედება და page_view არ ისვრის).
 *  · page_view pathname-ცვლილებაზე ხელით — MetaPixel-ის პატერნი: gtag-ის
 *    queue-სტაბი მოდულშივე იქმნება, ივენთი ჩატვირთვის რიგითობას არ ელოდება.
 *
 * GA Measurement ID საიდუმლო არაა (client-ში ისედაც ჩანს) — fallback-ით,
 * რომ build-time env-ინლაინინგზე არ იყოს დამოკიდებული.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-REXZ4JWQM6";

/** ამ გზებზე GA არ იტვირთება და page_view არ ისვრის */
const BLOCKED_RE = /^\/(admin|ticket)(\/|$)/;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** origin + pathname — query/hash არასდროს */
function cleanLocation(pathname: string): string {
  return window.location.origin + pathname;
}

function cleanReferrer(): string {
  try {
    if (!document.referrer) return "";
    const url = new URL(document.referrer);
    return url.origin + url.pathname;
  } catch {
    return "";
  }
}

/** დაბლოკილ გზაზე pathname-შიც ტოკენია (/ticket/<token>) — სეგმენტამდე იჭრება */
function scrubbedBlockedLocation(pathname: string): string {
  const segment = pathname.split("/")[1] ?? "";
  return `${window.location.origin}/${segment}`;
}

function gtagConfig(pageLocation: string) {
  window.gtag?.("config", GA_ID, {
    send_page_view: false,
    page_location: pageLocation,
    page_referrer: cleanReferrer(),
  });
}

/** gtag-ის queue-სტაბი + სკრიპტის ერთჯერადი ჩატვირთვა (ensureFbq-ის ანალოგი) */
function ensureGtag(initialLocation: string): boolean {
  if (typeof window === "undefined" || !GA_ID) return false;
  if (window.gtag) return true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(..._args: unknown[]) {
    // gtag.js-ის ოფიციალური სტაბი arguments-ობიექტს ელოდება, არა მასივს
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  gtagConfig(initialLocation);

  if (!document.getElementById("ga4-lib")) {
    const script = document.createElement("script");
    script.id = "ga4-lib";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
  }
  return true;
}

export function GoogleAnalytics({
  implicitConsent = false,
}: {
  /** ბანერი ადმინიდან გამორთულია → cookie-ს გარეშეც ეშვება (implicit) */
  implicitConsent?: boolean;
}) {
  const pathname = usePathname();
  /* render-ფაზაში, ეფექტებამდე; იდემპოტენტური */
  setImplicitConsent(implicitConsent);
  /* ეტაპი 5: თანხმობამდე GA საერთოდ არ იტვირთება */
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const sync = () => setConsented(hasAnalyticsConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!GA_ID || !consented) return;
    if (BLOCKED_RE.test(pathname)) {
      /* პირდაპირ გახსნაზე gtag არც იქმნება; თუ SPA-თი შემოვიდა და gtag უკვე
         ცოცხალია — config-ს გაწმენდილი მისამართი ედება, page_view კი არა */
      if (window.gtag) gtagConfig(scrubbedBlockedLocation(pathname));
      return;
    }
    const location = cleanLocation(pathname);
    if (!ensureGtag(location)) return;
    gtagConfig(location);
    window.gtag?.("event", "page_view", {
      page_location: location,
      page_referrer: cleanReferrer(),
    });
  }, [pathname, consented]);

  return null;
}
