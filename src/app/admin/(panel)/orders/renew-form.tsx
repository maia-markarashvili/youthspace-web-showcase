"use client";

import { useActionState } from "react";
import { renewSubscription } from "./actions";
import { initialFormState } from "@/lib/form-state";

/**
 * „+1 თვე" — აქტიური კლუბ-გამოწერის განახლების პატარა ფორმა ცხრილის უჯრაში.
 * active/grace ფაზაში ვადა ძველი ვადიდან გრძელდება; expired-ზე სერვერი
 * კვოტას ხელახლა ამოწმებს და შეცდომას აქვე აჩვენებს. `renewalLabel` —
 * წინასწარ დათვლილი ღილაკის წარწერა (მაგ. „+1 თვე — 108 ₾ (ბონუსი)"),
 * რომ ადმინმა ფასდაკლება ფულის აღებამდე დაინახოს.
 */
export function RenewForm({
  subscriptionId,
  renewalLabel,
}: {
  subscriptionId: string;
  renewalLabel?: string;
}) {
  const [state, action, pending] = useActionState(
    renewSubscription,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm("განვაახლო 1 თვით?")) event.preventDefault();
        }}
        className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-green-dark hover:bg-green-light/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "ინახება…" : (renewalLabel ?? "+1 თვე")}
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
