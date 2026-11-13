"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import type { PricingSettings } from "@/lib/db/schema";
import { initialFormState } from "@/lib/form-state";
import { toGel } from "@/lib/money";
import { DEFAULT_EVENT_PEOPLE_TIERS, eventPeopleTiers } from "@/lib/pricing";
import { savePricing } from "./actions";

/**
 * ფასების singleton-ფორმა — redirect არ არის, იგივე გვერდი რჩება („შენახულია").
 * ყველა თანხა ფორმაში **ლარებშია**; ბაზაში action თეთრებად გადაჰყავს.
 * კურსის ფასდაკლებები აქ აღარ იწერება — თითო კურსის რედაქტორშია.
 */

const BASE_FIELDS = [
  { name: "clubPrice", label: "კლუბის წევრობა (თვეში)" },
  { name: "singleEntryPrice", label: "ერთჯერადი შესვლა" },
  { name: "fourPackPrice", label: "4-ჯერადი პასი" },
] as const;

const SALE_FIELDS = [
  { name: "saleClubPrice", label: "კლუბის წევრობა (თვეში)" },
  { name: "saleSingleEntryPrice", label: "ერთჯერადი შესვლა" },
  { name: "saleFourPackPrice", label: "4-ჯერადი პასი" },
] as const;

/* ღონისძიების სლოტის ფასები — სტანდარტული სავალდებულო, წევრის არასავალდებულო */
const EVENT_SLOT_FIELDS = [
  {
    standard: "eventPriceMorning",
    member: "eventMemberPriceMorning",
    label: "დილის სლოტი 10:00–14:00",
  },
  {
    standard: "eventPriceMidday",
    member: "eventMemberPriceMidday",
    label: "შუადღის სლოტი 14:00–18:00",
  },
  {
    standard: "eventPriceEvening",
    member: "eventMemberPriceEvening",
    label: "საღამოს სლოტი 18:00–22:00",
  },
] as const;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-white p-6 shadow-card">
      <div>
        <h2 className="text-base font-bold text-green-dark">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function PricingForm({
  defaultValues,
}: {
  defaultValues: PricingSettings | null;
}) {
  const [state, action, pending] = useActionState(
    savePricing,
    initialFormState,
  );

  /* ზუსტად 4 საფეხური ფორმაში — ნაკლულ DB-მნიშვნელობას default ავსებს */
  const storedTiers = defaultValues
    ? eventPeopleTiers(defaultValues)
    : DEFAULT_EVENT_PEOPLE_TIERS;
  const tierDefaults = Array.from(
    { length: 4 },
    (_, i) => storedTiers[i] ?? DEFAULT_EVENT_PEOPLE_TIERS[i],
  );

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6">
      <Section
        title="ძირითადი ფასები (ლარი)"
        hint="კლუბის ფასი ერთია ყველა კლუბზე - ცვლილება ყველგან ერთდროულად აისახება."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BASE_FIELDS.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              name={field.name}
              type="number"
              required
              min={0}
              step={0.01}
              defaultValue={
                defaultValues ? toGel(defaultValues[field.name]) : undefined
              }
              error={state.errors?.[field.name]}
            />
          ))}
        </div>
      </Section>

      <Section
        title="სააქციო ფასები (ცარიელი = აქცია არაა)"
        hint="შევსებისას საიტზე ორივე ჩანს - სტანდარტული გადახაზული, სააქციო გამოკვეთილი."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SALE_FIELDS.map((field) => {
            const current = defaultValues?.[field.name];
            return (
              <TextField
                key={field.name}
                label={field.label}
                name={field.name}
                type="number"
                min={0}
                step={0.01}
                defaultValue={current != null ? toGel(current) : ""}
                error={state.errors?.[field.name]}
              />
            );
          })}
        </div>
      </Section>

      <Section
        title="მეგობრის კოდი"
        hint="მოწვეული ფასდაკლებას პირველ თვეზე იღებს, მომყვანი - შემდეგ განახლებაზე. თითო მოყვანილი მეგობარი = ერთი ფასდაკლებული თვე."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="ფასდაკლება (%)"
            name="referralDiscountPercent"
            type="number"
            required
            min={0}
            max={100}
            step={1}
            defaultValue={defaultValues?.referralDiscountPercent ?? 10}
            hint="0 = მეგობრის კოდი გამორთულია"
            error={state.errors?.referralDiscountPercent}
          />
        </div>
      </Section>

      <Section
        title="ღონისძიების დაჯავშნა (ლარი)"
        hint="ჯამი = სლოტის ფასი + დამსწრეთა საფეხურის დანამატი. წევრის ფასი არასავალდებულოა - შევსებისას გვერდზე ორივე ჩანს და აქტიური აბონემენტის მქონეს წევრის ფასი ერიცხება. რომელი დღეები იყიდება - კალენდრიდან ირთვება."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EVENT_SLOT_FIELDS.map((slot) => (
            <TextField
              key={slot.standard}
              label={slot.label}
              name={slot.standard}
              type="number"
              required
              min={1}
              step={0.01}
              defaultValue={
                defaultValues ? toGel(defaultValues[slot.standard]) : undefined
              }
              error={state.errors?.[slot.standard]}
            />
          ))}
          {EVENT_SLOT_FIELDS.map((slot) => {
            const current = defaultValues?.[slot.member];
            return (
              <TextField
                key={slot.member}
                label={`წევრის ფასი - ${slot.label}`}
                name={slot.member}
                type="number"
                min={1}
                step={0.01}
                defaultValue={current != null ? toGel(current) : ""}
                hint="ცარიელი = წევრის ფასი არ მოქმედებს · მინიმუმ 1 ₾"
                error={state.errors?.[slot.member]}
              />
            );
          })}
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">
            დამსწრეთა საფეხურები (4)
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            თითო საფეხურზე ზღვარი („X ადამიანამდე“) და დანამატის ფასი -
            ზღვრები ზრდადობით.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tierDefaults.map((tier, i) => (
              <div key={i} className="flex flex-col gap-3">
                <TextField
                  label={`საფეხური ${i + 1} - ადამიანამდე`}
                  name={`tierUpTo${i + 1}`}
                  type="number"
                  required
                  min={1}
                  step={1}
                  defaultValue={tier.upTo}
                  error={state.errors?.[`tierUpTo${i + 1}`]}
                />
                <TextField
                  label={`საფეხური ${i + 1} - ფასი (₾)`}
                  name={`tierPrice${i + 1}`}
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  defaultValue={toGel(tier.price)}
                  error={state.errors?.[`tierPrice${i + 1}`]}
                />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="ადგილები და ვადები"
        hint="შესვლის სლოტების რაოდენობა გლობალურია - კონკრეტული დღის გამონაკლისი კალენდრიდან იწერება."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="ადგილი კლუბზე"
            name="clubSeatCapacity"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={defaultValues?.clubSeatCapacity ?? 30}
            error={state.errors?.clubSeatCapacity}
          />
          <TextField
            label="ადგილები 10:00–14:00"
            name="entryCapacityMorning"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={defaultValues?.entryCapacityMorning ?? 15}
            hint="0 = დილის სლოტი საერთოდ არ იყიდება"
            error={state.errors?.entryCapacityMorning}
          />
          <TextField
            label="ადგილები 14:00–18:00"
            name="entryCapacityMidday"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={defaultValues?.entryCapacityMidday ?? 0}
            hint="ძირითადად კლუბების დროა - 0 = არ იყიდება; გახსენი კვირის დღეებით კალენდარში"
            error={state.errors?.entryCapacityMidday}
          />
          <TextField
            label="ადგილები 18:00–22:00"
            name="entryCapacityEvening"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={defaultValues?.entryCapacityEvening ?? 15}
            hint="0 = საღამოს სლოტი საერთოდ არ იყიდება"
            error={state.errors?.entryCapacityEvening}
          />
          <TextField
            label="4-ჯერადი პასის ვადა (დღე)"
            name="fourPackValidityDays"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={defaultValues?.fourPackValidityDays ?? 30}
            error={state.errors?.fourPackValidityDays}
          />
          <TextField
            label="ადგილის შენახვა ვადის გასვლის შემდეგ (დღე)"
            name="renewalGraceDays"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={defaultValues?.renewalGraceDays ?? 5}
            hint="ამ პერიოდში წევრს ადგილი უნარჩუნდება განახლებისთვის"
            error={state.errors?.renewalGraceDays}
          />
          <TextField
            label="გადმორიცხვის ჯავშნის ვადა (საათი)"
            name="transferHoldHours"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={defaultValues?.transferHoldHours ?? 72}
            hint="ამის შემდეგ გადმორიცხვის მოლოდინში ადგილი თავისუფლდება. 0 = უვადოდ"
            error={state.errors?.transferHoldHours}
          />
        </div>
      </Section>

      <Section
        title="SMS-კოდი გადმორიცხვისას (სტუმრებისთვის)"
        hint="ეხება მხოლოდ გადმორიცხვით ყიდვას და მხოლოდ სტუმარს - ანგარიშში შესული მომხმარებელი კოდს არ ითხოვს (მისი მეილი/ნომერი რეგისტრაციისასვე დადასტურდა). ასევე არ ითხოვს ის ნომერი, რომელსაც აქტიური წევრობა/ჯავშანი/პასი აქვს. SMS-ის კონფიგურაციის გარეშე (UBILL) ისედაც არ ითხოვება. ⚠ გამორთვისას სტუმარს შეეძლება ნებისმიერი ნომრით ყიდვა - ეს ადგილს იჭერს და SMS თქვენი ხარჯით იგზავნება."
      >
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            name="otpRequiredForTransfer"
            defaultChecked={defaultValues?.otpRequiredForTransfer ?? true}
            className="size-4 rounded border-line accent-green-dark"
          />
          სტუმრისთვის კოდის მოთხოვნა ჩართულია
        </label>
      </Section>

      <Section
        title="ადგილების საჯარო მთვლელი"
        hint="ჩართულია = საიტზე ჩანს „დარჩა N ადგილი“ კლუბებზე და კურსებზე (ლენდინგებზე თითო კლუბ/კურსის საკუთარი ჩამრთველიც მოქმედებს). გამორთულია = რიცხვები არსად ჩანს, მაგრამ „ადგილები ამოიწურა“ ეტიკეტები მაინც რჩება. ადმინსა და drop-in-ის სლოტებს არ ეხება."
      >
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            name="showPublicSeats"
            defaultChecked={defaultValues?.showPublicSeats ?? false}
            className="size-4 rounded border-line accent-green-dark"
          />
          დარჩენილი ადგილების ჩვენება საიტზე
        </label>
      </Section>

      <Section title="საბანკო რეკვიზიტები">
        <TextAreaField
          label="რეკვიზიტები"
          name="bankRequisites"
          rows={4}
          defaultValue={defaultValues?.bankRequisites ?? ""}
          hint="ჩანს ყიდვის წარმატების ეკრანზე - სად გადარიცხოს მყიდველმა. ცარიელი = „ანგარიშის რეკვიზიტები გამოგზავნილია მეილზე“ შეტყობინება."
          error={state.errors?.bankRequisites}
        />
      </Section>

      {state.status !== "idle" && state.message ? (
        <FormMessage status={state.status}>{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "ინახება…" : "შენახვა"}
      </Button>
    </form>
  );
}
