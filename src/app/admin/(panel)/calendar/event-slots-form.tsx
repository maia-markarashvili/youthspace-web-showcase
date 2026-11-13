"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";
import { setEventSlots } from "./actions";

const SLOT_OPTIONS = [
  { name: "eventMorning", label: "10:00–14:00" },
  { name: "eventMidday", label: "14:00–18:00" },
  { name: "eventEvening", label: "18:00–22:00" },
] as const;

const selectClass =
  "min-h-11 w-full rounded-card border border-line bg-white px-4 py-2.5 text-base text-ink focus:border-green-mid";

/**
 * ღონისძიების სლოტების გამონაკლისი კონკრეტულ თარიღზე — კვირის ბადის
 * გამონაკლისი (ისევე, როგორც „სლოტის ადგილები კონკრეტულ დღეს" კაპასიტეტების
 * ბადისა): „კი" ხსნის სლოტს ბადისა და დღის დახურვის მიუხედავად, „არა" კეტავს
 * ბადის მიუხედავად, ცარიელი კი დღეს ბადეს უბრუნებს. ფორმა დღის სამივე
 * მნიშვნელობას ერთად წერს.
 */
export function EventSlotsForm({ minDate }: { minDate: string }) {
  const [state, action, pending] = useActionState(
    setEventSlots,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="თარიღი"
          name="date"
          type="date"
          required
          min={minDate}
          error={state.errors?.date}
        />
        {SLOT_OPTIONS.map((slot) => (
          <div key={slot.name} className="flex flex-col gap-1.5">
            <label
              htmlFor={slot.name}
              className="text-sm font-semibold text-ink"
            >
              {slot.label}
            </label>
            <select
              id={slot.name}
              name={slot.name}
              defaultValue=""
              className={selectClass}
            >
              <option value="">კვირის ბადის მიხედვით</option>
              <option value="yes">კი - ღიაა</option>
              <option value="no">არა - დაკეტილია</option>
            </select>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-muted">
        ეს ფორმა მხოლოდ გამონაკლისებისთვისაა - ჩვეულებრივი კვირა ზემოთა ბადით
        იმართება. „კი“ ხსნის სლოტს დახურულ დღესაც, „არა“ კი კეტავს ბადის
        მიუხედავად. 14:00–18:00 სამუშაო დღეებში კლუბების დროა. ონლაინ გაყიდვა
        ხვალიდან იწყება; სლოტი, რომელზეც უკვე დგას შესვლის ჯავშანი, კალენდარში
        თავად დაიმალება.
      </p>

      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "შეინახე გამონაკლისი"}
      </Button>
    </form>
  );
}
