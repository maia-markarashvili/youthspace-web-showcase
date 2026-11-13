"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitRegistration } from "@/app/actions";
import { trackContactLead } from "@/components/meta-pixel";
import { initialFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  Honeypot,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";

/**
 * მარტივი სარეგისტრაციო ფორმა — ზის პროდუქტის გვერდზევე (კლუბი, კურსი,
 * სივრცე, drop-in, აბონემენტი) იქ, სადაც ონლაინ ყიდვა არ დგას —
 * რეგისტრაცია = განაცხადი leads-ში.
 *
 * `choices` — ერთ გვერდზე რამდენიმე ვარიანტისას (მაგ. აბონემენტის პაკეტები):
 * რადიო მხოლოდ UI-ა, სერვერზე hidden ველებით არჩეული ვარიანტი იგზავნება.
 */
export function RegistrationForm({
  itemType,
  itemSlug,
  itemTitle,
  choices,
  choicesLabel,
  defaultChoiceSlug,
  messageHint,
  submitLabel = "დარეგისტრირდი",
}: {
  itemType: "club" | "course" | "membership" | "dropin" | "space";
  itemSlug?: string;
  itemTitle: string;
  choices?: Array<{ slug: string; title: string }>;
  choicesLabel?: string;
  defaultChoiceSlug?: string;
  messageHint?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(
    submitRegistration,
    initialFormState,
  );

  const [choiceIndex, setChoiceIndex] = useState(() => {
    if (!choices || !defaultChoiceSlug) return 0;
    const index = choices.findIndex((c) => c.slug === defaultChoiceSlug);
    return index === -1 ? 0 : index;
  });

  const selected = choices?.[choiceIndex];
  const activeSlug = selected?.slug ?? itemSlug ?? "";
  const activeTitle = selected?.title ?? itemTitle;

  /* Meta Pixel Lead — კონტაქტის დატოვება (განაცხადი leads-ში), ერთხელ */
  const leadFired = useRef(false);
  useEffect(() => {
    if (state.status !== "success" || leadFired.current) return;
    leadFired.current = true;
    trackContactLead({ name: activeTitle });
  }, [state.status, activeTitle]);

  if (state.status === "success") {
    return <FormMessage status="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} className="relative flex flex-col gap-3">
      <Honeypot />
      <input type="hidden" name="itemType" value={itemType} />
      <input type="hidden" name="itemSlug" value={activeSlug} />
      <input type="hidden" name="itemTitle" value={activeTitle} />

      {choices && choices.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">
            {choicesLabel ?? "აირჩიე ვარიანტი"}
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {choices.map((choice, index) => (
              <label
                key={choice.slug}
                className={
                  index === choiceIndex
                    ? "cursor-pointer rounded-pill border border-green-dark bg-green-dark px-4 py-2 text-sm font-semibold text-white"
                    : "cursor-pointer rounded-pill border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-green-mid"
                }
              >
                <input
                  type="radio"
                  name="item-choice-ui"
                  className="sr-only"
                  checked={index === choiceIndex}
                  onChange={() => setChoiceIndex(index)}
                />
                {choice.title}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <TextField
        label="სახელი"
        name="name"
        required
        autoComplete="name"
        error={state.errors?.name}
      />
      <TextField
        label="ტელეფონი"
        name="phone"
        type="tel"
        required
        autoComplete="tel"
        error={state.errors?.phone}
      />
      <TextField
        label="ელფოსტა"
        name="email"
        type="email"
        required
        autoComplete="email"
        error={state.errors?.email}
      />
      <TextAreaField
        label="კომენტარი"
        name="message"
        rows={3}
        className="min-h-20"
        hint={messageHint ?? "არასავალდებულო"}
        error={state.errors?.message}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "იგზავნება…" : submitLabel}
      </Button>

      <p className="text-xs text-ink-muted">
        გაგზავნით ეთანხმები{" "}
        <Link href="/terms" className="font-semibold underline">
          წესებსა და პირობებს
        </Link>
        .
      </p>
    </form>
  );
}
