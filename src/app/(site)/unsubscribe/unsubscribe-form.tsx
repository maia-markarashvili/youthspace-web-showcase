"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmUnsubscribe } from "./actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

/** დადასტურების ღილაკი — გაუქმება მხოლოდ ცოცხალი დაწკაპუნებით ხდება */
export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    confirmUnsubscribe,
    initialFormState,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage status="success">{state.message}</FormMessage>
        <Link
          href="/"
          className="text-sm font-semibold text-green-dark underline"
        >
          მთავარ გვერდზე →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="t" value={token} />
      <Button type="submit" disabled={pending}>
        {pending ? "მუშავდება…" : "დიახ, გამოწერის გაუქმება"}
      </Button>
      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}
      <Link href="/" className="text-sm font-semibold text-green-dark underline">
        არა, გამოწერა დამრჩეს →
      </Link>
    </form>
  );
}
