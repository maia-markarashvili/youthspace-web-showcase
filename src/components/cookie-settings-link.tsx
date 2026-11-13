"use client";

import { resetConsent } from "@/lib/analytics-consent";

/**
 * ფუტერის „ქუქიების პარამეტრები" (ეტაპი 5) — ერთი კლიკი თანხმობას ხსნის:
 * არჩევანი ცარიელდება, Meta/GA-ს პირველადი ქუქიები იშლება და ბანერი
 * ბრუნდება ხელახალი გადაწყვეტილებისთვის.
 */
export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={resetConsent}
      className="cursor-pointer text-left hover:text-green-dark"
    >
      {label}
    </button>
  );
}
