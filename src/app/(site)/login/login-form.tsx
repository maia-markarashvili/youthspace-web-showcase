"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAccount } from "@/app/(site)/auth-actions";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(
    loginAccount,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        label="ელფოსტა"
        name="email"
        type="email"
        required
        autoComplete="username"
      />
      <TextField
        label="პაროლი"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "შემოწმება…" : "შესვლა"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        <Link
          href="/forgot-password"
          className="font-semibold text-green-dark underline"
        >
          დაგავიწყდა პაროლი?
        </Link>
      </p>
    </form>
  );
}
