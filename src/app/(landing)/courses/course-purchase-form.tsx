"use client";

import Link from "next/link";
import { QUIZ_SOURCE } from "@/lib/quiz-attribution";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { AccordionItem } from "@/components/landing/accordion";
import {
  trackCompleteRegistration,
  trackInitiateCheckout,
} from "@/components/meta-pixel";
import { CardRedirect } from "@/components/purchase/card-redirect";
import {
  ConsentFields,
  initialConsent,
  type ConsentValue,
} from "@/components/purchase/consent-fields";
import { OtpStep } from "@/components/purchase/otp-step";
import { PayMethodField } from "@/components/purchase/pay-method-field";
import {
  PayPlanField,
  type PayPlanTexts,
} from "@/components/purchase/pay-plan-field";
import { ProfileField } from "@/components/purchase/profile-field";
import type { PayTexts } from "@/components/purchase/types";
import { Button } from "@/components/ui/button";
import { FormMessage, Honeypot, TextField } from "@/components/ui/form-field";
import type { CabinetProfile } from "@/lib/db/queries/account";
import { formatGel } from "@/lib/money";
import {
  defaultCoursePayPlan,
  type CoursePayPlan,
  type CoursePaymentPlans,
} from "@/lib/pricing";
import { checkCoursePrice } from "./price-actions";
import { purchaseCourse } from "./purchase-actions";
import { initialCoursePurchaseState, type PriceCheckResult } from "./types";

/** წევრის ფასების ცხრილის რიგი — გვერდი სერვერზე ითვლის და prop-ით აწვდის */
export type MemberPriceRow = {
  label: string;
  priceTetri: number;
  percent: number;
  /** განვადებიან კურსზე — იმავე განაკვეთით დათვლილი თვიური ფასი; null = განვადება არ აქვს */
  monthlyPerMonthTetri: number | null;
};

/**
 * კურსის ყიდვის ფორმა (ლენდინგი) — გადახდა offline-ია: წარმატებაზე ადგილი
 * უკვე დაჯავშნილია (pending) და ეკრანზე ჩანს კოდი, თანხა და რეკვიზიტები.
 * ფასდაკლება ტელეფონის ნომრით სერვერზე ითვლება — კლიენტი ფასს არ აგზავნის.
 * ღილაკის ფასი: checker-ის წარმატებამდე ბაზისური, მერე — პერსონალური.
 */
export function CoursePurchaseForm({
  courseId,
  courseSlug,
  basePlans,
  planTexts,
  firstMonthLabel,
  planSuccessNote,
  memberRows,
  memberAccordionTitle,
  crossSell,
  fieldsMicrocopy,
  trustLine,
  cardEnabled = false,
  payTexts,
  profiles = [],
  askAge = false,
  quizClub = null,
}: {
  courseId: string;
  /** კურსის slug — პიქსელის content_ids/content_name */
  courseSlug: string;
  /** ორივე გადახდის ვარიანტი ფასდაკლების გარეშე (სერვერზე დათვლილი) */
  basePlans: CoursePaymentPlans;
  planTexts: PayPlanTexts;
  /** „პირველი თვე“ წარწერა — ღილაკზე და წარმატების ეკრანზე */
  firstMonthLabel: string;
  /** მინაწერი წარმატების ეკრანზე — დარჩენილი თვეების შესახებ */
  planSuccessNote: string;
  memberRows: MemberPriceRow[];
  memberAccordionTitle: string;
  crossSell: string;
  fieldsMicrocopy: string;
  trustLine: string;
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
    purchaseCourse,
    initialCoursePurchaseState,
  );
  const [consent, setConsent] = useState<ConsentValue>(initialConsent);
  /* გადახდის ვარიანტი — განვადებიან კურსზე დეფოლტად „თვიურად“ */
  const [payPlan, setPayPlan] = useState<CoursePayPlan>(
    defaultCoursePayPlan(basePlans),
  );
  /* „შეამოწმე შენი ფასი“ — ყიდვამდე, ნომრით; ფასი სერვერზე ითვლება */
  const [priceCheck, setPriceCheck] = useState<PriceCheckResult | null>(null);
  const [checking, startCheck] = useTransition();

  /* Meta Pixel — მხოლოდ რეალურ წარმატებაზე (state.order არსებობს;
     honeypot-ის ყალბ success-ს order არ აქვს), ზუსტად ერთხელ.
     ფასიანი → InitiateCheckout; 0₾ (ღია კარის ტიპი/100% ფასდაკლება) →
     CompleteRegistration, value-ს გარეშე (მფლობელის სპეციფიკაცია) */
  const pixelFired = useRef(false);
  useEffect(() => {
    if (state.status !== "success" || !state.order || pixelFired.current) {
      return;
    }
    pixelFired.current = true;
    const order = state.order;
    if (order.amountTetri === 0) {
      trackCompleteRegistration({
        category: "event",
        name: courseSlug,
        ids: [courseSlug],
        orderRef: order.orderRef,
        quizClub,
      });
    } else {
      trackInitiateCheckout({
        category: "event",
        name: courseSlug,
        ids: [courseSlug],
        valueTetri: order.amountTetri,
        orderRef: order.orderRef,
        quizClub,
      });
    }
  }, [state, courseSlug, quizClub]);

  /* „შეამოწმე შენი ფასი“ ორივე ვარიანტს ერთდროულად აახლებს — რადიოებს,
     ჯამის ხაზს და ღილაკს; სანამ არ შემოწმებულა, ბაზისური ფასები დგას */
  const plans = priceCheck?.status === "ok" ? priceCheck.plans : basePlans;
  const monthlyPlan = plans.monthly;
  /* გადასახდელი ახლა: თვიურზე — პირველი თვე, სხვაგან — სრული ფასი */
  const currentPriceTetri =
    payPlan === "monthly" && monthlyPlan
      ? monthlyPlan.perMonthTetri
      : plans.full.totalTetri;
  /* უფასო ღონისძიება — ფასი/გადახდა UI-ში საერთოდ არ ჩანს („უფასოც" კი არა,
     მფლობელის წესით: აქცენტი საჯაროდ არ კეთდება) */
  const isFree = basePlans.full.totalTetri === 0;

  if (state.status === "success" && state.order) {
    const order = state.order;
    const paid = order.amountTetri > 0;
    return (
      <div className="flex flex-col gap-3">
        <FormMessage status="success">
          ადგილი დაჯავშნილია - „{order.title}“
        </FormMessage>

        {paid ? (
          <div className="rounded-card border border-line bg-white p-4">
            <p className="eyebrow">
              {order.planMonths ? firstMonthLabel : "გადასახდელი თანხა"}
            </p>
            {order.discountPercent > 0 ? (
              <p className="mt-2 text-sm leading-7 text-ink">
                სტანდარტული{" "}
                <span className="text-ink-muted line-through">
                  {formatGel(order.standardTetri)}
                </span>{" "}
                → შენი ფასი{" "}
                <span className="text-lg font-bold text-green-dark">
                  {formatGel(order.amountTetri)}
                </span>{" "}
                <span className="font-semibold text-green-mid">
                  (−{order.discountPercent}%)
                </span>
              </p>
            ) : (
              <p className="mt-2 text-lg font-bold text-green-dark">
                {formatGel(order.amountTetri)}
              </p>
            )}
            {order.planMonths ? (
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                სულ {order.planMonths} თვე
                {order.planTotalTetri
                  ? ` · ${formatGel(order.planTotalTetri)}`
                  : ""}{" "}
                · {planSuccessNote}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-card border border-line bg-white p-4 text-center">
          <p className="eyebrow">შენი კოდი</p>
          <p className="mt-1 text-h2 font-bold tracking-wide text-green-dark">
            {order.orderRef}
          </p>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            შეინახე ეს კოდი. ჯავშანს ნებისმიერ დროს ნახავ{" "}
            <Link href="/account" className="font-semibold underline">
              შენს ანგარიშში
            </Link>{" "}
            - იმავე ელფოსტით დარეგისტრირდი და კოდის დამახსოვრება აღარ დაგჭირდება.
          </p>
        </div>

        {order.redirectUrl ? (
          <CardRedirect
            url={order.redirectUrl}
            notice={payTexts.redirectNotice}
            fallbackLabel={payTexts.redirectFallback}
          />
        ) : paid ? (
          <div className="rounded-card border border-line bg-white p-4">
            <p className="eyebrow">გადარიცხვის რეკვიზიტები</p>
            {order.bankRequisites ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                {order.bankRequisites}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                ანგარიშის რეკვიზიტები გამოგზავნილია მეილზე.
              </p>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              გადარიცხვის შემდეგ ადმინი დაადასტურებს ჯავშანს.
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-line bg-white p-4">
            <p className="text-sm leading-6 text-ink">
              რეგისტრაცია დადასტურებულია. დეტალები SMS-ით და მეილით მიიღებ.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (state.status === "success") {
    return <FormMessage status="success">მიღებულია.</FormMessage>;
  }

  if (state.status === "otp" && state.otp) {
    return (
      <form action={action} className="relative flex flex-col gap-3">
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
    <form action={action} className="relative flex flex-col gap-3">
      <Honeypot />
      <input type="hidden" name="courseId" value={courseId} />
      {quizClub ? (
        <>
          <input type="hidden" name="src" value={QUIZ_SOURCE} />
          <input type="hidden" name="quizClub" value={quizClub} />
        </>
      ) : null}

      {/* წევრის ფასები + checker — დახურული აკორდეონი */}
      {memberRows.length > 0 ? (
        <AccordionItem title={memberAccordionTitle}>
          <ul className="flex flex-col gap-1 text-sm text-ink-muted">
            {memberRows.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-4"
              >
                <span>{row.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="font-semibold text-green-dark">
                    {row.monthlyPerMonthTetri
                      ? `${formatGel(row.monthlyPerMonthTetri)} / თვე`
                      : formatGel(row.priceTetri)}
                  </span>
                  {row.monthlyPerMonthTetri ? (
                    <span className="text-xs">
                      {planTexts.full} {formatGel(row.priceTetri)}
                    </span>
                  ) : null}
                  <span className="text-xs">−{row.percent}%</span>
                </span>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            disabled={checking}
            onClick={(event) => {
              const phoneInput = event.currentTarget.form?.elements.namedItem(
                "phone",
              ) as HTMLInputElement | null;
              const phone = phoneInput?.value.trim() ?? "";
              if (phone.length < 5) {
                setPriceCheck({
                  status: "error",
                  message: "ჯერ ჩაწერე ნომერი ქვემოთ, ტელეფონის ველში",
                });
                return;
              }
              startCheck(async () => {
                setPriceCheck(await checkCoursePrice(courseId, phone));
              });
            }}
          >
            {checking ? "მოწმდება…" : "შეამოწმე შენი ფასი"}
          </Button>

          {priceCheck ? (
            priceCheck.status === "ok" ? (
              priceCheck.clubCount > 0 ? (
                <div className="mt-3 rounded-card border border-green-mid bg-green-light/20 p-4">
                  <p className="text-lg font-bold text-green-dark">
                    შენი ფასი:{" "}
                    {priceCheck.plans.monthly
                      ? `${formatGel(priceCheck.plans.monthly.perMonthTetri)} / თვე`
                      : formatGel(priceCheck.amountTetri)}
                  </p>
                  {priceCheck.plans.monthly ? (
                    <p className="mt-1 text-sm text-ink">
                      {planTexts.full} {formatGel(priceCheck.amountTetri)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-ink">
                    {priceCheck.clubCount} აქტიური კლუბი · −
                    {priceCheck.discountPercent}%
                  </p>
                  {priceCheck.standardTetri !== priceCheck.amountTetri ? (
                    <p className="mt-1 text-sm text-ink-muted">
                      სტანდარტული{" "}
                      <span className="line-through">
                        {formatGel(priceCheck.standardTetri)}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 rounded-card bg-cream/60 p-4 text-sm leading-6 text-ink">
                  ამ ნომრით აქტიური კლუბი ვერ მოიძებნა - სტანდარტული ფასი{" "}
                  {formatGel(priceCheck.standardTetri)}. ფასდაკლებისთვის ჯერ
                  კლუბს შეუერთდი.
                </div>
              )
            ) : (
              <p className="mt-3 text-sm text-red-700">{priceCheck.message}</p>
            )
          ) : null}
        </AccordionItem>
      ) : null}

      {/* cross-sell ჰინტი არაწევრებისთვის */}
      {crossSell ? (
        <div className="rounded-card border border-green-mid/40 bg-green-light/20 p-4 text-sm leading-6 text-ink">
          {crossSell}
        </div>
      ) : null}

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

      {/* ჯერ „რამდენი/რამდენ ხანს“, მერე „რითი“ */}
      {isFree ? null : (
        <PayPlanField
          plans={plans}
          value={payPlan}
          onChange={setPayPlan}
          texts={planTexts}
        />
      )}

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

      <p className="text-xs text-ink-muted">{fieldsMicrocopy}</p>

      {state.errors?.courseId ? (
        <FormMessage status="error">{state.errors.courseId}</FormMessage>
      ) : null}
      {state.status === "error" && state.message ? (
        <FormMessage status="error">{state.message}</FormMessage>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending || !consent.terms || !consent.privacy}
        className="w-full"
      >
        {pending
          ? "იგზავნება…"
          : isFree
            ? "დარეგისტრირდი"
            : payPlan === "monthly" && monthlyPlan
              ? `დაჯავშნე - ${formatGel(currentPriceTetri)} (${firstMonthLabel})`
              : `დაჯავშნე - ${formatGel(currentPriceTetri)}`}
      </Button>

      <p className="text-center text-xs text-ink-muted">{trustLine}</p>
    </form>
  );
}
