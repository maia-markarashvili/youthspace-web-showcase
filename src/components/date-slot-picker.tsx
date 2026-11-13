"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/calendar";
import type { EntrySlotKey } from "@/lib/slots";

/**
 * კომპაქტური, კალენდარზე-დაფუძნებული თარიღ-სლოტის ამომრჩევი (2026-09-05) -
 * ცვლის ძველ პატერნს, სადაც ყოველი ღია დღე ცალკე სრულ-სიგანის ბარათი იყო
 * (14-დღიან ფანჯარაზე - 14-მდე დაწყობილი ბარათი, განსაკუთრებით გრძელი
 * მობილურზე). ორივე ნაკადში (drop-in, სივრცე) ფასი დღეზე არ იცვლება,
 * ამიტომ კალენდრის უჯრედს ფასის ჩვენება არ სჭირდება - მხოლოდ ღიაობის
 * ფერი; ფასი/დარჩენილი ადგილი არჩეული დღის სლოტ-ჩიპებზეა (`renderDetail`).
 *
 * გამოიყენება drop-in-ის სამივე tab-ზე და სივრცის ჯავშნის ფორმაში - იმიტომ
 * generic-ია T-ზე (თითო ნაკადს თავისი დამატებითი ველები აქვს: remaining/
 * capacity ან priceTetri).
 */

export type SlotChoice = { date: string; slot: EntrySlotKey } | null;

type DaySlotBase = {
  date: string;
  /** „12 აგვ, სამ" - სლოტ-ჩიპების ზემოთ სათაურისთვის */
  dateLabel: string;
  slot: EntrySlotKey;
  slotLabel: string;
};

const WEEKDAY_HEADERS = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"];

/* ⚠ Intl.DateTimeFormat("ka-GE",{month:"long"}) აქ განზრახ არ გამოიყენება:
   კლიენტ-კომპონენტში server/client ICU-მონაცემები შეიძლება არ ემთხვეოდეს
   (Node-ის ჩაშენებული ICU ხშირად ინგლისურზე ცვდება) - hydration mismatch-ს
   იძლევა. სტატიკური მასივი ორივე მხარეს იდენტურია. */
const MONTHS_KA = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];

function dayOfMonth(dateISO: string): string {
  return String(Number(dateISO.slice(8, 10)));
}

function monthLabel(dateISO: string): string {
  return MONTHS_KA[new Date(`${dateISO}T12:00:00Z`).getUTCMonth()];
}

export function DateSlotPicker<T extends DaySlotBase>({
  legend,
  options,
  value,
  onChange,
  renderDetail,
  error,
}: {
  legend: string;
  options: T[];
  value: SlotChoice;
  onChange: (choice: SlotChoice) => void;
  renderDetail: (option: T, selected: boolean) => React.ReactNode;
  error?: string;
}) {
  /* დღეებად დაჯგუფება - თითო დღეს 1-3 სლოტი (options თარიღით დალაგებული მოდის) */
  const byDate: { date: string; dateLabel: string; options: T[] }[] = [];
  for (const option of options) {
    const bucket = byDate.find((day) => day.date === option.date);
    if (bucket) bucket.options.push(option);
    else
      byDate.push({
        date: option.date,
        dateLabel: option.dateLabel,
        options: [option],
      });
  }
  const openDates = new Set(byDate.map((day) => day.date));

  const [selectedDate, setSelectedDate] = useState<string | null>(
    value?.date ?? byDate[0]?.date ?? null,
  );
  /* value რომ გარედან გასუფთავდეს (მაგ. ფორმის reset), ბადეზე ფოკუსი
     მაინც უახლოეს ღია დღეზე დარჩეს და არა კვლავ null-ზე */
  const activeDate =
    selectedDate && openDates.has(selectedDate)
      ? selectedDate
      : (byDate[0]?.date ?? null);

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-semibold text-ink">
        {legend} <span className="text-green-mid">*</span>
      </legend>

      {byDate.length === 0 ? (
        <p className="mt-1.5 rounded-card border border-line bg-white px-3 py-2.5 text-sm text-ink-muted">
          ამჟამად თავისუფალი დრო არ არის
        </p>
      ) : (
        <div className="mt-1.5 rounded-card border border-line bg-white p-3">
          <CalendarGrid
            first={byDate[0].date}
            last={byDate[byDate.length - 1].date}
            dateLabels={
              new Map(byDate.map((day) => [day.date, day.dateLabel]))
            }
            activeDate={activeDate}
            onPick={setSelectedDate}
          />

          {activeDate ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {byDate
                .find((day) => day.date === activeDate)
                ?.options.map((option) => {
                  const selected =
                    value?.date === option.date && value?.slot === option.slot;
                  return (
                    <button
                      key={option.slot}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        onChange(
                          selected
                            ? null
                            : { date: option.date, slot: option.slot },
                        )
                      }
                      className={cn(
                        "flex min-h-11 cursor-pointer flex-col items-center rounded-card border px-3 py-1.5 text-center transition-colors",
                        selected
                          ? "border-green-dark bg-green-dark text-white"
                          : "border-line bg-white text-ink hover:border-green-mid",
                      )}
                    >
                      <span className="text-sm font-semibold">
                        {option.slotLabel}
                      </span>
                      {renderDetail(option, selected)}
                    </button>
                  );
                })}
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </fieldset>
  );
}

function CalendarGrid({
  first,
  last,
  dateLabels,
  activeDate,
  onPick,
}: {
  first: string;
  last: string;
  /** ღია თარიღი → „12 აგვ, სამ" (aria-label ღილაკებისთვის) */
  dateLabels: Map<string, string>;
  activeDate: string | null;
  onPick: (date: string) => void;
}) {
  const dates: string[] = [];
  for (let d = first; ; d = addDays(d, 1)) {
    dates.push(d);
    if (d === last) break;
  }
  /* ორშაბათზე გასწორება - ცარიელი უჯრები ფანჯრის პირველ დღემდე */
  const leadingBlanks = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const firstMonth = monthLabel(first);
  const lastMonth = monthLabel(last);

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-ink-muted">
        {firstMonth === lastMonth ? firstMonth : `${firstMonth} - ${lastMonth}`}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_HEADERS.map((label) => (
          <p
            key={label}
            className="text-center text-[11px] font-bold text-ink-muted"
          >
            {label}
          </p>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden />
        ))}
        {dates.map((date) => {
          const dateLabel = dateLabels.get(date);
          if (!dateLabel) {
            return (
              <span
                key={date}
                className="flex h-11 cursor-default items-center justify-center rounded-card border border-transparent bg-cream/50 text-sm text-ink-muted/70"
              >
                {dayOfMonth(date)}
              </span>
            );
          }
          const selected = date === activeDate;
          return (
            <button
              key={date}
              type="button"
              aria-pressed={selected}
              aria-label={dateLabel}
              onClick={() => onPick(date)}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-card border text-sm font-semibold transition-colors",
                selected
                  ? "border-green-dark bg-green-dark text-white"
                  : "border-green-mid bg-green-light/30 text-green-dark hover:border-green-dark",
              )}
            >
              {dayOfMonth(date)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
