"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  FormMessage,
  Honeypot,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import { cn } from "@/lib/cn";
import type { CabinetProfile } from "@/lib/db/queries/account";
import { formatGel } from "@/lib/money";
import type { EventPeopleTier } from "@/lib/pricing";
import { bookingDateLabelKa } from "@/lib/calendar";
import { trackInitiateCheckout } from "@/components/meta-pixel";
import type { EntrySlotKey } from "@/lib/slots";
import { DateSlotPicker, type SlotChoice } from "@/components/date-slot-picker";
import { bookEventSlot } from "./booking-actions";
import { initialEventBookingState, type EventBookingState } from "./types";

/**
 * ღონისძიების ჯავშნის ფორმა — (დღე, სლოტი) + ხალხის საფეხური + გადახდა.
 * ფასები მხოლოდ ჩვენებისთვისაა (ცოცხალი ჯამის ჩათვლით) — გადასახდელი
 * თანხა სერვერზე ითვლება (bookEventSlot). წევრის ფასი აქ არ ჩანს:
 * წევრობა სერვერზე ნომრით მოწმდება და ჯამი იქ მცირდება.
 */

/** ერთი ასარჩევი (დღე, სლოტი) წყვილი თავისი ფასით */
export type EventSlot = {
  date: string;
  /** „12 აგვ, სამ" */
  dateLabel: string;
  slot: EntrySlotKey;
  /** „10:00–14:00" */
  slotLabel: string;
  /** სლოტის სტანდარტული ფასი თეთრებში (ცოცხალი ჯამისთვის) */
  priceTetri: number;
};

/** ფორმისა და წარმატების ეკრანის ყველა ტექსტი — ადმინიდან (registry/spaces.ts) */
export type EventFormTexts = {
  slotLegend: string;
  tierLegend: string;
  /** „{n} ადამიანამდე" */
  tierRow: string;
  nameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  noteLabel: string;
  noteHint: string;
  totalLabel: string;
  submit: string;
  pending: string;
  successTitle: string;
  successCodeLabel: string;
  successAmountLabel: string;
  successRequisitesEmpty: string;
  successTransferNote: string;
  successSaveCode: string;
  successAccountLink: string;
};


function tierLabel(template: string, upTo: number): string {
  return template.replace("{n}", String(upTo));
}

/* ── ხალხის საფეხურის ამომრჩევი ───────────────────────────────── */

function TierPicker({
  tiers,
  legend,
  rowTemplate,
  value,
  onChange,
  error,
}: {
  tiers: EventPeopleTier[];
  legend: string;
  rowTemplate: string;
  value: number;
  onChange: (upTo: number) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-semibold text-ink">
        {legend} <span className="text-green-mid">*</span>
      </legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {tiers.map((tier) => {
          const selected = value === tier.upTo;
          return (
            <button
              key={tier.upTo}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(tier.upTo)}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col items-center rounded-card border px-3 py-1.5 text-center transition-colors",
                selected
                  ? "border-green-dark bg-green-dark text-white"
                  : "border-line bg-white text-ink hover:border-green-mid",
              )}
            >
              <span className="text-sm font-semibold">
                {tierLabel(rowTemplate, tier.upTo)}
              </span>
              <span
                className={cn(
                  "text-xs",
                  selected ? "text-white/80" : "text-ink-muted",
                )}
              >
                {tier.price > 0 ? `+${formatGel(tier.price)}` : formatGel(0)}
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </fieldset>
  );
}

/* ── წარმატების ბარათი — კოდი, თანხა, რეკვიზიტები/redirect ────── */

function EventSuccess({
  state,
  payTexts,
  texts,
}: {
  state: EventBookingState;
  payTexts: PayTexts;
  texts: EventFormTexts;
}) {
  const order = state.order;

  /* Meta Pixel InitiateCheckout — სივრცის (ღონისძიების) ფასიანი ჯავშანი, ერთხელ */
  const pixelFired = useRef(false);
  useEffect(() => {
    if (!order || pixelFired.current) return;
    pixelFired.current = true;
    trackInitiateCheckout({
      category: "event",
      name: "event-space",
      ids: ["event-space"],
      valueTetri: order.amountTetri,
      orderRef: order.orderRef,
    });
  }, [order]);

  if (!order) {
    return (
      <FormMessage status="success">
        {state.message ?? texts.successTitle}
      </FormMessage>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-green-mid bg-green-light/20 p-5">
      <div>
        <p className="text-h3 font-bold text-green-dark">
          {texts.successTitle}
        </p>
        <p className="mt-1 text-sm text-ink">
          {order.title}
          {order.bookingDate ? ` · ${bookingDateLabelKa(order.bookingDate)}` : ""}
        </p>
      </div>

      <div className="rounded-card border border-dashed border-green-mid bg-white px-4 py-3 text-center">
        <p className="text-xs text-ink-muted">{texts.successCodeLabel}</p>
        <p className="text-h2 font-bold tracking-wider text-green-dark">
          {order.orderRef}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink">
          {texts.successAmountLabel}{" "}
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
                {texts.successRequisitesEmpty}
              </p>
            )}
            <p className="text-xs text-ink-muted">
              {texts.successTransferNote}
            </p>
          </>
        )}
      </div>

      {state.message ? (
        <p className="text-sm font-semibold text-green-dark">{state.message}</p>
      ) : null}

      <p className="text-xs text-ink-muted">
        {texts.successSaveCode}{" "}
        <Link href="/account" className="font-semibold underline">
          {texts.successAccountLink}
        </Link>
      </p>
    </div>
  );
}

/* ── მთავარი ფორმა ────────────────────────────────────────────── */

export function EventBookingForm({
  slots,
  tiers,
  texts,
  cardEnabled = false,
  payTexts,
  profiles = [],
}: {
  slots: EventSlot[];
  tiers: EventPeopleTier[];
  texts: EventFormTexts;
  /** Flitt ჩართულია და ამ გვერდზე ბარათი ჩანს */
  cardEnabled?: boolean;
  payTexts: PayTexts;
  /** შესული მომხმარებლის პროფილები; ცარიელი = სტუმარი (ამომრჩევი არ ჩანს) */
  profiles?: CabinetProfile[];
}) {
  const [state, action, pending] = useActionState(
    bookEventSlot,
    initialEventBookingState,
  );
  const [choice, setChoice] = useState<SlotChoice>(null);
  const [tierUpTo, setTierUpTo] = useState<number>(tiers[0]?.upTo ?? 0);
  const [consent, setConsent] = useState<ConsentValue>(initialConsent);

  if (state.status === "success")
    return <EventSuccess state={state} payTexts={payTexts} texts={texts} />;

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

  const selectedSlot = choice
    ? slots.find((s) => s.date === choice.date && s.slot === choice.slot)
    : undefined;
  const selectedTier = tiers.find((tier) => tier.upTo === tierUpTo);
  const total =
    selectedSlot && selectedTier
      ? selectedSlot.priceTetri + selectedTier.price
      : null;

  return (
    <form action={action} className="relative flex flex-col gap-4">
      <Honeypot />
      {choice ? (
        <>
          <input type="hidden" name="date" value={choice.date} />
          <input type="hidden" name="slot" value={choice.slot} />
        </>
      ) : null}
      <input type="hidden" name="peopleUpTo" value={tierUpTo} />

      <DateSlotPicker
        legend={texts.slotLegend}
        options={slots}
        value={choice}
        onChange={setChoice}
        error={state.errors?.date ?? state.errors?.slot}
        renderDetail={(option, selected) => (
          <span
            className={cn("text-xs", selected ? "text-white/80" : "text-ink-muted")}
          >
            {formatGel(option.priceTetri)}
          </span>
        )}
      />

      {/* ხალხის საფეხური თავიდანვე ჩანს — დანამატის ფასი თარიღის არჩევამდეც ხილულია */}
      <TierPicker
        tiers={tiers}
        legend={texts.tierLegend}
        rowTemplate={texts.tierRow}
        value={tierUpTo}
        onChange={setTierUpTo}
        error={state.errors?.peopleUpTo}
      />

      {/* ცოცხალი ჯამი — საბოლოო თანხა სერვერზე ითვლება (წევრს შეიძლება შეუმცირდეს) */}
      {total !== null ? (
        <p className="rounded-card border border-line bg-white px-4 py-3 text-sm text-ink">
          {texts.totalLabel}:{" "}
          <span className="text-h3 font-bold text-green-dark">
            {formatGel(total)}
          </span>
        </p>
      ) : null}

      <ProfileField profiles={profiles} />
      <TextField
        label={texts.nameLabel}
        name="name"
        required
        autoComplete="name"
        error={state.errors?.name}
      />
      <TextField
        label={texts.phoneLabel}
        name="phone"
        type="tel"
        required
        autoComplete="tel"
        error={state.errors?.phone}
      />
      <TextField
        label={texts.emailLabel}
        name="email"
        type="email"
        required
        autoComplete="email"
        error={state.errors?.email}
      />
      <TextAreaField
        label={texts.noteLabel}
        name="note"
        rows={2}
        hint={texts.noteHint}
        error={state.errors?.note}
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
        {pending ? texts.pending : choice ? texts.submit : texts.slotLegend}
      </Button>
    </form>
  );
}
