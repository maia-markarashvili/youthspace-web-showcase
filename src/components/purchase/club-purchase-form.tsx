"use client";

import Link from "next/link";
import { QUIZ_SOURCE } from "@/lib/quiz-attribution";
import { useActionState, useEffect, useRef, useState } from "react";
import { purchaseClub } from "@/app/(site)/clubs/purchase-actions";
import { trackInitiateCheckout } from "@/components/meta-pixel";
import { Button } from "@/components/ui/button";
import { FormMessage, Honeypot, TextField } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";
import { formatGel } from "@/lib/money";
import { effectivePrice, type PricedPair } from "@/lib/pricing";
import type { CabinetProfile } from "@/lib/db/queries/account";
import { CardRedirect } from "./card-redirect";
import {
  ConsentFields,
  initialConsent,
  type ConsentValue,
} from "./consent-fields";
import { OtpStep } from "./otp-step";
import { PayMethodField } from "./pay-method-field";
import { ProfileField } from "./profile-field";
import { initialPurchaseState, type PayTexts } from "./types";

/**
 * კლუბში გაწევრიანების ფორმა — **ერთი კონკრეტული კლუბი** (პაკეტები აღარ
 * არსებობს, სხვა კლუბების მონიშვნაც არა):
 *  · ფასი მხოლოდ ჩვენებისთვისაა — გადასახდელი თანხა სერვერზე ითვლება
 *  · მეგობრის კოდი (არასავალდებულო) — ფასდაკლება ამ ყიდვაზე + კრედიტი მომყვანს
 *  · ყიდვასთან ერთად აქტიურდება ბონუს 4 შესვლა (შესვლის სლოტებში)
 *  · Meta Pixel InitiateCheckout — მხოლოდ რეალურ წარმატებაზე (state.order
 *    არსებობს; honeypot-ის ყალბ success-ს order არ აქვს), useRef-დარაჯით ერთხელ
 */

type ClubOption = {
  id: string;
  /** კლუბის slug — პიქსელის content_ids/content_name */
  slug: string;
  title: string;
  seatsRemaining: number;
  /** ლენდინგი აწვდის „{meetingDay} · {meetingTime}" — არასავალდებულო */
  subtext?: string;
};

const DEFAULT_MICROCOPY = "თვიური გამოწერა · შეჩერება ნებისმიერ დროს";

export function ClubPurchaseForm({
  club,
  pricePair,
  fourPackPriceTetri,
  clubSeatCapacity,
  microcopy = DEFAULT_MICROCOPY,
  cardEnabled = false,
  payTexts,
  profiles = [],
  askAge = false,
  showSeatCount = false,
  quizClub = null,
}: {
  club: ClubOption;
  pricePair: PricedPair;
  /** 4 შესვლის პაკეტის მოქმედი ფასი თეთრებში (pricing_settings) */
  fourPackPriceTetri: number;
  clubSeatCapacity: number;
  /** გლობალური ჩამრთველი (pricing_settings.show_public_seats) — false-ზე
   *  „დარჩა N/M" იმალება; sold-out ხაზი და გათიშული ღილაკი უცვლელი რჩება */
  showSeatCount?: boolean;
  microcopy?: string;
  /** Flitt ჩართულია და ამ გვერდზე ბარათი ჩანს */
  cardEnabled?: boolean;
  payTexts: PayTexts;
  /** შესული მომხმარებლის პროფილები; ცარიელი = სტუმარი (ამომრჩევი არ ჩანს) */
  profiles?: CabinetProfile[];
  /** ადმინის ტოგლი (landing.askAge) — ფორმაში სავალდებულო „ასაკი" ველი ჩანს */
  askAge?: boolean;
  /** ქვიზის რეკომენდებული კლუბი (?src=quiz&club=) — attribution-ში ჩაიწერება */
  quizClub?: string | null;
}) {
  const [state, action, pending] = useActionState(
    purchaseClub,
    initialPurchaseState,
  );
  const [consent, setConsent] = useState<ConsentValue>(initialConsent);

  /* InitiateCheckout ერთხელ — ფასიანი შეკვეთა შეიქმნა (order არსებობს) */
  const checkoutFired = useRef(false);
  const successOrder = state.status === "success" ? state.order : undefined;
  useEffect(() => {
    if (!successOrder || checkoutFired.current) return;
    checkoutFired.current = true;
    trackInitiateCheckout({
      category: "club",
      name: club.slug,
      ids: [club.slug],
      valueTetri: successOrder.amountTetri,
      orderRef: successOrder.orderRef,
      quizClub,
    });
  }, [successOrder, club.slug, quizClub]);

  const soldOut = club.seatsRemaining <= 0;
  const total = effectivePrice(pricePair);

  if (state.status === "success" && state.order) {
    const order = state.order;
    return (
      <div className="flex flex-col gap-4 rounded-card border border-green-mid bg-green-light/30 p-5">
        <div>
          <p className="text-sm font-semibold text-green-dark">
            ჯავშანი მიღებულია
          </p>
          <p className="mt-1 text-lg font-bold text-green-dark">{order.title}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-h3 font-bold text-green-dark">
              {formatGel(order.amountTetri)}
            </span>
            {order.standardTetri !== order.amountTetri ? (
              <span className="text-sm text-ink-muted line-through">
                {formatGel(order.standardTetri)}
              </span>
            ) : null}
            <span className="text-sm text-ink-muted">თვეში</span>
          </div>
          {order.appliedDiscountPercent > 0 ? (
            <p className="mt-1 text-sm font-semibold text-green-dark">
              მეგობრის ფასდაკლება −{order.appliedDiscountPercent}% გააქტიურდა
            </p>
          ) : null}
        </div>

        <div className="rounded-card border border-line bg-white p-4 text-center">
          <p className="eyebrow">შენი კოდი</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-green-dark">
            {order.orderRef}
          </p>
        </div>

        <div className="rounded-card border border-line bg-white p-4">
          <p className="text-sm font-semibold text-green-dark">
            + 4 შესვლა სივრცეში
          </p>
          <p className="mt-1 text-sm leading-6 text-ink">
            წევრობას მოჰყვება 4 შესვლა სივრცის შესვლის სლოტებში - დაჯავშნა
            ამავე კოდით, გადახდის დადასტურების შემდეგ.
          </p>
        </div>

        {order.redirectUrl ? (
          <CardRedirect
            url={order.redirectUrl}
            notice={payTexts.redirectNotice}
            fallbackLabel={payTexts.redirectFallback}
          />
        ) : (
          <div className="rounded-card border border-line bg-white p-4">
            <p className="eyebrow">გადარიცხვის რეკვიზიტები</p>
            {order.bankRequisites ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">
                {order.bankRequisites}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                ანგარიშის რეკვიზიტები გამოგზავნილია მეილზე.
              </p>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              გადარიცხვის შემდეგ ადმინი დაადასტურებს.
            </p>
          </div>
        )}

        <p className="text-sm leading-6 text-ink">
          შეინახე ეს კოდი. წევრობას ნებისმიერ დროს ნახავ{" "}
          <Link
            href="/account"
            className="font-semibold text-green-dark underline"
          >
            შენს ანგარიშში
          </Link>{" "}
          - იმავე ელფოსტით დარეგისტრირდი და კოდის დამახსოვრება აღარ დაგჭირდება.
        </p>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <FormMessage status="success">
        {state.message ?? "მიღებულია!"}
      </FormMessage>
    );
  }

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
      <input type="hidden" name="clubId" value={club.id} />
      {quizClub ? (
        <>
          <input type="hidden" name="src" value={QUIZ_SOURCE} />
          <input type="hidden" name="quizClub" value={quizClub} />
        </>
      ) : null}

      {/* კლუბის ბარათი — რას ყიდულობს */}
      <div className="rounded-card border border-green-dark bg-cream p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold text-ink">{club.title}</span>
            {club.subtext ? (
              <span className="text-sm text-ink-muted">{club.subtext}</span>
            ) : null}
            {soldOut || showSeatCount ? (
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
            ) : null}
          </span>
          <span className="flex shrink-0 items-baseline gap-2">
            {pricePair.sale !== null ? (
              <>
                <span className="text-lg font-bold text-green-dark">
                  {formatGel(pricePair.sale)}
                </span>
                <span className="text-sm text-ink-muted line-through">
                  {formatGel(pricePair.standard)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-green-dark">
                {formatGel(pricePair.standard)}
              </span>
            )}
            <span className="text-sm text-ink-muted">/თვე</span>
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          წევრობაში შედის კვირაში ერთი გარანტირებული კლუბის დღე (14:00–18:00)
          და {formatGel(fourPackPriceTetri)}-იანი 4 შესვლის პაკეტი - ორი პაკეტის
          ფასად, ერთი ფაქტობრივად საჩუქრად.
        </p>
      </div>

      <ProfileField profiles={profiles} />

      <TextField
        label="სახელი"
        name="name"
        required
        autoComplete="name"
        error={state.errors?.name}
      />
      {askAge ? (
        <TextField
          label="ასაკი"
          name="childAge"
          type="number"
          inputMode="numeric"
          min={3}
          max={100}
          required
          error={state.errors?.childAge}
        />
      ) : null}
      <TextField
        label="ტელეფონი"
        name="phone"
        type="tel"
        inputMode="tel"
        required
        autoComplete="tel"
        hint="ჯავშანს ტელეფონით და კოდით იპოვი"
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
      <TextField
        label="მეგობრის კოდი"
        name="referralCode"
        placeholder="CLB-#####"
        hint="არასავალდებულო - თუ წევრმა მოგიწვია, ორივე მიიღებთ ფასდაკლებას"
        error={state.errors?.referralCode}
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
        disabled={pending || soldOut || !consent.terms || !consent.privacy}
        className="w-full"
      >
        {pending
          ? "იგზავნება…"
          : soldOut
            ? "ადგილები ამოიწურა"
            : `გაწევრიანდი - ${formatGel(total)}/თვე`}
      </Button>

      <p className="text-sm text-ink-muted">{microcopy}</p>
    </form>
  );
}
