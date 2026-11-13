"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";
import {
  ENTRY_SLOTS,
  WEEKDAY_KEYS,
  type WeekdayCapacities,
  type WeekdayKey,
} from "@/lib/slots";
import { saveWeekdayCapacities } from "./actions";

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "ორშაბათი",
  tue: "სამშაბათი",
  wed: "ოთხშაბათი",
  thu: "ხუთშაბათი",
  fri: "პარასკევი",
  sat: "შაბათი",
  sun: "კვირა",
};

/**
 * კვირის დღეების რაოდენობები — 7 დღე × 3 სლოტი. ცარიელი უჯრა = გლობალური
 * default (ფასების გვერდიდან), 0 = სლოტი იმ კვირის დღეს დაკეტილია.
 * მოქმედებს მხოლოდ ღია დღეებზე; კონკრეტული დღის override ამასაც ჯაბნის.
 */
export function WeekdayCapacityForm({
  current,
}: {
  current: WeekdayCapacities | null;
}) {
  const [state, action, pending] = useActionState(
    saveWeekdayCapacities,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-right text-xs font-semibold text-ink-muted">
              <th className="py-1.5 pr-2 text-right font-semibold">დღე</th>
              {ENTRY_SLOTS.map((slot) => (
                <th key={slot.key} className="px-2 py-1.5 text-right">
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_KEYS.map((day) => (
              <tr key={day} className="border-t border-line">
                <td className="py-2 pr-2 font-semibold text-ink">
                  {WEEKDAY_LABELS[day]}
                </td>
                {ENTRY_SLOTS.map((slot) => {
                  const field = `cap_${day}_${slot.key}`;
                  const value = current?.[day]?.[slot.key];
                  const error = state.errors?.[field];
                  return (
                    <td key={slot.key} className="px-2 py-2">
                      <input
                        type="number"
                        name={field}
                        min={0}
                        max={999}
                        step={1}
                        defaultValue={value ?? ""}
                        aria-label={`${WEEKDAY_LABELS[day]} ${slot.label}`}
                        className="w-20 rounded-card border border-line bg-white px-2.5 py-1.5 text-right text-sm text-ink focus:border-green-mid focus:outline-none"
                      />
                      {error ? (
                        <p className="mt-1 text-xs font-semibold text-red-700">
                          {error}
                        </p>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "შეინახე კვირის დღეები"}
      </Button>
    </form>
  );
}
