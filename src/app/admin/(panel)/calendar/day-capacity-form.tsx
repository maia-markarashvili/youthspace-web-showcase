"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";
import { setDayCapacity } from "./actions";

/**
 * კონკრეტული დღის სლოტ-კაპასიტეტები — ცარიელი ველი გლობალურ default-ს
 * ნიშნავს, 0 კი სლოტს იმ დღეს კეტავს (ჯავშნებში აღარ ჩანს).
 */
export function DayCapacityForm({ minDate }: { minDate: string }) {
  const [state, action, pending] = useActionState(
    setDayCapacity,
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
        <TextField
          label="ადგილები 10:00–14:00"
          name="capacityMorning"
          type="number"
          min={0}
          max={999}
          step={1}
          hint="ცარიელი = სტანდარტული · 0 = დაკეტვა"
          error={state.errors?.capacityMorning}
        />
        <TextField
          label="ადგილები 14:00–18:00"
          name="capacityMidday"
          type="number"
          min={0}
          max={999}
          step={1}
          hint="ცარიელი = სტანდარტული · 0 = დაკეტვა"
          error={state.errors?.capacityMidday}
        />
        <TextField
          label="ადგილები 18:00–22:00"
          name="capacityEvening"
          type="number"
          min={0}
          max={999}
          step={1}
          hint="ცარიელი = სტანდარტული · 0 = დაკეტვა"
          error={state.errors?.capacityEvening}
        />
      </div>

      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "შეინახე კაპასიტეტი"}
      </Button>
    </form>
  );
}
