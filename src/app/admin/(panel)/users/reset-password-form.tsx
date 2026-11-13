"use client";

import { useActionState, useState } from "react";
import { resetAdminPassword } from "./actions";
import { initialFormState } from "@/lib/form-state";

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    resetAdminPassword,
    initialFormState,
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-ink-muted hover:bg-cream"
      >
        პაროლის განულება
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-1">
        <input
          type="password"
          name="newPassword"
          placeholder="ახალი პაროლი (10+ სიმბოლო)"
          minLength={10}
          required
          className="min-h-9 w-48 rounded-card border border-line px-2 py-1 text-xs text-ink placeholder:text-ink-muted/60 focus:border-green-mid"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-green-dark hover:bg-green-light/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "ინახება…" : "დადასტურება"}
        </button>
      </div>
      {state.status === "error" && state.message ? (
        <p className="max-w-52 text-xs font-semibold whitespace-normal text-red-700">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" && state.message ? (
        <p className="max-w-52 text-xs font-semibold whitespace-normal text-green-dark">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
