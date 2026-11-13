"use client";

import { useState } from "react";
import type { CourseClubDiscount } from "@/lib/pricing";

/**
 * კურსის per-club ფასდაკლებების ველი — თითო აქტიურ კლუბზე ერთი მუდმივად
 * ხილული რიგი რიცხვითი input-ით (0 = ამ კლუბის წევრებს ფასდაკლება არ აქვთ).
 * მთელი მნიშვნელობა ფორმას ერთ hidden input-ში JSON-ად გადაეცემა
 * (GalleryField/ListField-ის კონვენცია); action მხოლოდ >0 რიგებს ინახავს.
 */

export function ClubDiscountsField({
  name,
  label,
  clubs,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  clubs: { id: string; title: string }[];
  defaultValue?: CourseClubDiscount[];
  hint?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const club of clubs) {
      const existing = defaultValue?.find((rule) => rule.clubId === club.id);
      initial[club.id] = existing ? String(existing.percent) : "0";
    }
    return initial;
  });

  const serialized = JSON.stringify(
    clubs
      .map((club) => ({
        clubId: club.id,
        percent: Math.trunc(Number(values[club.id]) || 0),
      }))
      .filter((rule) => rule.percent > 0),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      <input type="hidden" name={name} value={serialized} />
      <div className="mt-1 flex flex-col gap-2">
        {clubs.length === 0 ? (
          <p className="rounded-card border border-line bg-cream px-4 py-3 text-sm text-ink-muted">
            აქტიური კლუბები ჯერ არ არის - ჯერ კლუბი დაამატე.
          </p>
        ) : (
          clubs.map((club) => (
            <label
              key={club.id}
              className="flex items-center justify-between gap-4 rounded-card border border-line bg-white px-4 py-2.5"
            >
              <span className="text-sm font-medium text-ink">{club.title}</span>
              <span className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={values[club.id] ?? "0"}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [club.id]: event.target.value,
                    }))
                  }
                  className="w-20 rounded-card border border-line bg-white px-3 py-1.5 text-right text-sm text-ink focus:border-green-mid focus:outline-none"
                />
                <span className="text-sm text-ink-muted">%</span>
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
