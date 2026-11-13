"use client";

import { cn } from "@/lib/cn";
import { formatGel } from "@/lib/money";
import type { CoursePayPlan, CoursePaymentPlans } from "@/lib/pricing";

/** ადმინიდან რედაქტირებადი წარწერები — ციფრები JSX-ში ეწებება */
export type PayPlanTexts = {
  legend: string;
  monthly: string;
  monthlyHint: string;
  full: string;
  fullHint: string;
  totalNote: string;
  saveNote: string;
};

/**
 * „თვიურად თუ ერთიანად“ — კონტროლირებადი არჩევანი: submit-ღილაკის თანხაც
 * ამაზეა დამოკიდებული, ამიტომ მნიშვნელობა მშობელ ფორმაშია.
 *
 * განვადების გარეშე კურსზე მხოლოდ hidden input ირენდერება — გვერდი
 * დღევანდელის იდენტურია, სერვერის კონტრაქტი კი ერთი (იგივე ხერხი, რაც
 * PayMethodField-ს აქვს გამორთულ Flitt-ზე).
 *
 * თვიური **პირველია და დეფოლტად მონიშნული** (მფლობელის წესი, 2026-09-19);
 * მის ქვეშ ჯამი ინფორმაციულად ჩანს, ერთიანი კი არჩევად ოფციად რჩება.
 */
export function PayPlanField({
  plans,
  value,
  onChange,
  texts,
}: {
  plans: CoursePaymentPlans;
  value: CoursePayPlan;
  onChange: (plan: CoursePayPlan) => void;
  texts: PayPlanTexts;
}) {
  const monthly = plans.monthly;
  if (!monthly) return <input type="hidden" name="payPlan" value="full" />;

  const options = [
    {
      value: "monthly" as const,
      title: texts.monthly,
      price: `${formatGel(monthly.perMonthTetri)} × ${monthly.months} თვე`,
      hint: texts.monthlyHint,
    },
    {
      value: "full" as const,
      title: texts.full,
      price: formatGel(plans.full.totalTetri),
      hint: texts.fullHint,
    },
  ];

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-ink">{texts.legend}</legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex min-h-11 flex-1 cursor-pointer items-start gap-2.5 rounded-card border bg-white px-4 py-3 text-sm transition-colors",
              value === option.value
                ? "border-green-dark text-ink"
                : "border-line text-ink-muted hover:border-green-mid",
            )}
          >
            <input
              type="radio"
              name="payPlan"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 shrink-0 accent-green-dark"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{option.title}</span>
              <span
                className={cn(
                  "text-base font-bold",
                  value === option.value ? "text-green-dark" : "text-ink",
                )}
              >
                {option.price}
              </span>
              <span className="text-xs">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {/* (ა) ჯამი ინფორმაციის სახით — არჩევანი არაა, მხოლოდ შესადარებლად */}
      {value === "monthly" ? (
        <p className="text-sm text-ink-muted">
          {texts.totalNote}{" "}
          <span className="font-semibold text-ink">
            {formatGel(monthly.totalTetri)}
          </span>{" "}
          ({monthly.months} × {formatGel(monthly.perMonthTetri)})
        </p>
      ) : null}

      {monthly.extraTetri > 0 ? (
        <p className="text-sm font-semibold text-green-mid">
          {texts.saveNote} {formatGel(monthly.extraTetri)}
        </p>
      ) : null}
    </fieldset>
  );
}
