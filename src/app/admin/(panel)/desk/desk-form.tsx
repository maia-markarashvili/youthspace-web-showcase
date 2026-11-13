"use client";

import { useActionState } from "react";
import { searchCustomer } from "./actions";
import { DeskResultCard } from "./desk-results";
import { initialDeskState } from "./types";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";

/**
 * მისაღების ძებნის ფორმა — ერთი ველი, სერვერი თავად წყვეტს ტელეფონია თუ
 * კოდი. მხოლოდ ზუსტი დამთხვევა (§3.3) - ნაწილობრივი ძებნა არ არსებობს.
 */
export function DeskSearchForm() {
  const [state, action, pending] = useActionState(
    searchCustomer,
    initialDeskState,
  );

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            label="ტელეფონი ან კოდი"
            name="query"
            placeholder="599112233 ან PSS-12345"
            required
          />
        </div>
        <Button type="submit" disabled={pending} className="sm:mb-0.5">
          {pending ? "ვეძებ…" : "ძებნა"}
        </Button>
      </form>

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      {state.status === "success" && state.results ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            {state.results.active.map((result) => (
              <DeskResultCard key={`${result.kind}-${result.id}`} result={result} />
            ))}
          </div>
          {state.results.cancelled.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-ink-muted">
                გაუქმებული/ვადაგასული
              </h3>
              {state.results.cancelled.map((result) => (
                <DeskResultCard
                  key={`${result.kind}-${result.id}`}
                  result={result}
                  muted
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
