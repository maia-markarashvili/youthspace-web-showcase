"use client";

import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";

/**
 * გადახდის გვერდზე გადამისამართება ყიდვის შემდეგ.
 *
 * მცირე დაყოვნება იმისთვისაა, რომ მშობელი ფორმის Meta Pixel-ის Lead-ივენთმა
 * გასვლა მოასწროს. ხილული ღილაკიც რჩება — თუ ბრაუზერმა ავტომატური
 * გადამისამართება დაბლოკა, მომხმარებელი ჩიხში არ აღმოჩნდება.
 * raw `<a>` განზრახ: მისამართი გარეა, next/link აქ არ გამოდგება.
 */
export function CardRedirect({
  url,
  notice,
  fallbackLabel,
}: {
  url: string;
  notice: string;
  fallbackLabel: string;
}) {
  useEffect(() => {
    const timer = setTimeout(() => window.location.assign(url), 400);
    return () => clearTimeout(timer);
  }, [url]);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-green-mid bg-green-light/30 p-5">
      <p className="text-sm leading-6 text-ink">{notice}</p>
      <a href={url} className={buttonClasses("primary", "md", "w-fit")}>
        {fallbackLabel}
      </a>
    </div>
  );
}
