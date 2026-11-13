"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CabinetReferral } from "@/lib/db/queries/account";

/** ტექსტები ადმინიდან (account.referral.*) — თარგები სერვერზეა შევსებული */
export type ReferralCardTexts = {
  title: string;
  /** {percent} უკვე ჩასმულია */
  body: string;
  copy: string;
  copied: string;
  /** {n} უკვე ჩასმულია */
  accrued: string;
  /** {amount} უკვე ჩასმულია */
  nextRenewal: string;
  footnote: string;
};

/**
 * „მოიწვიე მეგობარი" — კოდი ყიდვისთანავე ერთხელ ჩნდებოდა წარმატების ეკრანზე
 * და მერე იკარგებოდა; აქ ის მუდმივად ხელმისაწვდომია (მფლობელის შენიშვნა).
 * client-კომპონენტია მხოლოდ დაკოპირების ღილაკის გამო.
 */
export function ReferralCard({
  referral,
  texts,
}: {
  referral: CabinetReferral;
  texts: ReferralCardTexts;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard აკრძალულია (http/ძველი ბრაუზერი) — კოდი ისედაც ჩანს ეკრანზე */
    }
  }

  return (
    <Card className="mt-6">
      <h2 className="text-h3 font-bold text-green-dark">{texts.title}</h2>
      <p className="mt-1 text-sm leading-6 text-ink-muted">{texts.body}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-card border border-line bg-cream px-4 py-2.5 font-mono text-lg font-bold tracking-wider text-green-dark">
          {referral.code}
        </span>
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? texts.copied : texts.copy}
        </Button>
      </div>

      {referral.availableCredits > 0 ? (
        <p className="mt-4 rounded-card border border-green-mid bg-green-light/30 p-4 text-sm leading-6 text-ink">
          {texts.accrued}
          {referral.nextRenewalAmountTetri !== null
            ? ` ${texts.nextRenewal}`
            : ""}
        </p>
      ) : (
        <p className="mt-3 text-xs leading-5 text-ink-muted">
          {texts.footnote}
        </p>
      )}
    </Card>
  );
}
