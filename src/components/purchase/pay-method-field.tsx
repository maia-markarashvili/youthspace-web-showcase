"use client";

import { useState } from "react";
import {
  ApplePayMark,
  GooglePayMark,
  MastercardMark,
  VisaMark,
} from "@/components/card-brand-marks";
import { cn } from "@/lib/cn";

/**
 * გადახდის მეთოდის არჩევანი: ბარათი ან ბანკით გადმორიცხვა.
 * `cardEnabled=false` (Flitt გამორთულია) — არჩევანი არ ჩანს და ფორმა
 * უცვლელად, გადმორიცხვით მუშაობს.
 */
export function PayMethodField({
  cardEnabled,
  label,
  cardLabel,
  transferLabel,
}: {
  cardEnabled: boolean;
  label: string;
  cardLabel: string;
  transferLabel: string;
}) {
  const [method, setMethod] = useState<"card" | "transfer">("card");

  if (!cardEnabled) {
    return <input type="hidden" name="payMethod" value="transfer" />;
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        {(
          [
            ["card", cardLabel],
            ["transfer", transferLabel],
          ] as const
        ).map(([value, text]) => (
          <label
            key={value}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-card border bg-white px-4 py-2.5 text-sm font-semibold transition-colors",
              method === value
                ? "border-green-dark text-ink"
                : "border-line text-ink-muted hover:border-green-mid",
            )}
          >
            <input
              type="radio"
              name="payMethod"
              value={value}
              checked={method === value}
              onChange={() => setMethod(value)}
              className="size-4 shrink-0 accent-green-dark"
            />
            <span className="inline-flex items-center gap-1.5">
              {text}
              {value === "card" ? (
                <>
                  <VisaMark className="h-4 w-auto" />
                  <MastercardMark className="h-4 w-auto" />
                  <ApplePayMark className="h-4 w-auto" />
                  <GooglePayMark className="h-4 w-auto" />
                </>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
