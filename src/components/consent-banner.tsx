"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CONSENT_EVENT,
  deleteAnalyticsCookies,
  readConsent,
  writeConsent,
  type ConsentState,
} from "@/lib/analytics-consent";

/**
 * თანხმობის ბანერი (ეტაპი 5; 2026-09-03 გადაწყობილი ორსაფეხურიანად,
 * მფლობელის მიერ არჩეული bonline.bog.ge-ს პატერნით):
 *
 *  · საწყისი ხედი — სათაური + ერთი წინადადება + „დადასტურება" (ყველას
 *    ჩართვა) და „მართვა" ბმული;
 *  · მართვის ხედი — „აუცილებელი" (ყოველთვის ჩართული, ჩაკეტილი toggle) და
 *    „მარკეტინგული" (Meta Pixel + GA, ერთი toggle) + „დადასტურება", რომელიც
 *    toggle-ის მდგომარეობას ინახავს. მარკეტინგი ნაგულისხმევად ჩართულია —
 *    თანხმობა მაინც ცხადი კლიკით სრულდება, ჩუმი თანხმობა არ არსებობს.
 *
 * ქვედა ფიქსირებული ზოლია (მოდალი არა): გვერდი უკან იკითხება, layout shift
 * არ არის. ბიბლიოთეკის გარეშე, ინლაინ. გამორთვა = Meta/GA-ს პირველადი
 * ქუქიების წაშლაც.
 *
 * initialConsent სერვერიდან მოდის (layout კითხულობს cookie-ს) — გადაწყვეტილი
 * მომხმარებელი ბანერს SSR-შივე ვერ დაინახავს, flash არ ხდება. ფუტერის
 * „ქუქიების პარამეტრები" resetConsent()-ით აბრუნებს.
 */

/** ჩართვა/გამორთვის გადამრთველი — role="switch", უბიბლიოთეკო */
function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        /* ჩაკეტილი-ჩართული = მიმქრალი მწვანე (ნაცარი „გამორთულს" ჰგავდა);
           აქტიური-გამორთული = სრული ink-muted (გამჭვირვალე ვერსია WCAG 1.4.11-ის
           3:1 კონტრასტს ვერ აჭარბებდა) */
        disabled
          ? "cursor-default bg-green-dark/50"
          : checked
            ? "cursor-pointer bg-green-dark"
            : "cursor-pointer bg-ink-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-card transition-all ${
          checked ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function ConsentBanner({
  initialConsent,
  enabled = true,
}: {
  initialConsent: ConsentState;
  /** ადმინის toggle (shared.cookies.banner): false = ბანერი თავისით არ
   *  ჩნდება (implicit-რეჟიმი), მაგრამ ფუტერიდან მაინც გამოძახებადია */
  enabled?: boolean;
}) {
  const [visible, setVisible] = useState(enabled && initialConsent === null);
  const [view, setView] = useState<"intro" | "manage">("intro");
  const [marketing, setMarketing] = useState(true);
  const backRef = useRef<HTMLButtonElement>(null);
  const manageBtnRef = useRef<HTMLButtonElement>(null);
  const viewMounted = useRef(false);

  /* ხედის გადართვა ფოკუსის მქონე ღილაკს აქრობს (ternary swap) — ფოკუსი
     body-ზე რომ არ ჩავარდეს, ახალი ხედის პირველ კონტროლზე გადაგვაქვს */
  useEffect(() => {
    if (!viewMounted.current) {
      viewMounted.current = true;
      return;
    }
    if (view === "manage") backRef.current?.focus();
    else manageBtnRef.current?.focus();
  }, [view]);

  useEffect(() => {
    /* განზრახ enabled-შემოწმების გარეშე: გამორთულ რეჟიმშიც ფუტერის
       resetConsent()-ი CONSENT_EVENT-ით ბანერს იძახებს - opt-out გზა ცოცხალია */
    const sync = () => {
      const open = readConsent() === null;
      setVisible(open);
      /* ხელახლა გახსნისას (ფუტერიდან გამოხმობა) სუფთა მდგომარეობიდან იწყება */
      if (open) {
        setView("intro");
        setMarketing(true);
      }
    };
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!visible) return null;

  const confirm = (accepted: boolean) => {
    if (accepted) {
      writeConsent("yes");
    } else {
      writeConsent("no");
      deleteAnalyticsCookies();
    }
  };

  return (
    <div
      role="region"
      aria-label="Cookie ფაილებზე წვდომა"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto border-t border-line bg-white p-4 shadow-card"
    >
      {view === "intro" ? (
        <div className="container-page flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p className="font-bold text-ink">Cookie ფაილებზე წვდომა</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              Cookie ფაილებს ვიყენებთ ვებგვერდის სწორად ფუნქციონირებისა და
              შენი გამოცდილების გაუმჯობესებისთვის
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Button type="button" variant="primary" onClick={() => confirm(true)}>
              დადასტურება
            </Button>
            <button
              ref={manageBtnRef}
              type="button"
              onClick={() => setView("manage")}
              className="min-h-11 cursor-pointer px-3 text-sm font-semibold text-green-dark underline-offset-4 hover:underline"
            >
              მართვა
            </button>
          </div>
        </div>
      ) : (
        <div className="container-page">
          <div className="flex items-center gap-2">
            <button
              ref={backRef}
              type="button"
              aria-label="უკან"
              onClick={() => {
                /* შეუნახავი toggle-არჩევანი უკან გასვლისას უქმდება — საწყისი
                   ხედის „დადასტურება" ყოველთვის სუფთა „ყველას ჩართვაა" */
                setMarketing(true);
                setView("intro");
              }}
              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:text-ink"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <p className="font-bold text-ink">Cookie ფაილები</p>
          </div>

          <div className="mt-3 flex max-w-3xl flex-col gap-4">
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="font-semibold text-ink">აუცილებელი</p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  საჭიროა ვებგვერდის სწორად ფუნქციონირებისთვის და ყოველთვის
                  ჩართულია
                </p>
              </div>
              <Toggle checked disabled label="აუცილებელი Cookie ფაილები" />
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="font-semibold text-ink">მარკეტინგული</p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  გამოიყენება შენს ინტერესებზე მორგებული პროდუქტებისა და
                  სერვისების შესათავაზებლად (Google Analytics, Meta Pixel)
                </p>
              </div>
              <Toggle
                checked={marketing}
                onChange={setMarketing}
                label="მარკეტინგული Cookie ფაილები"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/privacy"
                className="text-sm font-semibold text-green-dark underline-offset-4 hover:underline"
              >
                პერსონალურ მონაცემთა დაცვის წესები
              </Link>
              <Button
                type="button"
                variant="primary"
                onClick={() => confirm(marketing)}
              >
                დადასტურება
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
