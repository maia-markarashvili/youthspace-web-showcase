"use client";

import { useActionState } from "react";
import { sendTestSms } from "./actions";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

/** SMS დიაგნოსტიკის ბლოკი — ცალკე form, ფასების შენახვისგან დამოუკიდებელი */
export function SmsTest() {
  const [state, action, pending] = useActionState(
    sendTestSms,
    initialFormState,
  );

  return (
    <form
      action={action}
      className="mt-10 flex max-w-3xl flex-col gap-4 rounded-card border border-line bg-white p-6 shadow-card"
    >
      <div>
        <h2 className="text-h3 font-bold text-green-dark">SMS დიაგნოსტიკა</h2>
        <p className="mt-1 text-sm text-ink-muted">
          გაგზავნე სატესტო SMS და ნახე ზუსტი მიზეზი, თუ არ იგზავნება (სენდერის
          დამტკიცება, ბალანსი, გასაღები/brandID).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <TextField
            label="ტელეფონი"
            name="phone"
            placeholder="995555123456"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "იგზავნება…" : "სატესტო SMS"}
        </Button>
      </div>

      {state.status !== "idle" ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}
    </form>
  );
}
