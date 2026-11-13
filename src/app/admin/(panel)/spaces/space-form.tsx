"use client";

import { useActionState } from "react";
import { upsertSpace } from "./actions";
import { GalleryField, ImageField } from "@/components/admin/image-field";
import { MarkdownField } from "@/components/admin/markdown-field";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import type { Space } from "@/lib/db/schema";
import { initialFormState } from "@/lib/form-state";

/**
 * სივრცის კონტენტის ფორმა — ღონისძიების ერთიან მოდელზე (2026-08-30)
 * გვერდი მხოლოდ პირველი აქტიური რიგის კონტენტს (აღწერა/გალერეა/ინვენტარი)
 * აჩვენებს; ფასები ადმინის „ფასები" გვერდიდან იმართება, ხელმისაწვდომობა -
 * კალენდრის ღონისძიების დროშებიდან. ძველი საათობრივი ფასები/რეჟიმები
 * ფორმიდან ამოღებულია.
 * ერთი ფორმა ორივესთვის — ახალი (defaultValues გარეშე) და რედაქტირება.
 */
export function SpaceForm({ defaultValues }: { defaultValues?: Space }) {
  const [state, action, pending] = useActionState(upsertSpace, initialFormState);

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-5">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="სახელწოდება"
          name="title"
          required
          defaultValue={defaultValues?.title}
          error={state.errors?.title}
        />
        <TextField
          label="Slug"
          name="slug"
          required
          defaultValue={defaultValues?.slug}
          hint="ლათინურად, დეფისებით - ჩანს URL-ში"
          error={state.errors?.slug}
        />
      </div>

      <MarkdownField
        label="აღწერა"
        name="description"
        defaultValue={defaultValues?.description ?? ""}
        error={state.errors?.description}
      />

      <ImageField
        name="coverImage"
        label="ყდის ფოტო"
        defaultValue={defaultValues?.coverImage}
      />
      <GalleryField
        name="gallery"
        label="გალერეა"
        defaultValue={defaultValues?.gallery}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="ტევადობა"
          name="capacity"
          type="number"
          min={1}
          step={1}
          defaultValue={defaultValues?.capacity ?? ""}
          hint="მაქს. ადამიანების რაოდენობა (არასავალდებულო)"
          error={state.errors?.capacity}
        />
        <TextField
          label="რიგითობა"
          name="sortOrder"
          type="number"
          step={1}
          defaultValue={defaultValues?.sortOrder ?? 0}
          hint="საჯარო გვერდი პირველ აქტიურ რიგს აჩვენებს"
          error={state.errors?.sortOrder}
        />
      </div>

      <TextAreaField
        label="ინვენტარი"
        name="inventory"
        hint="თითო ნივთი ახალ ხაზზე"
        defaultValue={defaultValues?.inventory.join("\n") ?? ""}
        error={state.errors?.inventory}
      />

      <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          className="size-4 accent-green-dark"
        />
        აქტიურია - ჩანს საიტზე
      </label>

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "შენახვა"}
      </Button>
    </form>
  );
}
