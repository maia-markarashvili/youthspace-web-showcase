"use client";

import { useActionState, useState } from "react";
import { reserveWithoutPayment } from "./actions";
import { initialFormState } from "@/lib/form-state";

/**
 * „დაკავება გადახდის გარეშე" (§1.5) — pending რიგს holdExpiresAt-ს უსუფთავებს
 * (ადგილი უვადოდ იკავებს) და reservedAt/reservedNote-ს წერს, თუმცა სტატუსი
 * pending რჩება (გადახდილად არ ითვლება). ღილაკს ხსნის პატარა ველი მიზეზისთვის.
 */
export function ReserveForm({
  kind,
  id,
}: {
  kind: "subscription" | "booking" | "pass";
  id: string;
}) {
  const [state, action, pending] = useActionState(
    reserveWithoutPayment,
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
        დაკავება გადახდის გარეშე
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-1">
        <input
          type="text"
          name="note"
          placeholder="მიზეზი (არასავალდებულო)"
          maxLength={500}
          className="min-h-9 w-40 rounded-card border border-line px-2 py-1 text-xs text-ink placeholder:text-ink-muted/60 focus:border-green-mid"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-green-dark hover:bg-green-light/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "ინახება…" : "დაკავება"}
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
