"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import { shortDayLabelKa } from "@/lib/calendar";
import type { DeskSlotDay } from "@/lib/db/queries/calendar";
import { setSameDaySale } from "./actions";

/** დღევანდელ სლოტზე დღესვე-გაყიდვის ჩართვა/გამორთვა — თითო ღილაკი ცალკე ფორმაა */
function SameDayToggle({
  date,
  slot,
  enabled,
}: {
  date: string;
  slot: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    setSameDaySale,
    initialFormState,
  );

  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
      <button
        type="submit"
        disabled={pending}
        className={
          enabled
            ? "min-h-8 cursor-pointer rounded-pill border border-green-dark bg-green-dark px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
            : "min-h-8 cursor-pointer rounded-pill border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-green-mid disabled:opacity-60"
        }
      >
        {pending
          ? "ინახება…"
          : enabled
            ? "დღესვე იყიდება ✓"
            : "გაყიდე დღესვე"}
      </button>
      {state.status === "error" && state.message ? (
        <p className="mt-1 text-xs font-semibold text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/**
 * მისაღების დაფა — უახლოესი დღეების ჯავშნები სლოტებად (დაკავებული/სულ);
 * დღევანდელზე დღესვე-გაყიდვის ტოგლები. მფლობელი წინა დღეს ამით გეგმავს
 * ოპერატორის გამოყვანას: რიცხვი 0 = ჯავშანი არაა, ოპერატორი არ სჭირდება.
 */
export function DeskSlotBoard({ board }: { board: DeskSlotDay[] }) {
  if (board.length === 0) {
    return (
      <p className="text-sm text-ink-muted">უახლოესი ღია დღეები არ არის.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] text-sm">
        <thead>
          <tr className="text-xs font-semibold text-ink-muted">
            <th className="py-1.5 pr-2 text-right">დღე</th>
            {board[0].slots.map((slot) => (
              <th key={slot.key} className="px-2 py-1.5 text-right">
                {slot.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {board.map((day) => (
            <tr key={day.date} className="border-t border-line align-top">
              <td className="py-2 pr-2 font-semibold whitespace-nowrap text-ink">
                {shortDayLabelKa(day.date)}
                {day.isToday ? (
                  <span className="ml-1 text-xs font-semibold text-green-dark">
                    · დღეს
                  </span>
                ) : null}
              </td>
              {day.slots.map((slot) => (
                <td key={slot.key} className="px-2 py-2">
                  <span
                    className={
                      slot.used > 0
                        ? "font-semibold text-green-dark"
                        : "text-ink-muted"
                    }
                  >
                    {slot.used}/{slot.capacity}
                  </span>
                  {slot.eventBooking ? (
                    <>
                      <span
                        className={`mt-1 block w-fit rounded-pill px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                          slot.eventBooking.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-light/40 text-green-dark"
                        }`}
                      >
                        სივრცე
                        {slot.eventBooking.peopleUpTo !== null
                          ? ` · ${slot.eventBooking.peopleUpTo}-მდე`
                          : ""}
                      </span>
                      <span
                        className="mt-0.5 block max-w-32 truncate text-[11px] text-ink-muted"
                        title={slot.eventBooking.buyerName}
                      >
                        {slot.eventBooking.buyerName}
                      </span>
                      {slot.eventBooking.status === "pending" ? (
                        /* pending ფერით ᲓᲐ ტექსტით ინიშნება — მარტო ფერი არ კმარა */
                        <span className="block text-[11px] font-semibold text-amber-800">
                          ელოდება გადახდას
                        </span>
                      ) : null}
                    </>
                  ) : null}
                  {day.isToday && slot.capacity > 0 ? (
                    <SameDayToggle
                      date={day.date}
                      slot={slot.key}
                      enabled={slot.sameDay}
                    />
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
