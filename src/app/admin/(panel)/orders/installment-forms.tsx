"use client";

import { useActionState } from "react";
import { markCourseInstallmentMonth, sendInstallmentReminder } from "./actions";
import { initialFormState } from "@/lib/form-state";

/**
 * კურსის განვადების ხელით აღრიცხვა და შეხსენება (/admin/orders → ჯავშნები).
 * ავტომატური ჩამოჭრა და cron არ არსებობს - მფლობელმა ხელით გაგზავნა აირჩია
 * (იგივე მოდელი, რაც კლუბის განახლებაზეა).
 */

const buttonBase =
  "min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60";

function StateNote({ status, message }: { status: string; message?: string }) {
  if (!message || (status !== "error" && status !== "success")) return null;
  return (
    <p
      className={
        status === "error"
          ? "max-w-52 text-xs font-semibold whitespace-normal text-red-700"
          : "max-w-52 text-xs font-semibold whitespace-normal text-green-dark"
      }
    >
      {message}
    </p>
  );
}

/** „+1 თვე“ (და გვერდით პატარა „−1“ შემთხვევითი დაჭერის გასასწორებლად) */
export function InstallmentMonthForm({
  bookingId,
  monthsPaid,
  planMonths,
}: {
  bookingId: string;
  monthsPaid: number;
  planMonths: number;
}) {
  const [state, action, pending] = useActionState(
    markCourseInstallmentMonth,
    initialFormState,
  );
  const canAdd = monthsPaid < planMonths;
  const canUndo = monthsPaid > 1;
  if (!canAdd && !canUndo) return null;

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="flex items-center gap-1">
        {canAdd ? (
          <button
            type="submit"
            name="direction"
            value="up"
            disabled={pending}
            onClick={(event) => {
              if (!window.confirm("მონიშნო კიდევ ერთი გადახდილი თვე?")) {
                event.preventDefault();
              }
            }}
            className={`${buttonBase} text-green-dark hover:bg-green-light/30`}
          >
            {pending ? "ინახება…" : "+1 თვე"}
          </button>
        ) : null}
        {canUndo ? (
          <button
            type="submit"
            name="direction"
            value="down"
            disabled={pending}
            onClick={(event) => {
              if (!window.confirm("დავაბრუნო ერთი თვით უკან?")) {
                event.preventDefault();
              }
            }}
            className={`${buttonBase} px-2.5 text-ink-muted hover:bg-cream`}
          >
            −1
          </button>
        ) : null}
      </div>
      <StateNote status={state.status} message={state.message} />
    </form>
  );
}

/** „შეხსენება“ - sms.installment.due (ცარიელი შაბლონი = არ იგზავნება) */
export function InstallmentReminderForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(
    sendInstallmentReminder,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button
        type="submit"
        disabled={pending}
        className={`${buttonBase} text-ink-muted hover:bg-cream`}
      >
        {pending ? "იგზავნება…" : "შეხსენება"}
      </button>
      <StateNote status={state.status} message={state.message} />
    </form>
  );
}
