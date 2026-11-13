"use client";

import { useActionState } from "react";
import { admitVisitor, confirmBookingAtDesk, resendCodeAtDesk } from "./actions";
import { initialAdmitState } from "./types";
import type { DeskMatch, DeskVerdict } from "@/lib/db/queries/desk";
import { cn } from "@/lib/cn";
import { initialFormState } from "@/lib/form-state";

const KIND_LABEL: Record<DeskMatch["kind"], string> = {
  subscription: "წევრობა",
  booking: "ჯავშანი",
  pass: "პასი",
};

const VERDICT_CLASSES: Record<DeskVerdict["tone"], string> = {
  green: "bg-green-light/40 text-green-dark",
  yellow: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-700",
};

function VerdictBadge({ verdict }: { verdict: DeskVerdict }) {
  return (
    <span
      className={cn(
        "inline-block rounded-pill px-2.5 py-1 text-xs font-semibold",
        VERDICT_CLASSES[verdict.tone],
      )}
    >
      {verdict.label}
    </span>
  );
}

/** ვიზიტის აღრიცხვა — duplicate-პასუხზე იგივე ფორმა force=1-ით
 *  („მაინც აღრიცხე") ხელახლა იგზავნება */
function AdmitForm({
  kind,
  id,
  method,
}: {
  kind: DeskMatch["kind"];
  id: string;
  method: "qr" | "manual";
}) {
  const [state, action, pending] = useActionState(
    admitVisitor,
    initialAdmitState,
  );
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="method" value={method} />
      {state.status === "duplicate" ? (
        <input type="hidden" name="force" value="1" />
      ) : null}
      <button
        type="submit"
        disabled={pending || state.status === "success"}
        className="min-h-9 rounded-pill bg-green-dark px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-mid disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "ინახება…"
          : state.status === "success"
            ? "აღრიცხულია ✓"
            : state.status === "duplicate"
              ? "მაინც აღრიცხე"
              : "მიღება"}
      </button>
      {state.status === "duplicate" && state.message ? (
        <p className="text-xs font-semibold text-amber-700">{state.message}</p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="text-xs font-semibold text-red-700">{state.message}</p>
      ) : null}
    </form>
  );
}

function ConfirmBookingForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    confirmBookingAtDesk,
    initialFormState,
  );
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending || state.status === "success"}
        className="min-h-9 rounded-pill bg-green-dark px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-mid disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "დასტურდება…"
          : state.status === "success"
            ? "დადასტურდა ✓"
            : "დაადასტურე შესვლა"}
      </button>
      {state.status === "error" && state.message ? (
        <p className="text-xs font-semibold text-red-700">{state.message}</p>
      ) : null}
    </form>
  );
}

function ResendCodeAtDeskForm({
  kind,
  id,
}: {
  kind: DeskMatch["kind"];
  id: string;
}) {
  const [state, action, pending] = useActionState(
    resendCodeAtDesk,
    initialFormState,
  );
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-pill border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:border-green-mid disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "იგზავნება…" : "კოდის გაგზავნა"}
      </button>
      {state.status === "error" && state.message ? (
        <p className="text-xs font-semibold text-red-700">{state.message}</p>
      ) : null}
      {state.status === "success" && state.message ? (
        <p className="text-xs font-semibold text-green-dark">{state.message}</p>
      ) : null}
    </form>
  );
}

export function DeskResultCard({
  result,
  muted = false,
  admitMethod = "manual",
}: {
  result: DeskMatch;
  muted?: boolean;
  /** QR-სკანით გახსნილ ბარათზე "qr" - ვიზიტი წყაროიანად აღირიცხება */
  admitMethod?: "qr" | "manual";
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-4",
        muted
          ? "border-ink bg-ink text-cream shadow-none"
          : "border-line bg-white shadow-card",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            className={cn(
              "text-xs font-semibold uppercase",
              muted ? "text-cream/60" : "text-ink-muted",
            )}
          >
            {KIND_LABEL[result.kind]} · {result.orderRef}
          </p>
          <p
            className={cn(
              "mt-0.5 text-base font-bold",
              muted ? "text-cream" : "text-ink",
            )}
          >
            {result.name}
          </p>
          <p className={cn("text-sm", muted ? "text-cream/70" : "text-ink-muted")}>
            {result.phoneMasked}
            {result.emailMasked ? ` · ${result.emailMasked}` : ""}
            {result.age != null ? ` · ასაკი ${result.age}` : ""}
          </p>
        </div>
      </div>
      <p className={cn("mt-2 text-sm", muted ? "text-cream/90" : "text-ink")}>
        {result.entitlement}
      </p>
      {!muted ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={result.verdict} />
            {result.visitedToday ? (
              <span className="text-xs font-semibold text-amber-700">
                დღეს უკვე აღრიცხულია {result.visitedToday.time}-ზე (
                {result.visitedToday.operator})
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <AdmitForm kind={result.kind} id={result.id} method={admitMethod} />
            {result.kind === "booking" && result.status === "pending" ? (
              <ConfirmBookingForm id={result.id} />
            ) : null}
            <ResendCodeAtDeskForm kind={result.kind} id={result.id} />
          </div>
        </>
      ) : null}
    </div>
  );
}
