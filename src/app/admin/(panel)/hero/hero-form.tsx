"use client";

import { useActionState } from "react";
import { upsertHeroSlide } from "./actions";
import { ImageField } from "@/components/admin/image-field";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  FormMessage,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import type { HeroSlide } from "@/lib/db/schema";
import { initialFormState } from "@/lib/form-state";

/** სტატების 4 ფიქსირებული წყვილი — ცარიელი წყვილი საიტზე არ ჩანს */
const STAT_INDEXES = [1, 2, 3, 4] as const;

export function HeroSlideForm({ defaultValues }: { defaultValues?: HeroSlide }) {
  const [state, action, pending] = useActionState(
    upsertHeroSlide,
    initialFormState,
  );

  const stats = defaultValues?.stats ?? [];

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />

      <TextField
        label="ზედწარწერა (eyebrow)"
        name="eyebrow"
        defaultValue={defaultValues?.eyebrow ?? ""}
        hint="არასავალდებულო - მწვანე პატარა ხაზი სათაურის ზემოთ"
        error={state.errors?.eyebrow}
      />

      <TextField
        label="სათაური"
        name="title"
        required
        defaultValue={defaultValues?.title ?? ""}
        error={state.errors?.title}
      />

      <TextField
        label="სლოგანი სათაურის ქვემოთ"
        name="sloganUnder"
        defaultValue={defaultValues?.sloganUnder ?? ""}
        hint="არასავალდებულო - მაგ. „გართობა · ურთიერთობა · განვითარება“"
        error={state.errors?.sloganUnder}
      />

      <TextAreaField
        label="ტექსტი"
        name="body"
        required
        rows={4}
        defaultValue={defaultValues?.body ?? ""}
        error={state.errors?.body}
      />

      <ImageField
        name="image"
        label="ბანერის ფოტო"
        defaultValue={defaultValues?.image ?? ""}
      />
      {state.errors?.image ? (
        <p className="text-xs font-semibold text-red-700">
          {state.errors.image}
        </p>
      ) : null}

      <TextField
        label="ფოტოს აღწერა (alt)"
        name="imageAlt"
        required
        defaultValue={defaultValues?.imageAlt ?? ""}
        error={state.errors?.imageAlt}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ღილაკი 1 - წარწერა"
          name="cta1Label"
          defaultValue={defaultValues?.cta1Label ?? ""}
          error={state.errors?.cta1Label}
        />
        <TextField
          label="ღილაკი 1 - ბმული"
          name="cta1Href"
          defaultValue={defaultValues?.cta1Href ?? ""}
          hint="მაგ. /clubs"
          error={state.errors?.cta1Href}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ღილაკი 2 - წარწერა"
          name="cta2Label"
          defaultValue={defaultValues?.cta2Label ?? ""}
          error={state.errors?.cta2Label}
        />
        <TextField
          label="ღილაკი 2 - ბმული"
          name="cta2Href"
          defaultValue={defaultValues?.cta2Href ?? ""}
          hint="მაგ. /about"
          error={state.errors?.cta2Href}
        />
      </div>

      <fieldset className="flex flex-col gap-4 rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">
          დიდი რიცხვები (სტატები)
        </legend>
        <p className="text-xs text-ink-muted">
          საიტზე გამოჩნდება მხოლოდ ის წყვილი, სადაც ორივე ველი შევსებულია.
        </p>
        {STAT_INDEXES.map((index) => (
          <div key={index} className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={`მაჩვენებელი ${index} - რიცხვი`}
              name={`stat${index}Value`}
              defaultValue={stats[index - 1]?.value ?? ""}
            />
            <TextField
              label={`მაჩვენებელი ${index} - წარწერა`}
              name={`stat${index}Label`}
              defaultValue={stats[index - 1]?.label ?? ""}
            />
          </div>
        ))}
      </fieldset>

      <TextField
        label="რიგი"
        name="sortOrder"
        type="number"
        defaultValue={String(defaultValues?.sortOrder ?? 0)}
        hint="ნაკლები რიცხვი - უფრო წინ"
        error={state.errors?.sortOrder}
      />

      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          className="size-4 accent-green-dark"
        />
        აქტიური (ჩანს საიტზე)
      </label>

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "ინახება…" : "შენახვა"}
        </Button>
        <ButtonLink href="/admin/hero" variant="ghost">
          გაუქმება
        </ButtonLink>
      </div>
    </form>
  );
}
