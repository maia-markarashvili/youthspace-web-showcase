"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { upsertClub } from "./actions";
import { GalleryField, ImageField } from "@/components/admin/image-field";
import { ListField } from "@/components/admin/list-field";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import type { Club } from "@/lib/db/schema";
import { initialFormState } from "@/lib/form-state";
import type { LandingFact } from "@/lib/landing";

/** select-ისთვის — form-field-ის controlClass-ის ანალოგი */
const selectClass =
  "min-h-11 w-full rounded-card border border-line bg-white px-4 py-2.5 text-base text-ink focus:border-green-mid";

/** ფორმის თავი — გრძელი ფორმა სექციებად იყოფა */
function FormSection({
  title,
  hint,
  divider = true,
  children,
}: {
  title: string;
  hint?: string;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        divider
          ? "flex flex-col gap-4 border-t border-line pt-6"
          : "flex flex-col gap-4"
      }
    >
      <div>
        <h3 className="text-h3 font-semibold text-ink">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * ერთი ფორმა ორივესთვის: ახალი კლუბი (defaultValues არ აქვს) და რედაქტირება.
 * placeholders — resolveClubLanding-ის ეფექტური ფაქტები ([id] გვერდიდან),
 * რომ ადმინმა ცარიელ ველებში რეალური ავტო-მნიშვნელობები დაინახოს.
 */
export function ClubForm({
  defaultValues,
  placeholders,
  storyOptions = [],
}: {
  defaultValues?: Club;
  placeholders?: LandingFact[];
  storyOptions?: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(upsertClub, initialFormState);
  const landing = defaultValues?.landing;

  return (
    <form
      action={action}
      className="flex max-w-3xl flex-col gap-5 rounded-card border border-line bg-white p-6 shadow-card"
    >
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />

      <FormSection title="ძირითადი" divider={false}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="სახელი"
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
            hint="ლათინურად, დეფისებით - მაგ. robotics-club"
            error={state.errors?.slug}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="მუშაობის დაწყება"
            name="startDate"
            type="date"
            defaultValue={defaultValues?.startDate ?? ""}
            hint="ცარიელი = შეზღუდვა არ მოქმედებს"
            error={state.errors?.startDate}
          />
          <TextField
            label="მუშაობის დასრულება"
            name="endDate"
            type="date"
            defaultValue={defaultValues?.endDate ?? ""}
            hint="ცარიელი = შეზღუდვა არ მოქმედებს"
            error={state.errors?.endDate}
          />
        </div>
      </FormSection>

      <FormSection title="ჰერო">
        <TextAreaField
          label="ჰეროს აღწერა"
          name="heroDescription"
          rows={2}
          defaultValue={landing?.heroDescription ?? ""}
          hint="მაქს. ~160 სიმბოლო - ცარიელი = ავტომატური"
          error={state.errors?.heroDescription}
        />
        <ImageField
          name="coverImage"
          label="ქავერ-ფოტო"
          defaultValue={defaultValues?.coverImage}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="განრიგის ბეიჯი"
            name="scheduleBadge"
            defaultValue={landing?.scheduleBadge ?? ""}
            hint="ცარიელი = ავტომატური განრიგიდან"
            error={state.errors?.scheduleBadge}
          />
          <TextField
            label="ასაკობრივი ჯგუფი"
            name="ageRange"
            defaultValue={defaultValues?.ageRange ?? ""}
            hint="მაგ. 12–16 წელი"
            error={state.errors?.ageRange}
          />
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            name="showSeats"
            defaultChecked={landing?.showSeats ?? true}
            className="size-4 accent-green-dark"
          />
          აჩვენე „დარჩა N ადგილი“ ბეიჯი (N ლაივ ითვლება)
        </label>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            name="askAge"
            defaultChecked={landing?.askAge ?? false}
            className="size-4 accent-green-dark"
          />
          მოითხოვე ასაკის ველი ყიდვის ფორმაში
        </label>
      </FormSection>

      <FormSection
        title="ფაქტების ზოლი"
        hint="4 წყვილი - ინახება მხოლოდ ის, სადაც ორივე ველია შევსებული; ცარიელი = ავტომატური (ჩანს placeholder-ში)"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {([1, 2, 3, 4] as const).flatMap((n) => {
            const fact = landing?.facts?.[n - 1];
            const auto = placeholders?.[n - 1];
            return [
              <TextField
                key={`fact${n}Title`}
                label={`ფაქტი ${n} - სათაური`}
                name={`fact${n}Title`}
                defaultValue={fact?.title ?? ""}
                placeholder={auto?.title ?? "სათაური"}
                error={state.errors?.[`fact${n}Title`]}
              />,
              <TextField
                key={`fact${n}Text`}
                label={`ფაქტი ${n} - ტექსტი`}
                name={`fact${n}Text`}
                defaultValue={fact?.text ?? ""}
                placeholder={auto?.text ?? "მოკლე ტექსტი"}
                error={state.errors?.[`fact${n}Text`]}
              />,
            ];
          })}
        </div>
      </FormSection>

      <FormSection title="„რას მიიღებ“">
        <ListField
          name="benefits"
          label="პუნქტები"
          fields={[{ key: "text", label: "პუნქტი", kind: "text" }]}
          defaultValue={landing?.benefits?.map((text) => ({ text }))}
          max={5}
          hint="ცარიელი = ავტომატური სია (მაქს. 5 პუნქტი)"
        />
      </FormSection>

      <FormSection title="პროგრამა">
        <TextAreaField
          label="შესავალი (პროგრამის წინ)"
          name="programIntro"
          rows={4}
          defaultValue={landing?.programIntro ?? ""}
          hint="არასავალდებულო. აქ დაწერილი ტექსტი სრულად ჩანს - აბზაცებით და სიებით („- “ ხაზის დასაწყისში). გრძელი ტექსტი ჰეროს აღწერაში 160 სიმბოლოზე იჭრება, ამიტომ ვრცელი შესავალი აქ დაწერე."
        />
        <ListField
          name="program"
          label="პროგრამის პუნქტები"
          fields={[
            { key: "title", label: "სათაური", kind: "text" },
            { key: "text", label: "ტექსტი", kind: "textarea" },
          ]}
          defaultValue={landing?.program}
          hint="ცარიელი = სექცია საიტზე არ გამოჩნდება"
        />
      </FormSection>

      <FormSection title="ციკლი">
        <TextAreaField
          label="რით სრულდება ციკლი"
          name="cycleCard"
          rows={3}
          defaultValue={landing?.cycleCard ?? ""}
          hint="ცარიელი = საბოლოო პროდუქტიდან"
          error={state.errors?.cycleCard}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cycleStoryId"
            className="text-sm font-semibold text-ink"
          >
            მიბმული ისტორია
          </label>
          <select
            id="cycleStoryId"
            name="cycleStoryId"
            defaultValue={landing?.cycleStoryId ?? ""}
            className={selectClass}
          >
            <option value="">- არცერთი -</option>
            {storyOptions.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-muted">
            ლენდინგზე ციკლის ბარათს „ნახე როგორ ჩატარდა“ ბმული ემატება
          </p>
        </div>
      </FormSection>

      <FormSection title="CTA">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="ღილაკის ტექსტი"
            name="ctaLabel"
            defaultValue={landing?.ctaLabel ?? ""}
            hint="ცარიელი = ავტომატური"
            error={state.errors?.ctaLabel}
          />
          <TextField
            label="მიკროტექსტი ღილაკის ქვეშ"
            name="ctaMicrocopy"
            defaultValue={landing?.ctaMicrocopy ?? ""}
            hint="ცარიელი = ავტომატური"
            error={state.errors?.ctaMicrocopy}
          />
        </div>
      </FormSection>

      <FormSection title="SEO">
        <TextField
          label="SEO სათაური"
          name="seoTitle"
          defaultValue={landing?.seoTitle ?? ""}
          hint="ცარიელი = კლუბის სახელი"
          error={state.errors?.seoTitle}
        />
        <TextAreaField
          label="SEO აღწერა"
          name="seoDescription"
          rows={2}
          defaultValue={landing?.seoDescription ?? ""}
          hint="ცარიელი = ჰეროს აღწერა"
          error={state.errors?.seoDescription}
        />
        <ImageField
          name="seoImage"
          label="SEO ფოტო (og:image)"
          defaultValue={landing?.seoImage}
        />
      </FormSection>

      <FormSection
        title="კატალოგი და მედია"
        hint="გამოიყენება ბარათებზე/სიებშიც"
      >
        <TextAreaField
          label="აღწერა"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          error={state.errors?.description}
        />
        <TextAreaField
          label="ვისთვისაა"
          name="audience"
          rows={3}
          defaultValue={defaultValues?.audience ?? ""}
          error={state.errors?.audience}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="ფორმატი"
            name="format"
            defaultValue={defaultValues?.format ?? ""}
            hint="მაგ. ჯგუფური მუშაობა კვირაში ერთხელ"
            error={state.errors?.format}
          />
          <TextField
            label="საბოლოო პროდუქტი"
            name="finalProduct"
            defaultValue={defaultValues?.finalProduct ?? ""}
            hint="რას ქმნიან მონაწილეები სეზონის ბოლოს"
            error={state.errors?.finalProduct}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="შეხვედრის დღე"
            name="meetingDay"
            defaultValue={defaultValues?.meetingDay ?? ""}
            hint="მაგ. შაბათი"
            error={state.errors?.meetingDay}
          />
          <TextField
            label="შეხვედრის დრო"
            name="meetingTime"
            defaultValue={defaultValues?.meetingTime ?? ""}
            hint="მაგ. 14:00–16:00"
            error={state.errors?.meetingTime}
          />
          <TextField
            label="მაქს. ადგილები"
            name="maxCapacity"
            type="number"
            min={1}
            step={1}
            defaultValue={defaultValues?.maxCapacity ?? ""}
            hint="ცარიელი = შეზღუდვის გარეშე"
            error={state.errors?.maxCapacity}
          />
        </div>
        <GalleryField
          name="gallery"
          label="გალერეა"
          defaultValue={defaultValues?.gallery}
        />
        <p className="text-xs text-ink-muted">
          ფასები ცენტრალურად იმართება -{" "}
          <a
            href="/admin/pricing"
            className="font-semibold text-green-dark underline"
          >
            ფასების გვერდი
          </a>
          .
        </p>
      </FormSection>

      <div className="grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        <TextField
          label="რიგითობა"
          name="sortOrder"
          type="number"
          step={1}
          defaultValue={defaultValues?.sortOrder ?? 0}
          hint="ნაკლები რიცხვი - სიაში უფრო მაღლა"
          error={state.errors?.sortOrder}
        />
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          className="size-4 accent-green-dark"
        />
        აქტიურია - ჩანს საიტზე
      </label>

      <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          name="registrationClosed"
          defaultChecked={defaultValues?.registrationClosed ?? false}
          className="size-4 accent-green-dark"
        />
        მიღება დასრულებულია - საიტზე ჩანს წარწერა, ახალი რეგისტრაცია იკეტება
        (არსებული წევრების განახლება მუშაობს)
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
