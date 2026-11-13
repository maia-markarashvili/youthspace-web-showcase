"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { FormMessage, Honeypot, TextField } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";
import type { CabinetProfile } from "@/lib/db/queries/account";
import { formatGel } from "@/lib/money";
import { effectivePrice } from "@/lib/pricing";
import { bookingDateLabelKa } from "@/lib/calendar";
import { trackInitiateCheckout } from "@/components/meta-pixel";
import type { EntrySlotKey } from "@/lib/slots";
import { DateSlotPicker, type SlotChoice } from "@/components/date-slot-picker";
import {
  bookWithPass,
  purchaseFourPack,
  purchaseSingleEntry,
} from "./entry-actions";
import { CardRedirect } from "@/components/purchase/card-redirect";
import {
  ConsentFields,
  initialConsent,
  type ConsentValue,
} from "@/components/purchase/consent-fields";
import { OtpStep } from "@/components/purchase/otp-step";
import { PayMethodField } from "@/components/purchase/pay-method-field";
import { ProfileField } from "@/components/purchase/profile-field";
import type { PayTexts } from "@/components/purchase/types";
import { initialEntryState, type EntryState } from "./types";

/**
 * Drop-in ყიდვის სამი ტაბი: ერთჯერადი / 4 შესვლის პაკეტი / პასით ჯავშნა.
 * შესვლა = 4-საათიანი სლოტი (10:00–14:00 / 14:00–18:00 / 18:00–22:00); არჩევანი —
 * (დღე, სლოტი) წყვილი. ფასები მხოლოდ ჩვენებისთვისაა — გადასახდელი თანხა
 * სერვერზე ითვლება.
 */

type PricePair = { standard: number; sale: number | null };

/** ერთი ასარჩევი (დღე, სლოტი) წყვილი — გვერდი აწვდის მხოლოდ თავისუფლებს */
export type SlotOption = {
  date: string;
  /** „12 აგვ, სამ" */
  dateLabel: string;
  slot: EntrySlotKey;
  /** „10:00–14:00" */
  slotLabel: string;
  remaining: number;
  capacity: number;
};

export type Tab = "single" | "pack" | "pass";

export function EntryForms({
  slots,
  singlePrice,
  fourPackPrice,
  fourPackValidityDays,
  cardEnabled = false,
  payTexts,
  passNote,
  profiles = [],
  initialTab,
  passCode,
}: {
  slots: SlotOption[];
  singlePrice: PricePair;
  fourPackPrice: PricePair;
  /** პასის მოქმედების ვადა დღეებში (pricing_settings.four_pack_validity_days) */
  fourPackValidityDays: number;
  /** Flitt ჩართულია და ამ გვერდზე ბარათი ჩანს */
  cardEnabled?: boolean;
  payTexts: PayTexts;
  /** „მაქვს აბონემენტი" ტაბის განმარტება (site-texts: dropin.pass.note) */
  passNote: string;
  /** შესული მომხმარებლის პროფილები; ცარიელი = სტუმარი (ამომრჩევი არ ჩანს) */
  profiles?: CabinetProfile[];
  /** ?tab= query-დან — კაბინეტის deep-link პირდაპირ პასის ტაბზე */
  initialTab?: Tab;
  /** ?code= query-დან — პასის კოდის წინასწარი შევსება (ვალიდირებული) */
  passCode?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? "single");

  const tabs: Array<{ id: Tab; label: string }> = [
    {
      id: "single",
      label: `ერთჯერადი - ${formatGel(effectivePrice(singlePrice))}`,
    },
    {
      id: "pack",
      label: `4 შესვლა - ${formatGel(effectivePrice(fourPackPrice))}`,
    },
    { id: "pass", label: "მაქვს აბონემენტი" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? "cursor-pointer rounded-pill border border-green-dark bg-green-dark px-4 py-2 text-sm font-semibold text-white"
                : "cursor-pointer rounded-pill border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-green-mid"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "single" ? (
        <SingleEntryForm
          slots={slots}
          price={singlePrice}
          cardEnabled={cardEnabled}
          payTexts={payTexts}
          profiles={profiles}
        />
      ) : null}
      {tab === "pack" ? (
        <FourPackForm
          price={fourPackPrice}
          validityDays={fourPackValidityDays}
          cardEnabled={cardEnabled}
          payTexts={payTexts}
          profiles={profiles}
        />
      ) : null}
      {tab === "pass" ? (
        <PassBookingForm
          slots={slots}
          payTexts={payTexts}
          note={passNote}
          defaultCode={passCode}
        />
      ) : null}
    </div>
  );
}

/* ── ფასის ჩვენება: აქციისას სტანდარტული გადახაზული + სააქციო ── */

function PriceRow({ pair, note }: { pair: PricePair; note?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        {pair.sale !== null ? (
          <>
            <span className="text-sm text-ink-muted line-through">
              {formatGel(pair.standard)}
            </span>
            <span className="text-h3 font-bold text-green-dark">
              {formatGel(pair.sale)}
            </span>
            <Badge tone="accent">აქცია</Badge>
          </>
        ) : (
          <span className="text-h3 font-bold text-green-dark">
            {formatGel(pair.standard)}
          </span>
        )}
      </div>
      {note ? <p className="text-xs text-ink-muted">{note}</p> : null}
    </div>
  );
}

/** არჩეული წყვილი → ორი hidden ველი (date + slot) */
function SlotInputs({ choice }: { choice: SlotChoice }) {
  if (!choice) return null;
  return (
    <>
      <input type="hidden" name="date" value={choice.date} />
      <input type="hidden" name="slot" value={choice.slot} />
    </>
  );
}

/* ── წარმატების ბარათი — კოდი, თანხა, რეკვიზიტები, კაბინეტის ბმული ── */

function EntrySuccess({
  state,
  payTexts,
}: {
  state: EntryState;
  payTexts: PayTexts;
}) {
  const order = state.order;

  /* Meta Pixel InitiateCheckout — ფასიანი შეკვეთა (ერთჯერადი PSS / ოთხჯერადი
     CWK) ერთხელ; პასით ჯავშანი (0₾) განზრახ არაფერს ისვრის */
  const pixelFired = useRef(false);
  useEffect(() => {
    if (!order || order.amountTetri === 0 || pixelFired.current) return;
    pixelFired.current = true;
    const id = order.orderRef.startsWith("CWK")
      ? "drop-in-4pack"
      : "drop-in-single";
    trackInitiateCheckout({
      category: "drop-in",
      name: id,
      ids: [id],
      valueTetri: order.amountTetri,
      orderRef: order.orderRef,
    });
  }, [order]);

  if (!order) {
    return (
      <FormMessage status="success">{state.message ?? "მიღებულია!"}</FormMessage>
    );
  }

  const paid = order.amountTetri > 0;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-green-mid bg-green-light/20 p-5">
      <div>
        <p className="text-h3 font-bold text-green-dark">
          {paid ? "შეკვეთა მიღებულია!" : "ჯავშანი დადასტურდა!"}
        </p>
        <p className="mt-1 text-sm text-ink">
          {order.title}
          {order.bookingDate ? ` · ${bookingDateLabelKa(order.bookingDate)}` : ""}
        </p>
      </div>

      <div className="rounded-card border border-dashed border-green-mid bg-white px-4 py-3 text-center">
        <p className="text-xs text-ink-muted">შენი კოდი</p>
        <p className="text-h2 font-bold tracking-wider text-green-dark">
          {order.orderRef}
        </p>
      </div>

      {paid ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink">
            გადასახდელი:{" "}
            <span className="font-bold text-green-dark">
              {formatGel(order.amountTetri)}
            </span>
          </p>
          {order.redirectUrl ? (
            <CardRedirect
              url={order.redirectUrl}
              notice={payTexts.redirectNotice}
              fallbackLabel={payTexts.redirectFallback}
            />
          ) : (
            <>
              {order.bankRequisites ? (
                <div className="whitespace-pre-line rounded-card bg-white px-4 py-3 text-sm text-ink">
                  {order.bankRequisites}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  ანგარიშის რეკვიზიტები გამოგზავნილია მეილზე.
                </p>
              )}
              <p className="text-xs text-ink-muted">
                გადარიცხვის შემდეგ ადმინი დაადასტურებს შეკვეთას.
              </p>
            </>
          )}
        </div>
      ) : null}

      {state.message ? (
        <p className="text-sm font-semibold text-green-dark">{state.message}</p>
      ) : null}

      <p className="text-xs text-ink-muted">
        შეინახე ეს კოდი. ჯავშანს ნებისმიერ დროს ნახავ{" "}
        <Link href="/account" className="font-semibold underline">
          შენს ანგარიშში
        </Link>{" "}
        - იმავე ელფოსტით დარეგისტრირდი და კოდის დამახსოვრება აღარ დაგჭირდება.
      </p>
    </div>
  );
}

/* ── ტაბი 1: ერთჯერადი შესვლა ─────────────────────────────────── */

function SingleEntryForm({
  slots,
  price,
  cardEnabled,
  payTexts,
  profiles = [],
}: {
  slots: SlotOption[];
  price: PricePair;
  cardEnabled: boolean;
  payTexts: PayTexts;
  /** შესული მომხმარებლის პროფილები; ცარიელი = სტუმარი (ამომრჩევი არ ჩანს) */
  profiles?: CabinetProfile[];
}) {
  const [state, action, pending] = useActionState(
    purchaseSingleEntry,
    initialEntryState,
  );
  const [choice, setChoice] = useState<SlotChoice>(null);
  const [consent, setConsent] = useState<ConsentValue>(initialConsent);

  if (state.status === "success")
    return <EntrySuccess state={state} payTexts={payTexts} />;

  if (state.status === "otp" && state.otp) {
    return (
      <form action={action} className="relative flex flex-col gap-4">
        <Honeypot />
        <OtpStep
          otp={state.otp}
          pending={pending}
          error={state.errors?.otpCode}
          message={state.status === "otp" ? state.message : undefined}
          onEdit={() => window.location.reload()}
        />
      </form>
    );
  }

  return (
    <form action={action} className="relative flex flex-col gap-4">
      <Honeypot />
      <SlotInputs choice={choice} />
      <PriceRow
        pair={price}
        note="4-საათიანი შესვლა - სამუშაო ადგილი და საერთო ზონა"
      />
      <DateSlotPicker
        legend="აირჩიე დღე და დრო"
        options={slots}
        value={choice}
        onChange={setChoice}
        error={state.errors?.date ?? state.errors?.slot}
        renderDetail={(option, selected) => (
          <span
            className={cn("text-xs", selected ? "text-white/80" : "text-ink-muted")}
          >
            {`დარჩა ${option.remaining}/${option.capacity}`}
          </span>
        )}
      />
      <ProfileField profiles={profiles} />
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

      <PayMethodField
        cardEnabled={cardEnabled}
        label={payTexts.methodLabel}
        cardLabel={payTexts.methodCard}
        transferLabel={payTexts.methodTransfer}
      />

      <ConsentFields
        texts={payTexts}
        value={consent}
        onChange={setConsent}
        errors={{
          agreeTerms: state.errors?.agreeTerms,
          agreePrivacy: state.errors?.agreePrivacy,
        }}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending || !choice || !consent.terms || !consent.privacy}
        className="w-full"
      >
        {pending
          ? "იგზავნება…"
          : choice
            ? "დაჯავშნე შესვლა"
            : "აირჩიე დღე და დრო"}
      </Button>
    </form>
  );
}

/* ── ტაბი 2: 4 შესვლის პაკეტი ─────────────────────────────────── */

function FourPackForm({
  price,
  validityDays,
  cardEnabled,
  payTexts,
  profiles = [],
}: {
  price: PricePair;
  validityDays: number;
  cardEnabled: boolean;
  payTexts: PayTexts;
  /** შესული მომხმარებლის პროფილები; ცარიელი = სტუმარი (ამომრჩევი არ ჩანს) */
  profiles?: CabinetProfile[];
}) {
  const [state, action, pending] = useActionState(
    purchaseFourPack,
    initialEntryState,
  );
  const [consent, setConsent] = useState<ConsentValue>(initialConsent);

  if (state.status === "success")
    return <EntrySuccess state={state} payTexts={payTexts} />;

  if (state.status === "otp" && state.otp) {
    return (
      <form action={action} className="relative flex flex-col gap-4">
        <Honeypot />
        <OtpStep
          otp={state.otp}
          pending={pending}
          error={state.errors?.otpCode}
          message={state.status === "otp" ? state.message : undefined}
          onEdit={() => window.location.reload()}
        />
      </form>
    );
  }

  return (
    <form action={action} className="relative flex flex-col gap-4">
      <Honeypot />
      <PriceRow pair={price} note={`მოქმედებს ყიდვიდან ${validityDays} დღე`} />
      <ProfileField profiles={profiles} />
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

      <PayMethodField
        cardEnabled={cardEnabled}
        label={payTexts.methodLabel}
        cardLabel={payTexts.methodCard}
        transferLabel={payTexts.methodTransfer}
      />

      <ConsentFields
        texts={payTexts}
        value={consent}
        onChange={setConsent}
        errors={{
          agreeTerms: state.errors?.agreeTerms,
          agreePrivacy: state.errors?.agreePrivacy,
        }}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending || !consent.terms || !consent.privacy}
        className="w-full"
      >
        {pending ? "იგზავნება…" : "იყიდე პაკეტი"}
      </Button>
    </form>
  );
}

/* ── ტაბი 3: პასით დაჯავშნა ───────────────────────────────────── */

function PassBookingForm({
  slots,
  payTexts,
  note,
  defaultCode,
}: {
  slots: SlotOption[];
  payTexts: PayTexts;
  /** ტაბის განმარტება — ადმინიდან იცვლება (dropin.pass.note) */
  note: string;
  /** კაბინეტიდან მოსული პასის კოდი — ველი წინასწარ ივსება */
  defaultCode?: string;
}) {
  const [state, action, pending] = useActionState(
    bookWithPass,
    initialEntryState,
  );
  const [choice, setChoice] = useState<SlotChoice>(null);

  if (state.status === "success")
    return <EntrySuccess state={state} payTexts={payTexts} />;

  return (
    <form action={action} className="relative flex flex-col gap-4">
      <Honeypot />
      <SlotInputs choice={choice} />
      <p className="text-xs text-ink-muted">{note}</p>
      <TextField
        label="ტელეფონი"
        name="phone"
        type="tel"
        required
        autoComplete="tel"
        error={state.errors?.phone}
      />
      <TextField
        label="კოდი"
        name="code"
        required
        placeholder="CWK-#####"
        defaultValue={defaultCode}
        hint="კოდი პაკეტის ან კლუბის ყიდვისას მიიღე"
        error={state.errors?.code}
      />
      <DateSlotPicker
        legend="აირჩიე დღე და დრო"
        options={slots}
        value={choice}
        onChange={setChoice}
        error={state.errors?.date ?? state.errors?.slot}
        renderDetail={(option, selected) => (
          <span
            className={cn("text-xs", selected ? "text-white/80" : "text-ink-muted")}
          >
            {`დარჩა ${option.remaining}/${option.capacity}`}
          </span>
        )}
      />

      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending || !choice}
        className="w-full"
      >
        {pending
          ? "იგზავნება…"
          : choice
            ? "დაჯავშნე პასით"
            : "აირჩიე დღე და დრო"}
      </Button>
    </form>
  );
}
