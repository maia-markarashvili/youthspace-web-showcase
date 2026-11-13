"use client";

import Link from "next/link";
import type { ConsentTexts } from "@/components/purchase/types";

/** ორი თანხმობის მდგომარეობა — მშობელი ფორმა ინახავს, რომ ღილაკის
 *  disabled-იც მასზე გამოთვალოს */
export type ConsentValue = { terms: boolean; privacy: boolean };

export const initialConsent: ConsentValue = { terms: false, privacy: false };

/**
 * თანხმობის მოსანიშნები: წესები და პირობები + პერსონალური მონაცემები.
 * მონიშნული checkbox formData-ში "on"-ს აგზავნის — სერვერი ზუსტად ამას
 * ამოწმებს (agreeTerms/agreePrivacy). ბმულები ახალ ტაბში იხსნება, რომ
 * ფორმის შევსებული ველები არ დაიკარგოს.
 */
export function ConsentFields({
  texts,
  value,
  onChange,
  errors,
}: {
  texts: ConsentTexts;
  value: ConsentValue;
  onChange: (next: ConsentValue) => void;
  errors?: { agreeTerms?: string; agreePrivacy?: string };
}) {
  const rows = [
    {
      name: "agreeTerms" as const,
      checked: value.terms,
      toggle: () => onChange({ ...value, terms: !value.terms }),
      pre: texts.consentTermsPre,
      linkText: texts.consentTermsLink,
      href: "/terms",
      error: errors?.agreeTerms,
    },
    {
      name: "agreePrivacy" as const,
      checked: value.privacy,
      toggle: () => onChange({ ...value, privacy: !value.privacy }),
      pre: texts.consentPrivacyPre,
      linkText: texts.consentPrivacyLink,
      href: "/privacy",
      error: errors?.agreePrivacy,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.name}>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name={row.name}
              checked={row.checked}
              onChange={row.toggle}
              className="mt-0.5 size-4 shrink-0 accent-green-dark"
            />
            <span>
              {row.pre}{" "}
              <Link
                href={row.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                {row.linkText}
              </Link>
            </span>
          </label>
          {row.error ? (
            <p className="mt-1 pl-6.5 text-xs font-semibold text-red-700">
              {row.error}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
