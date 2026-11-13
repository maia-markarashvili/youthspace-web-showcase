"use client";

import { useActionState } from "react";
import { createAdminUser } from "./actions";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { initialFormState } from "@/lib/form-state";

const ROLE_LABEL: Record<string, string> = {
  admin: "ადმინი (სრული წვდომა)",
  reception: "რეგისტრატორი (მხოლოდ მისაღები)",
};

export function CreateAdminForm() {
  const [state, action, pending] = useActionState(
    createAdminUser,
    initialFormState,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-card border border-line bg-white p-5 shadow-card sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-56 flex-1">
        <TextField
          label="ელფოსტა"
          name="email"
          type="email"
          required
          autoComplete="off"
          error={state.errors?.email}
        />
      </div>
      <div className="min-w-56 flex-1">
        <TextField
          label="საწყისი პაროლი"
          name="password"
          type="password"
          required
          minLength={10}
          hint="მინიმუმ 10 სიმბოლო"
          autoComplete="new-password"
          error={state.errors?.password}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="role" className="text-sm font-semibold text-ink">
          როლი
        </label>
        <select
          id="role"
          name="role"
          defaultValue="reception"
          className="min-h-11 rounded-card border border-line bg-white px-4 py-2.5 text-base text-ink focus:border-green-mid"
        >
          {ADMIN_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ემატება…" : "ადმინის დამატება"}
      </Button>
      {state.status !== "idle" && state.message ? (
        <div className="w-full">
          <FormMessage status={state.status === "success" ? "success" : "error"}>
            {state.message}
          </FormMessage>
        </div>
      ) : null}
    </form>
  );
}
