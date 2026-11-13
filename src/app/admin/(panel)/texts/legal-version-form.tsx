"use client";

import { useActionState } from "react";
import { FileField } from "@/components/admin/file-field";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";
import { addLegalVersion } from "./legal-actions";

/**
 * ახალი PDF-ვერსიის დამატება (წესები/კონფიდენციალურობა) — PDF + მოქმედების
 * დაწყების თარიღი. მშობელი key={versions.length}-ით ამაუნთებს, რომ
 * წარმატებული დამატების მერე ფორმა ცარიელი დაბრუნდეს.
 */
export function LegalVersionForm({ kind }: { kind: "terms" | "privacy" }) {
  const [state, action, pending] = useActionState(
    addLegalVersion,
    initialFormState,
  );

  return (
    <form
      action={action}
      className="flex max-w-3xl flex-col gap-4 rounded-card border border-line bg-white p-4"
    >
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FileField
          label="ვერსიის PDF"
          name="fileUrl"
          hint="საბოლოო, ხელმოწერილი დოკუმენტი"
          error={state.errors?.fileUrl}
        />
        <TextField
          label="მოქმედია ამ დღიდან"
          name="effectiveFrom"
          type="date"
          required
          error={state.errors?.effectiveFrom}
        />
      </div>

      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "ვერსიის დამატება"}
      </Button>
    </form>
  );
}
