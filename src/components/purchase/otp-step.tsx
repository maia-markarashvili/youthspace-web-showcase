"use client";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/form-field";
import type { OtpChallenge } from "@/lib/otp";

/**
 * ორსაფეხურიანი გადმორიცხვის ნაკადის მე-2 საფეხური (§4) — იმავე
 * `<form action={...}>`-შია, რაც ჩვეულებრივი ყიდვის ველები: React 19
 * action-ის შემდეგ uncontrolled ველებს ასუფთავებს, ამიტომ step-1-ის
 * მნიშვნელობები სერვერიდან `otp.resume`-ით ბრუნდება და hidden
 * input-ებად იწერება - არა ხელახლა შესაყვანად.
 *
 * ნომრის შეცვლა სრული განახლებით ხდება (`onEdit`) - მარტივი და საიმედო,
 * useActionState-ის state-ის ხელით გასუფთავებაზე გაცილებით ნაკლები რისკით.
 */
export function OtpStep({
  otp,
  pending,
  error,
  message,
  onEdit,
}: {
  otp: OtpChallenge;
  pending: boolean;
  error?: string;
  message?: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-line bg-cream p-4 text-sm text-ink">
        SMS-კოდი გაიგზავნა ნომერზე <strong>{otp.phoneMasked}</strong> - 10
        წუთის განმავლობაში მოქმედებს.
        {message ? <p className="mt-1 text-ink-muted">{message}</p> : null}
      </div>

      {Object.entries(otp.resume).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} readOnly />
      ))}
      <input type="hidden" name="otpId" value={otp.otpId} readOnly />

      <TextField
        label="დადასტურების კოდი"
        name="otpCode"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        autoFocus
        error={error}
      />

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "მოწმდება…" : "დადასტურება"}
      </Button>

      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-semibold text-ink-muted underline"
      >
        ნომრის შეცვლა
      </button>
    </div>
  );
}
