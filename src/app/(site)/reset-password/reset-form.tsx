"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/(site)/auth-actions";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

export function ResetForm() {
  const [state, action, pending] = useActionState(
    resetPassword,
    initialFormState,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage status="success">{state.message}</FormMessage>
        <Link
          href="/login"
          className="text-sm font-semibold text-green-dark underline"
        >
          შესვლა →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        label="ელფოსტა"
        name="email"
        type="email"
        required
        autoComplete="email"
        error={state.errors?.email}
      />
      <TextField
        label="კოდი"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={6}
        required
        error={state.errors?.code}
      />
      <TextField
        label="ახალი პაროლი"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        hint="მინიმუმ 8 სიმბოლო"
        error={state.errors?.password}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "ინახება…" : "პაროლის შეცვლა"}
      </Button>
    </form>
  );
}
