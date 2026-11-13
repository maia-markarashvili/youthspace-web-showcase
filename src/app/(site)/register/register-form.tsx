"use client";

import { useActionState } from "react";
import { registerAccount } from "@/app/(site)/auth-actions";
import { Button } from "@/components/ui/button";
import { FormMessage, Honeypot, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

export function RegisterForm() {
  const [state, action, pending] = useActionState(
    registerAccount,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <Honeypot />
      <TextField
        label="სახელი და გვარი"
        name="fullName"
        required
        autoComplete="name"
        error={state.errors?.fullName}
      />
      <TextField
        label="ელფოსტა"
        name="email"
        type="email"
        required
        autoComplete="email"
        error={state.errors?.email}
      />
      <TextField
        label="ტელეფონი"
        name="phone"
        type="tel"
        required
        autoComplete="tel"
        placeholder="5XX XX XX XX"
        hint="დადასტურების კოდი მეილზე მოვა"
        error={state.errors?.phone}
      />
      <TextField
        label="პაროლი"
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
        {pending ? "იქმნება…" : "ანგარიშის შექმნა"}
      </Button>
    </form>
  );
}
