"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { upsertCourse } from "./actions";
import { ClubDiscountsField } from "@/components/admin/club-discounts-field";
import { GalleryField, ImageField } from "@/components/admin/image-field";
import { ListField } from "@/components/admin/list-field";
import { MarkdownField } from "@/components/admin/markdown-field";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import type { Course } from "@/lib/db/schema";
import { initialFormState } from "@/lib/form-state";
import type { LandingFact } from "@/lib/landing";
import { toGel } from "@/lib/money";

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
 * ერთი ფორმა ორივესთვის: ახალი კურსი (defaultValues არ არის) და რედაქტირება.
 * placeholders — resolveCourseLanding-ის ეფექტური ფაქტები ([id] გვერდიდან),
 * რომ ადმინმა ცარიელ ველებში რეალური ავტო-მნიშვნელობები დაინახოს.
 */
export function CourseForm({
  defaultValues,
  placeholders,
  clubs,
}: {
  defaultValues?: Course;
  placeholders?: LandingFact[];
  /** აქტიური კლუბები — per-club ფასდაკლების ველისთვის */
  clubs: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    upsertCourse,
    initialFormState,
  );
  const landing = defaultValues?.landing;
  /* განვადება ჩართულია ⇔ ორივე სვეტი შევსებულია; მოსანიშნი მხოლოდ UI-ელემენტია
     (მოხსნისას ველები აღარ ირენდერება და მოქმედება null-ს წერს) */
  const [monthlyOn, setMonthlyOn] = useState(
    defaultValues?.monthlyPrice != null &&
      defaultValues?.monthlyMonths != null,
  );

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-5">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />

      <FormSection title="ძირითადი" divider={false}>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="სათაური"
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
            hint="URL-ისთვის - პატარა ლათინური ასოები, ციფრები, დეფისი"
            error={state.errors?.slug}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="კურსის დაწყება"
            name="startDate"
            type="date"
            defaultValue={defaultValues?.startDate ?? ""}
            hint="ცარიელი = შეზღუდვა არ მოქმედებს"
            error={state.errors?.startDate}
          />
          <TextField
            label="კურსის დასრულება"
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
          label="ყდის ფოტო"
          defaultValue={defaultValues?.coverImage}
        />
        <TextField
          label="განრიგის ბეიჯი"
          name="scheduleBadge"
          defaultValue={landing?.scheduleBadge ?? ""}
          hint="ცარიელი = ავტომატური განრიგიდან"
          error={state.errors?.scheduleBadge}
        />
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

      <FormSection title="FAQ">
        <ListField
          name="faq"
          label="კითხვები"
          fields={[
            { key: "q", label: "კითხვა", kind: "text" },
            { key: "a", label: "პასუხი", kind: "textarea" },
          ]}
          defaultValue={landing?.faq}
          hint="ცარიელი = ავტომატური FAQ"
        />
      </FormSection>

      <FormSection title="CTA">
        <div className="grid gap-5 sm:grid-cols-2">
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
          hint="ცარიელი = კურსის სათაური"
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

      <FormSection title="ლექტორი">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="ლექტორი"
            name="lecturer"
            defaultValue={defaultValues?.lecturer ?? ""}
            error={state.errors?.lecturer}
          />
          <TextField
            label="შეხვედრების რაოდენობა"
            name="meetingsCount"
            defaultValue={landing?.meetingsCount ?? ""}
            hint="მაგ. „8 შეხვედრა“"
            error={state.errors?.meetingsCount}
          />
        </div>
        <ImageField
          name="lecturerPhoto"
          label="ლექტორის ფოტო"
          defaultValue={landing?.lecturerPhoto}
        />
        <TextAreaField
          label="ლექტორის ბიო"
          name="lecturerBio"
          rows={3}
          defaultValue={landing?.lecturerBio ?? ""}
          error={state.errors?.lecturerBio}
        />
      </FormSection>

      <FormSection title="ფასები">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="ფასი (₾)"
            name="priceRegular"
            type="number"
            required
            min={0}
            step="0.01"
            defaultValue={defaultValues ? toGel(defaultValues.priceRegular) : ""}
            hint="0 = უფასო ღონისძიება (მაგ. ღია კარის დღე) - საიტზე ფასი არ ჩანს, რეგისტრაცია გადახდის გარეშე მაშინვე დასტურდება"
            error={state.errors?.priceRegular}
          />
          <TextField
            label="სააქციო ფასი (ლარი, ცარიელი = აქცია არაა)"
            name="salePrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={
              defaultValues?.salePrice != null
                ? toGel(defaultValues.salePrice)
                : ""
            }
            hint="შევსებისას საიტზე ორივე ჩანს - სტანდარტული გადახაზული, სააქციო გამოკვეთილი"
            error={state.errors?.salePrice}
          />
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            name="monthlyEnabled"
            checked={monthlyOn}
            onChange={(event) => setMonthlyOn(event.currentTarget.checked)}
            className="size-4 accent-green-dark"
          />
          დაამატე განვადება (მყიდველს დეფოლტად თვიური ფასი დაუდგება)
        </label>
        {monthlyOn ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="თვიური ფასი (₾)"
              name="monthlyPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={
                defaultValues?.monthlyPrice != null
                  ? toGel(defaultValues.monthlyPrice)
                  : ""
              }
              hint="საიტზე მთავარ ციფრად ეს გამოჩნდება, ქვეშ - ერთიანი ფასი"
              error={state.errors?.monthlyPrice}
            />
            <TextField
              label="რამდენი თვე"
              name="monthlyMonths"
              type="number"
              min={2}
              step="1"
              defaultValue={defaultValues?.monthlyMonths ?? ""}
              hint="მყიდველი ახლა მხოლოდ პირველ თვეს იხდის; დანარჩენს შეკვეთებში აღრიცხავ და SMS-ით ახსენებ"
              error={state.errors?.monthlyMonths}
            />
          </div>
        ) : null}
        <ClubDiscountsField
          name="clubDiscounts"
          label="ფასდაკლება კლუბის წევრებს (%)"
          clubs={clubs}
          defaultValue={defaultValues?.clubDiscounts}
          hint="0 = ამ კლუბის წევრებს ფასდაკლება არ მოქმედებს. რამდენიმე კლუბის წევრს ყველაზე მაღალი განაკვეთი ჩამოეჭრება."
        />
        <TextAreaField
          label="Cross-sell ტექსტი ყიდვის ბლოკში"
          name="crossSell"
          rows={2}
          defaultValue={landing?.crossSell ?? ""}
          hint="ცარიელი = ავტომატური ფასებიდან"
          error={state.errors?.crossSell}
        />
      </FormSection>

      <FormSection
        title="კატალოგი და მედია"
        hint="გამოიყენება ბარათებზე/სიებშიც"
      >
        <MarkdownField
          label="აღწერა"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          error={state.errors?.description}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="კატეგორია"
            name="category"
            defaultValue={defaultValues?.category ?? ""}
            error={state.errors?.category}
          />
          <TextField
            label="ადგილების რაოდენობა"
            name="capacity"
            type="number"
            min={1}
            step={1}
            defaultValue={defaultValues?.capacity ?? ""}
            hint="ცარიელი = ლიმიტის გარეშე"
            error={state.errors?.capacity}
          />
        </div>
        <TextField
          label="განრიგი"
          name="scheduleText"
          defaultValue={defaultValues?.scheduleText ?? ""}
          hint="მაგ. ორშაბათი და ოთხშაბათი, 18:00–20:00"
          error={state.errors?.scheduleText}
        />
        <GalleryField
          name="gallery"
          label="გალერეა"
          defaultValue={defaultValues?.gallery}
        />
      </FormSection>

      <div className="border-t border-line pt-6">
        <label
          htmlFor="isActive"
          className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink"
        >
          <input
            id="isActive"
            type="checkbox"
            name="isActive"
            defaultChecked={defaultValues?.isActive ?? true}
            className="size-4 accent-green-dark"
          />
          აქტიურია საიტზე
        </label>
        <label
          htmlFor="registrationClosed"
          className="mt-3 flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink"
        >
          <input
            id="registrationClosed"
            type="checkbox"
            name="registrationClosed"
            defaultChecked={defaultValues?.registrationClosed ?? false}
            className="size-4 accent-green-dark"
          />
          მიღება დასრულებულია - საიტზე ჩანს წარწერა, რეგისტრაცია იკეტება
        </label>
      </div>

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "შენახვა"}
      </Button>
    </form>
  );
}
