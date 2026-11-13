"use client";

import { useActionState, useState } from "react";
import { addMember } from "./actions";
import { Button } from "@/components/ui/button";
import { FormMessage, TextField } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";
import { initialFormState } from "@/lib/form-state";
import { formatGel } from "@/lib/money";
import { effectivePrice, type PricedPair } from "@/lib/pricing";

/**
 * წევრის ხელით დამატების ფორმა (admin) — **ერთი კლუბი ერთ ჩანაწერზე**,
 * იგივე წესით, რაც საჯარო ყიდვა. თანხის ველი ცარიელი = სერვერი ტარიფით
 * ითვლის; წარმატებაზე action თვითონ გადამისამართდება /admin/orders-ზე.
 */

type ClubOption = { id: string; title: string; seatsRemaining: number };

export function MemberForm({
  clubs,
  pricePair,
  clubSeatCapacity,
}: {
  clubs: ClubOption[];
  pricePair: PricedPair;
  clubSeatCapacity: number;
}) {
  const [state, action, pending] = useActionState(addMember, initialFormState);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <form
      action={action}
      className="flex max-w-2xl flex-col gap-5 rounded-card border border-line bg-white p-6 shadow-card"
    >
      {selected ? (
        <input type="hidden" name="clubId" value={selected} />
      ) : null}

      <fieldset className="flex flex-col">
        <legend className="text-sm font-semibold text-ink">
          აირჩიე კლუბი <span className="text-green-mid">*</span>
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          {clubs.map((club) => {
            const checked = selected === club.id;
            const soldOut = club.seatsRemaining <= 0;
            return (
              <label
                key={club.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-card border px-4 py-3 transition-colors",
                  checked
                    ? "border-green-dark bg-green-light/20"
                    : "border-line bg-white hover:border-green-mid",
                  soldOut && !checked &&
                    "cursor-not-allowed opacity-60 hover:border-line",
                )}
              >
                <input
                  type="radio"
                  name="clubChoice"
                  className="size-4 accent-green-dark"
                  checked={checked}
                  disabled={soldOut && !checked}
                  onChange={() => setSelected(club.id)}
                />
                <span className="flex-1 text-sm font-semibold text-ink">
                  {club.title}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    soldOut ? "text-red-700" : "text-ink-muted",
                  )}
                >
                  {soldOut
                    ? "ადგილები ამოიწურა"
                    : `დარჩა ${club.seatsRemaining}/${clubSeatCapacity}`}
                </span>
              </label>
            );
          })}
        </div>
        {state.errors?.clubId ? (
          <p className="mt-2 text-xs font-semibold text-red-700">
            {state.errors.clubId}
          </p>
        ) : null}
      </fieldset>

      {selected ? (
        <p className="text-sm text-ink-muted">
          ავტომატური ტარიფი:{" "}
          <span className="font-bold text-green-dark">
            {formatGel(effectivePrice(pricePair))}
          </span>{" "}
          თვეში · წევრს ბონუსად 4 შესვლა ერგება
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="ელფოსტა"
          name="email"
          type="email"
          hint="არასავალდებულო"
          error={state.errors?.email}
        />
        <TextField
          label="თანხა (ლარი)"
          name="amountGel"
          type="number"
          min={0}
          step="0.01"
          hint="ცარიელი = ავტომატური ტარიფით"
          error={state.errors?.amountGel}
        />
      </div>

      <TextField
        label="მეგობრის კოდი"
        name="referralCode"
        placeholder="CLB-#####"
        hint="არასავალდებულო - თუ წევრმა მოიყვანა, ფასდაკლება აქაც მოქმედებს"
        error={state.errors?.referralCode}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink">სტატუსი</legend>
        <label className="mt-1 flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input
            type="radio"
            name="status"
            value="active"
            defaultChecked
            className="size-4 accent-green-dark"
          />
          აქტიური - გადახდილია
        </label>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
          <input
            type="radio"
            name="status"
            value="pending"
            className="size-4 accent-green-dark"
          />
          გადახდის მოლოდინში
        </label>
        {state.errors?.status ? (
          <p className="text-xs font-semibold text-red-700">
            {state.errors.status}
          </p>
        ) : null}
      </fieldset>

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" disabled={pending || !selected} className="w-fit">
        {pending ? "ინახება…" : "წევრის დამატება"}
      </Button>
    </form>
  );
}
