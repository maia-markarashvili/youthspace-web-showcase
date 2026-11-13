"use client";

import { useActionState } from "react";
import { resendOrderCode } from "./actions";
import { initialFormState } from "@/lib/form-state";

/**
 * „კოდის გაგზავნა" (§1.7/§2 - მომხმარებელს დაავიწყდა კოდი) — sms.code.reminder
 * შაბლონით. ცარიელი შაბლონი = არ იგზავნება (disablable, site-texts).
 */
export function ResendCodeForm({
  kind,
  id,
}: {
  kind: "subscription" | "booking" | "pass";
  id: string;
}) {
  const [state, action, pending] = useActionState(
    resendOrderCode,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-ink-muted hover:bg-cream disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "იგზავნება…" : "კოდის გაგზავნა"}
      </button>
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
