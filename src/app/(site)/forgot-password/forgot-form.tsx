"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/(site)/auth-actions";
import { Button } from "@/components/ui/button";
import { FormMessage, Honeypot, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

export function ForgotForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialFormState,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage status="success">{state.message}</FormMessage>
        <Link
          href="/reset-password"
          className="text-sm font-semibold text-green-dark underline"
        >
          შეიყვანე კოდი და ახალი პაროლი →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Honeypot />
      <TextField
        label="ელფოსტა"
        name="email"
        type="email"
        required
        autoComplete="email"
        error={state.errors?.email}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "იგზავნება…" : "კოდის გაგზავნა"}
      </Button>
    </form>
  );
}
