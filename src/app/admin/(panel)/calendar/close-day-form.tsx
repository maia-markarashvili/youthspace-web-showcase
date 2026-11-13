"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";
import { closeDayWithNote } from "./actions";

/** დღის დახურვა შენიშვნით — უქმეები/განსაკუთრებული დღეები */
export function CloseDayForm({ minDate }: { minDate: string }) {
  const [state, action, pending] = useActionState(
    closeDayWithNote,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="თარიღი"
          name="date"
          type="date"
          required
          min={minDate}
          error={state.errors?.date}
        />
        <TextField
          label="შენიშვნა"
          name="note"
          placeholder="მაგ.: სახალხო უქმე"
          hint="ჩანს კალენდარში - რატომ დაიხურა დღე"
          error={state.errors?.note}
        />
      </div>

      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "დახურე დღე"}
      </Button>
    </form>
  );
}
