"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";
import {
  ENTRY_SLOTS,
  WEEKDAY_KEYS,
  type EventWeekdays,
  type WeekdayKey,
} from "@/lib/slots";
import { saveEventWeekdays } from "./actions";

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
 * ღონისძიების კვირის ბადე — 7 დღე × 3 სლოტი, ქოვორქინგის რაოდენობების
 * ბადის ანალოგი, ოღონდ რიცხვის ნაცვლად მოსანიშნით: მონიშნული = ის სლოტი
 * იმ კვირის დღეს ღონისძიებად იყიდება, ცარიელი = არ იყიდება.
 * კონკრეტული თარიღის გამონაკლისი (ქვემოთა ფორმა) ბადეს ჯაბნის.
 */
export function EventWeekdayForm({
  current,
}: {
  current: EventWeekdays | null;
}) {
  const [state, action, pending] = useActionState(
    saveEventWeekdays,
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
                {ENTRY_SLOTS.map((slot) => (
                  <td key={slot.key} className="px-2 py-2">
                    <label className="flex cursor-pointer items-center justify-end gap-2">
                      <input
                        type="checkbox"
                        name={`ev_${day}_${slot.key}`}
                        defaultChecked={current?.[day]?.[slot.key] ?? false}
                        aria-label={`${WEEKDAY_LABELS[day]} ${slot.label}`}
                        className="size-5 accent-green-dark"
                      />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "შეინახე ღონისძიების ბადე"}
      </Button>
    </form>
  );
}
