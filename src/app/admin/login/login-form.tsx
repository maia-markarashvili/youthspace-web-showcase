"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

export function LoginForm({ next }: { next?: string | null }) {
  const [state, action, pending] = useActionState(
    loginAction,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
    </form>
  );
}
