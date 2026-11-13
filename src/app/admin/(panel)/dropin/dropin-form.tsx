"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import type { DropinSettings } from "@/lib/db/schema";
import { initialFormState } from "@/lib/form-state";
import { toGel } from "@/lib/money";
import { saveDropin } from "./actions";

/** singleton-ფორმა — ჩანაწერი ჯერ არ არსებობს → schema-ს default-ები */
export function DropinForm({
  defaultValues,
}: {
  defaultValues: DropinSettings | null;
}) {
  const [state, action, pending] = useActionState(saveDropin, initialFormState);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ფასი (₾)"
          name="price"
          type="number"
          required
          min={1}
          step={1}
          defaultValue={defaultValues ? toGel(defaultValues.price) : undefined}
          error={state.errors?.price}
        />
        <TextField
          label="დღიური ლიმიტი"
          name="dailyCap"
          type="number"
          required
          min={1}
          step={1}
          defaultValue={defaultValues?.dailyCap}
          hint="მაქსიმუმ რამდენი ვიზიტორი დღეში"
          error={state.errors?.dailyCap}
        />
      </div>

      <TextAreaField
        label="აღწერა"
        name="description"
        defaultValue={defaultValues?.description ?? ""}
        error={state.errors?.description}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="გახსნის საათი"
          name="openingHour"
          type="number"
          min={0}
          max={23}
          step={1}
          defaultValue={defaultValues?.openingHour ?? 10}
          error={state.errors?.openingHour}
        />
        <TextField
          label="დახურვის საათი"
          name="closingHour"
          type="number"
          min={1}
          max={24}
          step={1}
          defaultValue={defaultValues?.closingHour ?? 22}
          error={state.errors?.closingHour}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ჯავშნების დაწყების თარიღი"
          name="bookingStartDate"
          type="date"
          defaultValue={defaultValues?.bookingStartDate ?? ""}
          hint="ცარიელი = დღევანდელი დღიდან"
          error={state.errors?.bookingStartDate}
        />
        <TextField
          label="რამდენი დღე აჩვენოს"
          name="bookingWindowDays"
          type="number"
          required
          min={1}
          max={60}
          step={1}
          defaultValue={defaultValues?.bookingWindowDays ?? 14}
          hint="საჯავშნო ფანჯარა კალენდარული დღეებით"
          error={state.errors?.bookingWindowDays}
        />
      </div>

      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "შენახვა"}
      </Button>
    </form>
  );
}
