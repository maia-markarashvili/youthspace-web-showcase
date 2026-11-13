"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * განმეორებადი რიგების რედაქტორი ადმინისთვის (benefits/პროგრამა/FAQ/ფაქტები):
 * GalleryField-ის კონვენციით — მთელი სია ერთ hidden input-ში
 * JSON.stringify-ით მიდის; action z.string().transform-ით არჩევს.
 */

export type ListFieldDef = {
  key: string;
  label: string;
  kind: "text" | "textarea";
  placeholder?: string;
};

type Row = Record<string, string>;

const controlClass =
  "w-full rounded-card border border-line bg-white px-4 py-2.5 text-base text-ink placeholder:text-ink-muted/60 focus:border-green-mid focus:outline-2 focus:outline-green-mid/40";

export function ListField({
  name,
  label,
  fields,
  defaultValue,
  max,
  addLabel = "+ პუნქტის დამატება",
  hint,
}: {
  name: string;
  label: string;
  fields: ListFieldDef[];
  defaultValue?: Row[];
  max?: number;
  addLabel?: string;
  hint?: string;
}) {
  const [rows, setRows] = useState<Row[]>(defaultValue ?? []);

  const emptyRow = (): Row =>
    Object.fromEntries(fields.map((field) => [field.key, ""]));

  const update = (index: number, key: string, value: string) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );

  const move = (index: number, delta: number) =>
    setRows((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <p className="text-sm font-semibold text-ink">{label}</p>
      {hint ? <p className="-mt-2 text-xs text-ink-muted">{hint}</p> : null}

      {rows.map((row, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-card border border-line bg-cream/40 p-4"
        >
          {fields.map((field) =>
            field.kind === "textarea" ? (
              <textarea
                key={field.key}
                rows={3}
                value={row[field.key] ?? ""}
                onChange={(e) => update(index, field.key, e.target.value)}
                placeholder={field.placeholder ?? field.label}
                aria-label={`${label} - ${field.label} ${index + 1}`}
                className={cn(controlClass, "min-h-20")}
              />
            ) : (
              <input
                key={field.key}
                type="text"
                value={row[field.key] ?? ""}
                onChange={(e) => update(index, field.key, e.target.value)}
                placeholder={field.placeholder ?? field.label}
                aria-label={`${label} - ${field.label} ${index + 1}`}
                className={controlClass}
              />
            ),
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label="ზემოთ"
              className="flex size-9 items-center justify-center rounded-pill border border-line text-ink-muted disabled:opacity-40"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === rows.length - 1}
              aria-label="ქვემოთ"
              className="flex size-9 items-center justify-center rounded-pill border border-line text-ink-muted disabled:opacity-40"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() =>
                setRows((current) => current.filter((_, i) => i !== index))
              }
              className="ml-auto rounded-pill border border-line px-4 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              წაშლა
            </button>
          </div>
        </div>
      ))}

      {max === undefined || rows.length < max ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setRows((current) => [...current, emptyRow()])}
        >
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
