"use client";

import { useActionState, useState } from "react";
import { upsertContentPost } from "./actions";
import { FileField } from "@/components/admin/file-field";
import { GalleryField } from "@/components/admin/image-field";
import { ListField } from "@/components/admin/list-field";
import { MarkdownField } from "@/components/admin/markdown-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import type { ContentPost } from "@/lib/db/schema";
import { initialFormState } from "@/lib/form-state";

/** ტიპების ქართული ლეიბლები (schema-ს CONTENT_TYPES-ის რიგით) */
const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "news", label: "სიახლე (ამბები)" },
  { value: "work_text", label: "ნამუშევარი - ტექსტი" },
  { value: "work_video", label: "ნამუშევარი - ვიდეო" },
  { value: "work_research", label: "ნამუშევარი - კვლევა (PDF)" },
];

const selectClass =
  "min-h-11 w-full rounded-card border border-line bg-white px-4 py-2.5 text-base text-ink focus:border-green-mid";

export function ContentForm({
  defaultValues,
  clubsOptions,
}: {
  defaultValues?: ContentPost;
  clubsOptions: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    upsertContentPost,
    initialFormState,
  );
  /* ტიპზეა დამოკიდებული, რომელი ველები ჩანს (YouTube / PDF / კოლექცია) */
  const [type, setType] = useState(defaultValues?.type ?? "news");
  const isWork = type.startsWith("work_");

  /* ახალზე — დღევანდელი თარიღი; რედაქტირებაზე — არსებული ან ცარიელი */
  const publishedDefault = defaultValues
    ? (defaultValues.publishedAt?.toISOString().slice(0, 10) ?? "")
    : new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-semibold text-ink">
          ტიპი<span className="text-green-mid"> *</span>
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={selectClass}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {state.errors?.type ? (
          <p className="text-xs font-semibold text-red-700">
            {state.errors.type}
          </p>
        ) : null}
      </div>

      <TextField
        label="სათაური"
        name="title"
        required
        defaultValue={defaultValues?.title ?? ""}
        error={state.errors?.title}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Slug"
          name="slug"
          defaultValue={defaultValues?.slug ?? ""}
          hint="არასავალდებულო; უნიკალური, ლათინურით"
          error={state.errors?.slug}
        />
        {isWork ? (
          <TextField
            label="კოლექციის slug"
            name="collectionSlug"
            defaultValue={defaultValues?.collectionSlug ?? ""}
            hint="აჯგუფებს ერთი ღონისძიების ჩანაწერებს"
            error={state.errors?.collectionSlug}
          />
        ) : null}
      </div>

      {type === "work_video" ? (
        <TextField
          label="YouTube ბმული"
          name="youtubeUrl"
          required
          defaultValue={defaultValues?.youtubeUrl ?? ""}
          hint="watch, youtu.be ან shorts ბმული - thumbnail და დაკვრა აქედან მოდის"
          error={state.errors?.youtubeUrl}
        />
      ) : null}

      {type === "work_research" ? (
        <FileField
          label="კვლევის PDF"
          name="fileUrl"
          defaultValue={defaultValues?.fileUrl ?? ""}
          hint="არასავალდებულო - თუ აიტვირთა, საიტზე „გადმოწერის“ ღილაკი გამოჩნდება"
          error={state.errors?.fileUrl}
        />
      ) : null}

      <MarkdownField
        label="ტექსტი"
        name="body"
        rows={10}
        defaultValue={defaultValues?.body ?? ""}
        error={state.errors?.body}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ავტორი"
          name="authorName"
          defaultValue={defaultValues?.authorName ?? ""}
          hint="არასავალდებულო"
          error={state.errors?.authorName}
        />
        <TextField
          label="გამოქვეყნების თარიღი"
          name="publishedAt"
          type="date"
          defaultValue={publishedDefault}
          error={state.errors?.publishedAt}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="clubId" className="text-sm font-semibold text-ink">
          კლუბი
        </label>
        <select
          id="clubId"
          name="clubId"
          defaultValue={defaultValues?.clubId ?? ""}
          className={selectClass}
        >
          <option value="">- კლუბის გარეშე -</option>
          {clubsOptions.map((club) => (
            <option key={club.id} value={club.id}>
              {club.title}
            </option>
          ))}
        </select>
        {state.errors?.clubId ? (
          <p className="text-xs font-semibold text-red-700">
            {state.errors.clubId}
          </p>
        ) : null}
      </div>

      <GalleryField
        name="media"
        label="მედია"
        defaultValue={defaultValues?.media ?? []}
      />

      <ListField
        name="relatedLinks"
        label="დაკავშირებული ბმულები"
        hint="ღილაკებად გამოჩნდება პოსტის ბოლოში - შიდა (/stories/...) ან სრული https ბმული"
        fields={[
          { key: "label", label: "წარწერა", kind: "text" },
          {
            key: "href",
            label: "ბმული",
            kind: "text",
            placeholder: "/stories?tab=works&kind=texts",
          },
        ]}
        defaultValue={defaultValues?.relatedLinks ?? []}
        max={6}
        addLabel="+ ბმულის დამატება"
      />

      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={defaultValues?.isFeatured ?? false}
          className="size-4 accent-green-dark"
        />
        მთავარ გვერდზე გამორჩეული
      </label>

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
        <ButtonLink href="/admin/content" variant="ghost">
          გაუქმება
        </ButtonLink>
      </div>
    </form>
  );
}
