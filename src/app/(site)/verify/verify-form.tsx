"use client";

import { useActionState } from "react";
import {
  resendAccountCode,
  verifyAccountCode,
} from "@/app/(site)/auth-actions";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

export function VerifyForm() {
  const [state, action, pending] = useActionState(
    verifyAccountCode,
    initialFormState,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendAccountCode,
    initialFormState,
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <TextField
          label="დადასტურების კოდი"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          required
          error={state.errors?.code}
        />

        {state.status === "error" && state.message && !state.errors?.code ? (
          <FormMessage status="error">{state.message}</FormMessage>
        ) : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "მოწმდება…" : "დადასტურება"}
        </Button>
      </form>

      <form action={resendAction} className="flex flex-col gap-2">
        {resendState.status !== "idle" && resendState.message ? (
          <FormMessage
            status={resendState.status === "success" ? "success" : "error"}
          >
            {resendState.message}
          </FormMessage>
        ) : null}
        <Button type="submit" variant="ghost" disabled={resendPending}>
          {resendPending ? "იგზავნება…" : "კოდის ხელახლა გაგზავნა"}
        </Button>
      </form>
    </div>
  );
}
