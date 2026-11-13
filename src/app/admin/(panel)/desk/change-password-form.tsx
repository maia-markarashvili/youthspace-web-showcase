"use client";

import { useActionState } from "react";
import { changeOwnPassword } from "./actions";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(
    changeOwnPassword,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <TextField
        label="ახლანდელი პაროლი"
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
        error={state.errors?.currentPassword}
      />
      <TextField
        label="ახალი პაროლი"
        name="newPassword"
        type="password"
        required
        minLength={10}
        autoComplete="new-password"
        hint="მინიმუმ 10 სიმბოლო"
        error={state.errors?.newPassword}
      />
      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status === "success" ? "success" : "error"}>
          {state.message}
        </FormMessage>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "იცვლება…" : "პაროლის შეცვლა"}
      </Button>
    </form>
  );
}
