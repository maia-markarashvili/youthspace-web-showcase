"use client";

import { useActionState } from "react";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { ImageField } from "@/components/admin/image-field";
import { MarkdownField } from "@/components/admin/markdown-field";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import { initialFormState } from "@/lib/form-state";
import type { TextKind } from "@/lib/site-texts";
import { resetGroup, saveTexts } from "./actions";

export type TextsFormEntry = {
  key: string;
  label: string;
  kind: TextKind;
  default: string;
  /** true = ცარიელი ველი ამ ჩანაწერზე შეტყობინებას გამორთავს (SMS/ელფოსტა) */
  disablable: boolean;
  /** DB-ში არსებული override; null = საიტზე default ჩანს */
  override: string | null;
};

/** ერთი ჯგუფის ტექსტების ფორმა — ცარიელი ველი = default-ზე დაბრუნება */
export function TextsForm({
  group,
  entries,
}: {
  group: string;
  entries: TextsFormEntry[];
}) {
  const [state, action, pending] = useActionState(saveTexts, initialFormState);

  return (
    <>
      <form action={action} className="flex max-w-3xl flex-col gap-5">
        <input type="hidden" name="group" value={group} />

        {entries.map((entry) => (
          <div key={entry.key} className="relative">
            {entry.disablable && entry.override === "" ? (
              <span className="absolute top-0 right-0 rounded-pill bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-muted">
                გამორთულია
              </span>
            ) : entry.override !== null ? (
              <span className="absolute top-0 right-0 rounded-pill bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                შეცვლილია
              </span>
            ) : null}
            {entry.kind === "markdown" ? (
              /* ერთიანი დიდი ტექსტი (წესები/კონფიდენციალურობა) — ტულბარი + პრევიუ */
              <MarkdownField
                label={entry.label}
                name={entry.key}
                rows={24}
                defaultValue={entry.override ?? entry.default}
              />
            ) : entry.kind === "textarea" ? (
              <TextAreaField
                label={entry.label}
                name={entry.key}
                rows={4}
                defaultValue={entry.override ?? entry.default}
              />
            ) : entry.kind === "image" ? (
              <ImageField
                label={entry.label}
                name={entry.key}
                defaultValue={entry.override ?? entry.default}
              />
            ) : entry.kind === "toggle" ? (
              /* checkbox: მონიშნული → submit value === default → რიგი იშლება
                 (ჩართული); მოხსნილი → ველი არ იგზავნება → "" → disablable
                 ინახავს ცარიელს (გამორთული) - actions.ts უცვლელად მუშაობს */
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  name={entry.key}
                  value={entry.default}
                  defaultChecked={(entry.override ?? entry.default) !== ""}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-green-dark"
                />
                <span>{entry.label}</span>
              </label>
            ) : (
              <TextField
                label={entry.label}
                name={entry.key}
                defaultValue={entry.override ?? entry.default}
              />
            )}
          </div>
        ))}

        {state.status !== "idle" && state.message ? (
          <FormMessage status={state.status}>{state.message}</FormMessage>
        ) : null}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "ინახება…" : "შენახვა"}
        </Button>
      </form>

      <form
        action={resetGroup.bind(null, group)}
        className="mt-8 border-t border-line pt-4"
      >
        <ConfirmSubmit confirmText="ნამდვილად დავაბრუნოთ ამ ჯგუფის ყველა ტექსტი default-ზე? შენახული ცვლილებები წაიშლება.">
          ჯგუფის აღდგენა default-ებზე
        </ConfirmSubmit>
      </form>
    </>
  );
}
