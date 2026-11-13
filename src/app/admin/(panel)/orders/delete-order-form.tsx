"use client";

import { useActionState } from "react";
import type { deleteBooking, deletePass, deleteSubscription } from "./actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { initialFormState } from "@/lib/form-state";

/**
 * შეკვეთის სრული წაშლა - ნებისმიერ სტატუსზე (2026-08-30, მფლობელის
 * გადაწყვეტილება): ტრანზაქციაში იშლება შეკვეთა და მისი გადახდის/ვიზიტების/
 * კრედიტების ჩანაწერებიც; კვალად audit-ჩანაწერი რჩება. ConfirmSubmit-ის
 * window.confirm + useActionState-ის შეცდომის ჩვენება ერთად.
 */
export function DeleteOrderForm({
  id,
  action,
}: {
  id: string;
  action: typeof deleteSubscription | typeof deleteBooking | typeof deletePass;
}) {
  const [state, formAction] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmit confirmText="შეკვეთა და მისი გადახდის/ვიზიტების ისტორია საბოლოოდ წაიშლება - გაგრძელება?">
        წაშლა
      </ConfirmSubmit>
      {state.status === "error" && state.message ? (
        <p className="max-w-52 text-xs font-semibold whitespace-normal text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
