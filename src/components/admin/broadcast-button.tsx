"use client";

import { useActionState } from "react";
import { sendBroadcast } from "@/app/admin/broadcast-actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";

/** „გაუგზავნე გამომწერებს“ ღილაკი — რედაქტირების გვერდებზე ფორმის ქვეშ */
export function BroadcastButton({
  itemType,
  itemId,
  subscriberCount,
  defaultTestEmail,
}: {
  itemType: "club" | "course" | "news";
  itemId: string;
  subscriberCount: number;
  /** ტესტის ნაგულისხმევი ადრესატი — შესული ადმინის მისამართი */
  defaultTestEmail: string;
}) {
  const [state, action, pending] = useActionState(
    sendBroadcast,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <input type="hidden" name="itemType" value={itemType} />
      <input type="hidden" name="itemId" value={itemId} />

      {/* ორივე ღილაკი submit-ია — დაჭერილის name/value მიდის FormData-ში,
          ამიტომ რეჟიმს ცალკე hidden input არ სჭირდება */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          ტესტის მისამართი
          <input
            type="email"
            name="testEmail"
            defaultValue={defaultTestEmail}
            className="min-h-9 min-w-64 rounded-card border border-line bg-white px-3 py-1.5 text-sm text-ink focus:border-green-mid"
          />
        </label>
        <Button
          type="submit"
          name="mode"
          value="test"
          variant="ghost"
          disabled={pending}
        >
          {pending ? "იგზავნება…" : "✉️ ტესტად გაგზავნა"}
        </Button>
        <Button
          type="submit"
          name="mode"
          value="all"
          variant="secondary"
          disabled={pending}
          onClick={(event) => {
            /* ConfirmSubmit-ის ნიმუშით — უარყოფისას submit ჩერდება */
            if (!window.confirm("გაეგზავნება ყველა გამომწერს - გავაგრძელო?")) {
              event.preventDefault();
            }
          }}
        >
          {pending
            ? "იგზავნება…"
            : `📣 გაუგზავნე გამომწერებს (${subscriberCount})`}
        </Button>
      </div>
      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}
    </form>
  );
}
