"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CONSENT_EVENT,
  hasAnalyticsConsent,
  setImplicitConsent,
} from "@/lib/analytics-consent";
import { toGel } from "@/lib/money";
import type { PixelCategory } from "@/lib/pixel-meta";

/**
 * Meta Pixel — ყველა საჯარო გვერდზე ((site) და (landing) layout-ები;
 * ჯგუფები ერთად არასდროს რენდერდება, დუბლი გამორიცხულია). /admin-ზე არ დგას.
 *
 * ID საჯაროა (page source-ში ისედაც ჩანს) — fallback-ლიტერალით, რომ
 * NEXT_PUBLIC_* build-დროინდელი ინლაინინგის ხაფანგი გამოირიცხოს (GA-ს პატერნი).
 *
 * ივენთების სემანტიკა (მფლობელის სპეციფიკაცია, 2026-09-02):
 *   Purchase             — ბარათით რეალურად გადახდილი (/payment/status success)
 *   InitiateCheckout     — ფასიანი შეკვეთა შეიქმნა (value-თი)
 *   CompleteRegistration — უფასო რეგისტრაცია ღონისძიებაზე (value-ს გარეშე)
 *   Lead                 — მხოლოდ კონტაქტის დატოვება (განაცხადი/ქვიზი)
 * content_category ('club'|'drop-in'|'event'|'quiz') Custom Conversion-ების
 * საყრდენია; content_type ყოველთვის 'product'. eventID-ები
 * (purchase-/checkout-/registration-<orderRef>) მომავალ Conversions API-სთან
 * დედუპლიკაციას უმზადებს ნიადაგს.
 *
 * ივენთები ისვრის მხოლოდ რეალურ წარმატებაზე (state.order არსებობს —
 * honeypot-ის ყალბი success გამორიცხულია).
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "4304539139799742";

type FbqStub = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: FbqStub;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * fbq-ს queue-სტაბი — ოფიციალური სნიპეტის სემანტიკით, ოღონდ მოდულში:
 * ვინც პირველი დაუძახებს (track() თუ MetaPixel-ის ეფექტი), ის ქმნის.
 *
 * ⚠ race-fix (2026-09-03): აქამდე init afterInteractive-სნიპეტში იყო, ივენთის
 * ეფექტები კი hydration-ისას მასზე ადრე ეშვებოდა — `!window.fbq` guard-ი
 * პირდაპირ ჩატვირთვაზე ViewContent/Purchase-ს ჩუმად ყლაპავდა (SPA-ნავიგაციაზე
 * კი მუშაობდა, რაც ტესტს აბნევდა). ახლა ივენთი ყოველთვის რიგში დგება,
 * init გარანტირებულად პირველია და fbevents.js ჩატვირთვისას ყველას ამუშავებს.
 */
function ensureFbq(): ((...args: unknown[]) => void) | null {
  if (typeof window === "undefined" || !PIXEL_ID) return null;
  if (window.fbq) return window.fbq;

  const stub = function (this: unknown, ...args: unknown[]) {
    if (stub.callMethod) stub.callMethod(...args);
    else stub.queue.push(args);
  } as FbqStub;
  stub.queue = [];
  stub.push = stub;
  stub.loaded = true;
  stub.version = "2.0";
  window.fbq = stub;
  if (!window._fbq) window._fbq = stub;

  stub("init", PIXEL_ID);

  if (!document.getElementById("meta-pixel-lib")) {
    const script = document.createElement("script");
    script.id = "meta-pixel-lib";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  return stub;
}

export function MetaPixel({
  implicitConsent = false,
}: {
  /** ბანერი ადმინიდან გამორთულია → cookie-ს გარეშეც ეშვება (implicit) */
  implicitConsent?: boolean;
}) {
  const pathname = usePathname();
  /* render-ფაზაში, ეფექტებამდე — TrackViewContent/TrackPurchase-ის ეფექტებიც
     ამის მერე ეშვება; იდემპოტენტურია (StrictMode-ის ორმაგ render-ზეც უსაფრთხო) */
  setImplicitConsent(implicitConsent);
  /* ეტაპი 5: თანხმობამდე პიქსელი საერთოდ არ იტვირთება; ბანერის
     გადაწყვეტილება CONSENT_EVENT-ით reload-ის გარეშე აისახება */
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const sync = () => setConsented(hasAnalyticsConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  /* საწყისი ჩატვირთვა: init (ensureFbq) + PageView; SPA-ნავიგაცია: App
     Router-ის კლიენტ-გადასვლა დოკუმენტს არ ტვირთავს, ამიტომ ყოველ pathname-
     ცვლილებაზე PageView მეორდება. */
  useEffect(() => {
    if (!consented) return;
    if (pathname.startsWith("/admin")) return;
    ensureFbq()?.("track", "PageView");
  }, [pathname, consented]);

  /* noscript-სურათი მოიხსნა (ეტაპი 5): JS-ის გარეშე თანხმობა ვერ მიიღება,
     ე.ი. ვერც ტრეკინგი ეშვება */
  return null;
}

/* ── ივენთების helper-ები ─────────────────────────────────────── */

export type { PixelCategory } from "@/lib/pixel-meta";

/** ღირებული ივენთის სავალდებულო კონტენტ-ველები (Custom Conversion-ის საყრდენი) */
export type PixelContent = {
  category: PixelCategory;
  /** slug ან სათაური */
  name: string;
  /** [slug] — კატალოგური იდენტიფიკატორი */
  ids: string[];
  /** თეთრებში; გამოტოვებული = value/currency არ ეწერება (უფასო რეგისტრაცია) */
  valueTetri?: number;
  /** ქვიზის რეკომენდებული კლუბის slug (?src=quiz&club=) — ღირებულ ივენთს
   *  `source: "quiz"` + `quiz_club` custom-პარამეტრებად მიჰყვება, რომ Events
   *  Manager-ში ჩანდეს, რომელი რეგისტრაცია/ყიდვა ქვიზიდან მოვიდა */
  quizClub?: string | null;
};

/** ქვიზის კონტექსტი — იგივე გასაღებები, რაც bookings/subscriptions.attribution-ში */
function quizParams(quizClub: string | null | undefined): Record<string, unknown> {
  return quizClub ? { source: "quiz", quiz_club: quizClub } : {};
}

function contentParams(p: PixelContent): Record<string, unknown> {
  return {
    content_category: p.category,
    content_name: p.name,
    content_ids: p.ids,
    content_type: "product",
    ...(p.valueTetri != null
      ? { value: toGel(p.valueTetri), currency: "GEL" }
      : {}),
    ...quizParams(p.quizClub),
  };
}

/** დაბალდონიანი გამშვები — fbq-ს სტაბი საჭიროებისას თვითონვე იქმნება
 *  (ensureFbq), ამიტომ ივენთი ჩატვირთვის რიგითობაზე აღარ არის დამოკიდებული */
export function track(
  event: string,
  params?: Record<string, unknown>,
  eventId?: string,
) {
  /* ეტაპი 5: ივენთი მხოლოდ თანხმობით (implicit-რეჟიმში - cookie-ს გარეშეც) */
  if (!hasAnalyticsConsent()) return;
  const fbq = ensureFbq();
  if (!fbq) return;
  if (eventId) {
    fbq("track", event, params ?? {}, { eventID: eventId });
  } else {
    fbq("track", event, params ?? {});
  }
}

/** ფასიანი შეკვეთა შეიქმნა (ბარათი თუ გადმორიცხვა — გადახდამდე) */
export function trackInitiateCheckout(p: PixelContent & { orderRef: string }) {
  track("InitiateCheckout", contentParams(p), `checkout-${p.orderRef}`);
}

/** უფასო რეგისტრაცია ღონისძიებაზე — value განზრახ არ ეწერება */
export function trackCompleteRegistration(
  p: Omit<PixelContent, "valueTetri"> & { orderRef: string },
) {
  track("CompleteRegistration", contentParams(p), `registration-${p.orderRef}`);
}

/** კონტაქტის დატოვება — განაცხადი (RegistrationForm) ან ქვიზის შედეგი */
export function trackContactLead(p: {
  category?: PixelCategory;
  name?: string;
}) {
  /* content_ids/content_type სხვა ღირებული ივენთების იდენტურად — ერთი ველთა
     ნაკრები ყველა ივენთზე (მფლობელის სპეციფიკაცია) */
  track("Lead", {
    ...(p.category ? { content_category: p.category } : {}),
    ...(p.name
      ? { content_name: p.name, content_ids: [p.name], content_type: "product" }
      : {}),
  });
}

/** ქვიზის შედეგზე არჩეული გზა — custom ივენთი, რომ Events Manager-ში სამივე
 *  გზა შედარდეს (ღია კარი / ყიდვა / კლუბები). სტანდარტულ ივენთებს
 *  (Lead / InitiateCheckout / CompleteRegistration) და მათ სემანტიკას არ ეხება. */
export type QuizChoice = "openday" | "buy" | "clubs";
export function trackQuizChoice(choice: QuizChoice, club: string) {
  if (!hasAnalyticsConsent()) return;
  const fbq = ensureFbq();
  if (!fbq) return;
  fbq("trackCustom", "QuizChoice", {
    content_category: "quiz",
    content_name: club,
    content_ids: [club],
    content_type: "product",
    choice,
    ...quizParams(club),
  });
}

/* ── დეკლარაციული კომპონენტები server-გვერდებისთვის ──────────── */

/** ViewContent — პროდუქტის გვერდის ნახვა, ზუსტად ერთხელ. თანხმობის
 *  სიგნალსაც უსმენს: ბანერზე „ვეთანხმები"-ს დაჭერისას მიმდინარე გვერდის
 *  ViewContent-იც გადის, არა მხოლოდ PageView (მფლობელის მოთხოვნა, 2026-09-03) */
export function TrackViewContent(p: PixelContent) {
  const fired = useRef(false);
  useEffect(() => {
    const attempt = () => {
      if (fired.current || !hasAnalyticsConsent()) return;
      fired.current = true;
      track("ViewContent", contentParams(p));
    };
    attempt();
    window.addEventListener(CONSENT_EVENT, attempt);
    return () => window.removeEventListener(CONSENT_EVENT, attempt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * Purchase — ბარათით რეალურად გადახდილი. ორმაგი guard:
 * useRef (ერთი render-სესია) + sessionStorage (StatusPoller-ის
 * router.refresh() გვერდს remount-ის გარეშე მრავალჯერ არენდერებს,
 * და მომხმარებელმა შეიძლება გვერდი ხელითაც განაახლოს).
 */
export function TrackPurchase(
  p: PixelContent & { orderRef: string; valueTetri: number },
) {
  const fired = useRef(false);
  useEffect(() => {
    /* თანხმობის სიგნალსაც უსმენს — success-გვერდზე „ვეთანხმები"-ს დაჭერისას
       Purchase-იც გადის; guard-ები მხოლოდ რეალურ სროლაზე იწერება */
    const attempt = () => {
      if (fired.current || !hasAnalyticsConsent()) return;
      fired.current = true;
      const key = `fbq-purchase-${p.orderRef}`;
      try {
        if (window.sessionStorage.getItem(key)) return;
        window.sessionStorage.setItem(key, "1");
      } catch {
        /* private mode/blocked storage → მხოლოდ ref-guard რჩება */
      }
      track("Purchase", contentParams(p), `purchase-${p.orderRef}`);
    };
    attempt();
    window.addEventListener(CONSENT_EVENT, attempt);
    return () => window.removeEventListener(CONSENT_EVENT, attempt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
