"use client";

import { useActionState, useState } from "react";
import { cancelOwnItem } from "./actions";
import { initialFormState } from "@/lib/form-state";

/**
 * კაბინეტის ჩანაწერის გაუქმების ღილაკი — ორნაბიჯიანი დადასტურებით
 * (შემთხვევითი დაჭერისგან). წარმატებაზე revalidatePath ისედაც ანახლებს
 * გვერდს და რიგი „გაუქმებულად" გადაიხატება.
 */
export function CancelItemForm({
  kind,
  id,
  hint,
}: {
  kind: "club" | "pass" | "booking";
  id: string;
  hint: string | null;
}) {
  const [state, action, pending] = useActionState(
    cancelOwnItem,
    initialFormState,
  );
  const [confirming, setConfirming] = useState(false);

  if (state.status === "success") {
    return <p className="text-xs font-semibold text-green-dark">გაუქმდა ✓</p>;
  }

  return (
    <form action={action} className="flex flex-col items-start gap-1 sm:items-end">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="min-h-8 rounded-pill bg-red-700 px-3 py-1 text-xs font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "უქმდება…" : "კი, გავაუქმო"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-8 rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink hover:border-green-mid"
          >
            არა
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-8 rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:border-red-300"
        >
          გაუქმება
        </button>
      )}
      {hint ? <p className="text-[11px] text-ink-muted">{hint}</p> : null}
      {state.status === "error" && state.message ? (
        <p className="text-xs font-semibold text-red-700">{state.message}</p>
      ) : null}
    </form>
  );
}
