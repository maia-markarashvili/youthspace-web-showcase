"use client";

import { useActionState, useEffect, useRef } from "react";
import { subscribeNewsletter } from "@/app/actions";
import { track } from "@/components/meta-pixel";
import { initialFormState } from "@/lib/form-state";
import { cn } from "@/lib/cn";

/** ნიუსლეთერი (§5.10) — footer-ში და მთავარი გვერდის ბოლო სექციაში */
export function NewsletterForm({
  source,
  tone = "light",
}: {
  source: string;
  tone?: "light" | "dark";
}) {
  const [state, action, pending] = useActionState(
    subscribeNewsletter,
    initialFormState,
  );

  /* Meta Pixel Subscribe — გამოწერა შედგა, ერთხელ */
  const subscribeFired = useRef(false);
  useEffect(() => {
    if (state.status !== "success" || subscribeFired.current) return;
    subscribeFired.current = true;
    track("Subscribe", { content_name: source });
  }, [state.status, source]);

  const isDark = tone === "dark";

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="source" value={source} />
      <div
        aria-hidden
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <input name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          ელფოსტა
        </label>
        <input
          id={`newsletter-${source}`}
          type="email"
          name="email"
          required
          placeholder="თქვენი ელფოსტა"
          className={cn(
            "min-h-11 w-full rounded-pill border px-4 py-2.5 text-base",
            isDark
              ? "border-white/30 bg-white/10 text-white placeholder:text-white/60"
              : "border-line bg-white text-ink placeholder:text-ink-muted/60",
          )}
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "min-h-11 shrink-0 rounded-pill px-6 py-2.5 text-sm font-semibold transition disabled:opacity-60",
            isDark
              ? "bg-white text-green-dark hover:bg-green-light"
              : "bg-green-dark text-white hover:bg-green-mid",
          )}
        >
          {pending ? "იგზავნება…" : "გამოწერა"}
        </button>
      </div>

      {state.message ? (
        <p
          role="status"
          className={cn(
            "text-sm font-semibold",
            state.status === "success"
              ? isDark
                ? "text-green-light"
                : "text-green-dark"
              : "text-red-600",
          )}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
