import Link from "next/link";
import type { ReactNode } from "react";
import { desc, inArray } from "drizzle-orm";
import {
  cancelBooking,
  cancelExpiredHolds,
  cancelPass,
  cancelSubscription,
  confirmBooking,
  confirmPass,
  confirmSubscription,
  deleteBooking,
  deletePass,
  deleteSubscription,
} from "./actions";
import { DeleteOrderForm } from "./delete-order-form";
import {
  InstallmentMonthForm,
  InstallmentReminderForm,
} from "./installment-forms";
import { RenewForm } from "./renew-form";
import { ResendCodeForm } from "./resend-code-form";
import { ReserveForm } from "./reserve-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { AdminTable, EmptyRow, PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { quizClubFromAttribution } from "@/lib/quiz-attribution";
import { db } from "@/lib/db";
import { reconcileRecentPaidCardPayments } from "@/lib/db/mutations/flitt-outcome";
import { availableCreditsBySubscription } from "@/lib/db/mutations/referral";
import {
  getPricingSettings,
  passEntriesUsed,
} from "@/lib/db/queries/availability";
import {
  bookings,
  clubs,
  courses,
  entryPasses,
  payments,
  spaces,
  subscriptions,
} from "@/lib/db/schema";
import { formatGel } from "@/lib/money";
import {
  applyPercentDiscount,
  clubMonthlyPrice,
  effectivePrice,
  floorToWholeGel,
} from "@/lib/pricing";
import { slotByStartTime } from "@/lib/slots";
import {
  formatDateKa,
  graceEndDate,
  subscriptionPhase,
} from "@/lib/subscription-rules";

export const dynamic = "force-dynamic";

/**
 * შეკვეთების CRM — ოფლაინ გადახდები სამი ტიპის მიხედვით:
 * კლუბ-გამოწერები (club/vip) · ჯავშნები (dropin/course) · 4-ჯერადი პასები.
 * იდენტიფიკატორი = კოდი (CLB/CRS/CWK/PSS/SPC-#####; ძველი SIV-) + ტელეფონი.
 */

const TABS = [
  { key: "subs", label: "კლუბ-შეკვეთები" },
  { key: "bookings", label: "ჯავშნები" },
  { key: "passes", label: "პასები" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ── საერთო პრეზენტაცია ───────────────────────────────────────── */

type Tone = "yellow" | "green" | "gray" | "red";

const TONE_CLASSES: Record<Tone, string> = {
  yellow: "bg-amber-100 text-amber-800",
  green: "bg-green-light/40 text-green-dark",
  gray: "bg-line text-ink-muted",
  red: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "გადახდის მოლოდინში", tone: "yellow" },
  active: { label: "აქტიური", tone: "green" },
  confirmed: { label: "დადასტურებული", tone: "green" },
  cancelled: { label: "გაუქმებული", tone: "gray" },
  expired: { label: "ვადაგასული", tone: "gray" },
  refunded: { label: "დაბრუნებული", tone: "gray" },
};

/** გაუქმებულზე აქტორიც ჩანს — მომხმარებლის კაბინეტიდან vs ადმინიდან */
const CANCELLED_BY_LABELS: Record<string, string> = {
  customer: "მომხმ.",
  admin: "ადმინი",
  system: "სისტემა",
};

function StatusBadge({
  status,
  cancelledBy,
}: {
  status: string;
  cancelledBy?: string | null;
}) {
  const meta = STATUS_LABELS[status] ?? { label: status, tone: "gray" as Tone };
  const actor =
    status === "cancelled" && cancelledBy
      ? (CANCELLED_BY_LABELS[cancelledBy] ?? cancelledBy)
      : null;
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        status === "cancelled" && cancelledBy === "customer"
          ? "bg-amber-100 text-amber-900"
          : TONE_CLASSES[meta.tone],
      )}
    >
      {meta.label}
      {actor ? ` · ${actor}` : ""}
    </span>
  );
}

/** ბარათით გადახდის ნიშანი — გადმორიცხვის შეკვეთაზე არაფერი ჩანს */
function PaymentBadge({
  payment,
}: {
  payment?: { status: string; rawResponse: Record<string, unknown> | null };
}) {
  if (!payment) return null;

  const meta =
    payment.status === "paid"
      ? { tone: "green" as Tone, label: "ბარათით გადახდილი" }
      : payment.status === "failed"
        ? { tone: "gray" as Tone, label: "ბარათი: ვერ შედგა" }
        : payment.status === "refunded"
          ? { tone: "gray" as Tone, label: "ბარათი: დაბრუნებული" }
          : { tone: "yellow" as Tone, label: "ბარათი: მოლოდინში" };

  const card =
    typeof payment.rawResponse?.masked_card === "string"
      ? payment.rawResponse.masked_card
      : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "rounded-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
          TONE_CLASSES[meta.tone],
        )}
      >
        {meta.label}
      </span>
      {card ? (
        <span className="font-mono text-xs text-ink-muted">{card}</span>
      ) : null}
    </span>
  );
}

/** მიტოვებული ბარათის checkout — ადგილი უკვე გათავისუფლდა.
 *  მიმდინარე დრო გარედან მოდის: რენდერში Date.now()-ის კითხვა React-ის
 *  სისუფთავის წესს არღვევს (react-hooks/purity). */
function ExpiredHoldNote({
  holdExpiresAt,
  now,
}: {
  holdExpiresAt: Date | null;
  now: number;
}) {
  if (!holdExpiresAt || holdExpiresAt.getTime() > now) return null;
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES.gray,
      )}
    >
      ჯავშნის ვადა ამოიწურა - ადგილი გათავისუფლდა
    </span>
  );
}

/** ადმინმა ხელით დაუკავა ადგილი გადახდის გარეშე (§1.5) — status pending რჩება */
function ReservedBadge({
  reservedAt,
  reservedNote,
}: {
  reservedAt: Date | null;
  reservedNote: string | null;
}) {
  if (!reservedAt) return null;
  return (
    <span
      title={reservedNote ?? undefined}
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES.yellow,
      )}
    >
      დაკავებულია, გადაუხდელი
    </span>
  );
}

/** ცხრილის ტაბს შესაბამისი /admin/export/[kind] მარშრუტი */
const EXPORT_KIND: Record<"subscription" | "booking" | "pass", string> = {
  subscription: "subscriptions",
  booking: "bookings",
  pass: "passes",
};

const exportLinkClass =
  "min-h-8 rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-muted hover:border-green-mid";

/** ტაბის შესაძლო რეალური სტატუსები (§2.2) - ფილტრის pill-ებისთვის */
const TAB_STATUSES: Record<TabKey, string[]> = {
  subs: ["pending", "active", "cancelled"],
  bookings: ["pending", "confirmed", "cancelled", "refunded"],
  passes: ["pending", "active", "expired", "cancelled"],
};

const pillClass = (active: boolean) =>
  cn(
    "min-h-8 rounded-pill border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
    active
      ? "border-green-dark bg-green-dark text-white"
      : "border-line bg-white text-ink-muted hover:border-green-mid",
  );

/** სტატუს-ფილტრის pill-ები + ძებნის ველი (§2.2) - ორივე ცალკე ტაბზეა scoped */
function StatusFilterBar({
  tab,
  status,
  q,
  filter,
}: {
  tab: TabKey;
  status?: string;
  q?: string;
  filter?: string;
}) {
  const baseParams = new URLSearchParams({ tab });
  if (filter) baseParams.set("filter", filter);

  const linkFor = (statusValue?: string) => {
    const params = new URLSearchParams(baseParams);
    if (statusValue) params.set("status", statusValue);
    return `/admin/orders?${params.toString()}`;
  };

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1.5">
        <Link href={linkFor()} className={pillClass(!status)}>
          ყველა
        </Link>
        {TAB_STATUSES[tab].map((s) => (
          <Link key={s} href={linkFor(s)} className={pillClass(status === s)}>
            {STATUS_LABELS[s]?.label ?? s}
          </Link>
        ))}
      </div>
      <form action="/admin/orders" className="flex items-center gap-1.5">
        <input type="hidden" name="tab" value={tab} />
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="ძებნა: სახელი, ტელეფონი, კოდი…"
          className="min-h-8 w-52 rounded-pill border border-line bg-white px-3 py-1 text-xs text-ink placeholder:text-ink-muted/60 focus:border-green-mid"
        />
        <button type="submit" className={exportLinkClass}>
          ძებნა
        </button>
      </form>
    </div>
  );
}

/** ტაბის ცხრილს ზემოთ: ფილტრი, Excel-ის ჩამოტვირთვა, ვადაგასულების გაუქმება */
function TabToolbar({
  tab,
  kind,
  filter,
}: {
  tab: TabKey;
  kind: "subscription" | "booking" | "pass";
  filter?: string;
}) {
  const isFiltered = filter === "reserved";
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={isFiltered ? `/admin/orders?tab=${tab}` : `/admin/orders?tab=${tab}&filter=reserved`}
          className={cn(
            "min-h-8 rounded-pill border px-3 py-1 text-xs font-semibold transition-colors",
            isFiltered
              ? "border-green-dark bg-green-dark text-white"
              : "border-line bg-white text-ink-muted hover:border-green-mid",
          )}
        >
          {isFiltered ? "✓ მხოლოდ დაკავებულები" : "მხოლოდ დაკავებულები"}
        </Link>
        {/* Route Handler-ია (ფაილის ჩამოტვირთვა), არა გვერდი - Link-ის
            client-router-ული გადასვლა ჩამოტვირთვას გაფუჭებდა */}
        <a href={`/admin/export/${EXPORT_KIND[kind]}`} className={exportLinkClass}>
          Excel-ში ჩამოტვირთვა
        </a>
        {kind === "subscription" ? (
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/admin/export/subscriptions?filter=expiring"
            className={exportLinkClass}
          >
            ვადა ეწურება (Excel)
          </a>
        ) : null}
        {/* კურსის განვადების „გადასახდელია" სია - კლუბის „ვადა ეწურება"-ს
            ანალოგი, ოღონდ გვერდზევე: აქედან იგზავნება შეხსენებები */}
        {kind === "booking" ? (
          <Link
            href={
              filter === "due"
                ? `/admin/orders?tab=${tab}`
                : `/admin/orders?tab=${tab}&filter=due`
            }
            className={cn(
              "min-h-8 rounded-pill border px-3 py-1 text-xs font-semibold transition-colors",
              filter === "due"
                ? "border-green-dark bg-green-dark text-white"
                : "border-line bg-white text-ink-muted hover:border-green-mid",
            )}
          >
            {filter === "due"
              ? "✓ განვადება - გადასახდელია"
              : "განვადება - გადასახდელია"}
          </Link>
        ) : null}
      </div>
      <form action={cancelExpiredHolds.bind(null, kind)}>
        <ConfirmSubmit
          confirmText="ყველა ვადაგასული ჰოლდი (მიტოვებული checkout) გაუქმდეს?"
          className="text-ink-muted hover:bg-cream hover:text-red-700"
        >
          ვადაგასულების გაუქმება
        </ConfirmSubmit>
      </form>
    </div>
  );
}

/**
 * აქტიური კლუბ-გამოწერის ფაზა grace-ფანჯრით (ვადიანი ჩანაწერებისთვის):
 * active → მწვანე ვადით · grace → ყვითელი (ადგილი ჯერ შენახულია) ·
 * expired → ნაცრისფერი (ადგილი გათავისუფლდა, სტატუსი კი active რჩება).
 */
function ActivePhaseBadge({
  periodEnd,
  graceDays,
}: {
  periodEnd: Date;
  graceDays: number;
}) {
  const phase = subscriptionPhase(periodEnd, graceDays);
  const meta =
    phase === "active"
      ? {
          tone: "green" as Tone,
          label: `აქტიური - ${formatDateKa(periodEnd)}-მდე`,
        }
      : phase === "grace"
        ? {
            tone: "yellow" as Tone,
            label: `გრეისი - ადგილი შენახულია ${formatDateKa(graceEndDate(periodEnd, graceDays))}-მდე`,
          }
        : { tone: "gray" as Tone, label: "ვადაგასული" };

  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[meta.tone],
      )}
    >
      {meta.label}
    </span>
  );
}

/**
 * კურსის განვადების ბეჯი: გადახდილი თვეები + მორიგი ვადა.
 * ვადაგადაცილებული წითლდება, მაგრამ **ავტომატურად არაფერი უქმდება** -
 * ადგილი მყიდველისაა და გადაწყვეტილება ადმინზეა (მფლობელის წესი).
 */
function InstallmentBadge({
  monthsPaid,
  planMonths,
  nextDueAt,
  now,
}: {
  monthsPaid: number;
  planMonths: number;
  nextDueAt: Date | null;
  now: number;
}) {
  const done = monthsPaid >= planMonths;
  const overdue = !done && nextDueAt !== null && nextDueAt.getTime() < now;
  const counter = `${monthsPaid}/${planMonths}`;
  const meta = done
    ? { tone: "green" as Tone, label: `განვადება დახურულია ${counter}` }
    : overdue && nextDueAt
      ? {
          tone: "red" as Tone,
          label: `გადასახდელია ${formatDateKa(nextDueAt)}-იდან · ${counter}`,
        }
      : {
          tone: "yellow" as Tone,
          label: nextDueAt
            ? `გადახდილია ${counter} · შემდეგი ${formatDateKa(nextDueAt)}`
            : `გადახდილია ${counter}`,
        };

  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[meta.tone],
      )}
    >
      {meta.label}
    </span>
  );
}

function ConfirmButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-green-dark hover:bg-green-light/30"
    >
      {children}
    </button>
  );
}

/** attribution jsonb → „ქვიზი: <კლუბი>" ლეიბლი (slug → სათაური; უცნობზე slug) */
function quizLabel(
  titleBySlug: Map<string, string>,
  attribution: unknown,
): string | null {
  const slug = quizClubFromAttribution(attribution);
  return slug ? (titleBySlug.get(slug) ?? slug) : null;
}

function BuyerCell({
  name,
  phone,
  age,
  quizClub,
}: {
  name: string;
  phone: string;
  /** მონაწილის ასაკი (childAge) — მხოლოდ askAge-იანი ფორმებიდან ივსება */
  age?: number | null;
  /** ქვიზმა რომელი კლუბი ურჩია — ღია კარზე პერსონალმა იცოდეს, რაზე ილაპარაკოს */
  quizClub?: string | null;
}) {
  return (
    <td className="px-4 py-3">
      <p className="font-medium text-ink">{name}</p>
      <p className="text-xs whitespace-nowrap text-ink-muted">{phone}</p>
      {age != null ? (
        <p className="text-xs whitespace-nowrap text-ink-muted">ასაკი: {age}</p>
      ) : null}
      {quizClub ? (
        <p className="text-xs font-semibold whitespace-nowrap text-green-dark">
          ქვიზი: {quizClub}
        </p>
      ) : null}
    </td>
  );
}

/** უახლესი გადახდა თითო order_ref-ზე (თითო მოთხოვნაზე მხოლოდ ერთი ტაბი იხატება) */
async function latestPaymentByRef() {
  const rows = await db
    .select({
      orderRef: payments.orderRef,
      status: payments.status,
      rawResponse: payments.rawResponse,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .orderBy(desc(payments.createdAt));

  const map = new Map<
    string,
    { status: string; rawResponse: Record<string, unknown> | null }
  >();
  for (const row of rows) {
    if (!map.has(row.orderRef)) {
      map.set(row.orderRef, {
        status: row.status,
        rawResponse: row.rawResponse,
      });
    }
  }
  /* დროსაც აქ ვკითხულობთ — რენდერში Date.now() react-hooks/purity-ს არღვევს */
  return { map, now: Date.now() };
}

/* ── ტაბი 1: კლუბ-გამოწერები ──────────────────────────────────── */

async function SubscriptionsTab({
  filter,
  status,
  q,
}: {
  filter?: string;
  status?: string;
  q?: string;
}) {
  const [allRows, clubRows, settings, payment] = await Promise.all([
    db
      .select()
      .from(subscriptions)
      .where(inArray(subscriptions.planType, ["club", "vip"]))
      .orderBy(desc(subscriptions.createdAt)),
    db.select({ id: clubs.id, slug: clubs.slug, title: clubs.title }).from(clubs),
    getPricingSettings(),
    latestPaymentByRef(),
  ]);
  let rows = allRows;
  if (filter === "reserved") rows = rows.filter((row) => row.reservedAt !== null);
  if (status) rows = rows.filter((row) => row.status === status);
  if (q) {
    const needle = q.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.subscriberName.toLowerCase().includes(needle) ||
        row.subscriberPhone.includes(needle) ||
        row.subscriberEmail.toLowerCase().includes(needle) ||
        (row.orderRef ?? "").toLowerCase().includes(needle),
    );
  }
  const { map: paymentByRef, now } = payment;
  const clubTitles = new Map(clubRows.map((club) => [club.id, club.title]));
  const clubTitleBySlug = new Map(
    clubRows.map((club) => [club.slug, club.title]),
  );

  /* ხელმისაწვდომი რეფერალური კრედიტები — განახლების ღილაკზე ფასდაკლებული
     თანხა ფულის აღებამდე უნდა ჩანდეს */
  const credits = await availableCreditsBySubscription(
    db,
    rows.map((sub) => sub.id),
  );
  const baseTetri = effectivePrice(clubMonthlyPrice(settings));

  return (
    <>
      <StatusFilterBar tab="subs" status={status} q={q} filter={filter} />
      <TabToolbar tab="subs" kind="subscription" filter={filter} />
      <AdminTable
        head={[
          "კოდი",
          "თარიღი",
          "მყიდველი",
          "კლუბი",
          "თანხა",
          "სტატუსი",
          "მოქმედება",
        ]}
      >
      {rows.length === 0 ? (
        <EmptyRow
          colSpan={7}
          text={
            status || q || filter
              ? "დამთხვევა ვერ მოიძებნა"
              : "კლუბ-შეკვეთები ჯერ არ არის"
          }
        />
      ) : (
        rows.map((sub) => {
          const titles = (sub.clubIds ?? [])
            .map((clubId) => clubTitles.get(clubId))
            .filter(Boolean)
            .join(", ");
          const credit = credits.get(sub.id);
          const renewalLabel = credit
            ? `+1 თვე - ${formatGel(
                floorToWholeGel(
                  applyPercentDiscount(baseTetri, credit.oldestPercent),
                ),
              )} (ბონუსი −${credit.oldestPercent}%)`
            : undefined;
          return (
            <tr key={sub.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-medium whitespace-nowrap text-ink">
                {sub.orderRef ?? "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {sub.createdAt.toLocaleDateString("ka-GE")}
              </td>
              <BuyerCell
                name={sub.subscriberName}
                phone={sub.subscriberPhone}
                age={sub.childAge}
                quizClub={quizLabel(clubTitleBySlug, sub.attribution)}
              />
              <td className="px-4 py-3">
                <p className="font-medium whitespace-nowrap text-ink">
                  {/* ისტორიულ რიგებს რამდენიმე კლუბი აქვთ — რაოდენობა ზუსტია */}
                  {`${sub.clubIds?.length ?? 0} კლუბი`}
                </p>
                {titles ? (
                  <p className="text-xs text-ink-muted">{titles}</p>
                ) : null}
                {sub.referredByCode ? (
                  <p className="text-xs font-semibold text-green-dark">
                    მოწვეული: {sub.referredByCode}
                  </p>
                ) : null}
                {credit ? (
                  <p className="text-xs font-semibold text-green-dark">
                    ბონუსი: {credit.count} ფასდაკლებული თვე
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink">
                {formatGel(sub.amountGel)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {sub.status === "active" && sub.currentPeriodEnd ? (
                    <ActivePhaseBadge
                      periodEnd={sub.currentPeriodEnd}
                      graceDays={settings.renewalGraceDays}
                    />
                  ) : (
                    <StatusBadge
                      status={sub.status}
                      cancelledBy={sub.cancelledBy}
                    />
                  )}
                  <PaymentBadge
                    payment={paymentByRef.get(sub.orderRef ?? "")}
                  />
                  {sub.status === "pending" ? (
                    <ExpiredHoldNote holdExpiresAt={sub.holdExpiresAt} now={now} />
                  ) : null}
                  <ReservedBadge
                    reservedAt={sub.reservedAt}
                    reservedNote={sub.reservedNote}
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {sub.status === "pending" ? (
                    <form action={confirmSubscription.bind(null, sub.id)}>
                      <ConfirmButton>დაადასტურე გადახდა</ConfirmButton>
                    </form>
                  ) : null}
                  {sub.status === "pending" && !sub.reservedAt ? (
                    <ReserveForm kind="subscription" id={sub.id} />
                  ) : null}
                  {sub.status === "active" ? (
                    <RenewForm
                      subscriptionId={sub.id}
                      renewalLabel={renewalLabel}
                    />
                  ) : null}
                  {sub.status === "pending" || sub.status === "active" ? (
                    <form action={cancelSubscription.bind(null, sub.id)}>
                      <ConfirmSubmit>გაუქმება</ConfirmSubmit>
                    </form>
                  ) : null}
                  <DeleteOrderForm id={sub.id} action={deleteSubscription} />
                  {sub.orderRef ? (
                    <ResendCodeForm kind="subscription" id={sub.id} />
                  ) : null}
                </div>
              </td>
            </tr>
          );
        })
      )}
      </AdminTable>
    </>
  );
}

/* ── ტაბი 2: ჯავშნები (dropin / course) ───────────────────────── */

async function BookingsTab({
  filter,
  status,
  q,
}: {
  filter?: string;
  status?: string;
  q?: string;
}) {
  const [allRows, courseRows, spaceRows, clubRows, payment] = await Promise.all([
    db
      .select()
      .from(bookings)
      .where(inArray(bookings.itemType, ["dropin", "course", "space"]))
      .orderBy(desc(bookings.createdAt)),
    db.select({ id: courses.id, title: courses.title }).from(courses),
    db.select({ id: spaces.id, title: spaces.title }).from(spaces),
    db.select({ slug: clubs.slug, title: clubs.title }).from(clubs),
    latestPaymentByRef(),
  ]);
  let rows = allRows;
  if (filter === "reserved") rows = rows.filter((row) => row.reservedAt !== null);
  /* განვადება, სადაც მორიგი თვე 3 დღეში ან უკვე გადასახდელია — ზუსტად ის
     სია, საიდანაც ადმინი შეხსენებებს აგზავნის */
  if (filter === "due") {
    const soon = payment.now + 3 * 24 * 60 * 60 * 1000;
    rows = rows.filter(
      (row) =>
        row.planMonths !== null &&
        row.status === "confirmed" &&
        row.monthsPaid < row.planMonths &&
        row.planNextDueAt !== null &&
        row.planNextDueAt.getTime() <= soon,
    );
  }
  if (status) rows = rows.filter((row) => row.status === status);
  if (q) {
    const needle = q.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.buyerName.toLowerCase().includes(needle) ||
        row.buyerPhone.includes(needle) ||
        row.buyerEmail.toLowerCase().includes(needle) ||
        row.orderRef.toLowerCase().includes(needle),
    );
  }
  const { map: paymentByRef, now } = payment;
  const courseTitles = new Map(
    courseRows.map((course) => [course.id, course.title]),
  );
  const spaceTitles = new Map(
    spaceRows.map((space) => [space.id, space.title]),
  );
  const clubTitleBySlug = new Map(
    clubRows.map((club) => [club.slug, club.title]),
  );

  return (
    <>
      <StatusFilterBar tab="bookings" status={status} q={q} filter={filter} />
      <TabToolbar tab="bookings" kind="booking" filter={filter} />
      <AdminTable
        head={[
          "კოდი",
          "ტიპი",
          "თარიღი",
          "მყიდველი",
          "თანხა",
          "პასი",
          "სტატუსი",
          "მოქმედება",
        ]}
      >
      {rows.length === 0 ? (
        <EmptyRow
          colSpan={8}
          text={
            status || q || filter
              ? "დამთხვევა ვერ მოიძებნა"
              : "ჯავშნები ჯერ არ არის"
          }
        />
      ) : (
        rows.map((booking) => {
          const courseTitle =
            booking.itemType === "course" && booking.itemId
              ? courseTitles.get(booking.itemId)
              : null;
          const spaceTitle =
            booking.itemType === "space" && booking.spaceId
              ? spaceTitles.get(booking.spaceId)
              : null;
          const slotLabel = slotByStartTime(booking.startTime)?.label;
          const typeLabel =
            booking.itemType === "course"
              ? "კურსი"
              : booking.itemType === "space"
                ? "სივრცე"
                : "ერთჯერადი";
          return (
            <tr key={booking.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-medium whitespace-nowrap text-ink">
                {booking.orderRef}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium whitespace-nowrap text-ink">
                  {typeLabel}
                </p>
                {courseTitle ? (
                  <p className="text-xs text-ink-muted">{courseTitle}</p>
                ) : null}
                {spaceTitle ? (
                  <p className="text-xs text-ink-muted">
                    {spaceTitle}
                    {slotLabel ? ` · ${slotLabel}` : ""}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {booking.bookingDate}
              </td>
              <BuyerCell
                name={booking.buyerName}
                phone={booking.buyerPhone}
                age={booking.childAge}
                quizClub={quizLabel(clubTitleBySlug, booking.attribution)}
              />
              <td className="px-4 py-3 whitespace-nowrap text-ink">
                {/* მხოლოდ კურსზე: 0-იანი drop-in (პასით) და სივრცე „უფასო" არაა */}
                {booking.itemType === "course" && booking.amountGel === 0
                  ? "უფასო"
                  : formatGel(booking.amountGel)}
                {booking.planMonths ? (
                  <span className="block text-xs text-ink-muted">
                    / თვე · სულ {booking.planMonths} თვე
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {booking.passId ? "პასით" : ""}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge
                    status={booking.status}
                    cancelledBy={booking.cancelledBy}
                  />
                  <PaymentBadge payment={paymentByRef.get(booking.orderRef)} />
                  {booking.status === "pending" ? (
                    <ExpiredHoldNote holdExpiresAt={booking.holdExpiresAt} now={now} />
                  ) : null}
                  <ReservedBadge
                    reservedAt={booking.reservedAt}
                    reservedNote={booking.reservedNote}
                  />
                  {booking.planMonths && booking.status === "confirmed" ? (
                    <InstallmentBadge
                      monthsPaid={booking.monthsPaid}
                      planMonths={booking.planMonths}
                      nextDueAt={booking.planNextDueAt}
                      now={now}
                    />
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {booking.status === "pending" ? (
                    <form action={confirmBooking.bind(null, booking.id)}>
                      <ConfirmButton>დაადასტურე</ConfirmButton>
                    </form>
                  ) : null}
                  {booking.status === "pending" && !booking.reservedAt ? (
                    <ReserveForm kind="booking" id={booking.id} />
                  ) : null}
                  {booking.status === "pending" ||
                  booking.status === "confirmed" ? (
                    <form action={cancelBooking.bind(null, booking.id)}>
                      <ConfirmSubmit>გაუქმება</ConfirmSubmit>
                    </form>
                  ) : null}
                  {booking.planMonths && booking.status === "confirmed" ? (
                    <>
                      <InstallmentMonthForm
                        bookingId={booking.id}
                        monthsPaid={booking.monthsPaid}
                        planMonths={booking.planMonths}
                      />
                      {booking.monthsPaid < booking.planMonths ? (
                        <InstallmentReminderForm bookingId={booking.id} />
                      ) : null}
                    </>
                  ) : null}
                  <DeleteOrderForm id={booking.id} action={deleteBooking} />
                  <ResendCodeForm kind="booking" id={booking.id} />
                </div>
              </td>
            </tr>
          );
        })
      )}
      </AdminTable>
    </>
  );
}

/* ── ტაბი 3: 4-ჯერადი პასები ──────────────────────────────────── */

async function PassesTab({
  filter,
  status,
  q,
}: {
  filter?: string;
  status?: string;
  q?: string;
}) {
  const [allRows, payment] = await Promise.all([
    db.select().from(entryPasses).orderBy(desc(entryPasses.createdAt)),
    latestPaymentByRef(),
  ]);
  let rows = allRows;
  if (filter === "reserved") rows = rows.filter((row) => row.reservedAt !== null);
  if (status) rows = rows.filter((row) => row.status === status);
  if (q) {
    const needle = q.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.buyerName.toLowerCase().includes(needle) ||
        row.buyerPhone.includes(needle) ||
        (row.buyerEmail ?? "").toLowerCase().includes(needle) ||
        row.orderRef.toLowerCase().includes(needle),
    );
  }
  const { map: paymentByRef, now } = payment;
  const usedCounts = await Promise.all(
    rows.map((pass) => passEntriesUsed(pass.id)),
  );

  return (
    <>
      <StatusFilterBar tab="passes" status={status} q={q} filter={filter} />
      <TabToolbar tab="passes" kind="pass" filter={filter} />
      <AdminTable
        head={[
          "კოდი",
          "მყიდველი",
          "თანხა",
          "გამოყენებული",
          "ვადა",
          "სტატუსი",
          "მოქმედება",
        ]}
      >
      {rows.length === 0 ? (
        <EmptyRow
          colSpan={7}
          text={
            status || q || filter
              ? "დამთხვევა ვერ მოიძებნა"
              : "პასები ჯერ არ არის"
          }
        />
      ) : (
        rows.map((pass, index) => {
          /* კლუბის ბონუს-პასი გამოწერასთან ერთად იმართება (confirm/cancel
             კასკადურად მოდის) — აქ მხოლოდ საინფორმაციოდ ჩანს */
          const isBonus = pass.subscriptionId !== null;
          return (
            <tr key={pass.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-medium whitespace-nowrap text-ink">
                {pass.orderRef}
              </td>
              <BuyerCell name={pass.buyerName} phone={pass.buyerPhone} />
              <td className="px-4 py-3 whitespace-nowrap text-ink">
                {isBonus ? "კლუბის ბონუსი" : formatGel(pass.amountGel)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink">
                {`${usedCounts[index]}/${pass.entriesTotal}`}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {pass.expiresAt.toLocaleDateString("ka-GE")}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge
                    status={pass.status}
                    cancelledBy={pass.cancelledBy}
                  />
                  <PaymentBadge payment={paymentByRef.get(pass.orderRef)} />
                  {pass.status === "pending" ? (
                    <ExpiredHoldNote holdExpiresAt={pass.holdExpiresAt} now={now} />
                  ) : null}
                  <ReservedBadge
                    reservedAt={pass.reservedAt}
                    reservedNote={pass.reservedNote}
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {isBonus ? (
                    <span className="px-2 text-xs text-ink-muted">
                      იმართება კლუბ-შეკვეთიდან
                    </span>
                  ) : (
                    <>
                      {pass.status === "pending" ? (
                        <form action={confirmPass.bind(null, pass.id)}>
                          <ConfirmButton>დაადასტურე</ConfirmButton>
                        </form>
                      ) : null}
                      {pass.status === "pending" && !pass.reservedAt ? (
                        <ReserveForm kind="pass" id={pass.id} />
                      ) : null}
                      {pass.status === "pending" ||
                      pass.status === "active" ? (
                        <form action={cancelPass.bind(null, pass.id)}>
                          <ConfirmSubmit>გაუქმება</ConfirmSubmit>
                        </form>
                      ) : null}
                      <DeleteOrderForm id={pass.id} action={deletePass} />
                      <ResendCodeForm kind="pass" id={pass.id} />
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })
      )}
      </AdminTable>
    </>
  );
}

/* ── გვერდი ───────────────────────────────────────────────────── */

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    filter?: string | string[];
    status?: string | string[];
    q?: string | string[];
  }>;
}) {
  await verifyOwner();

  /* Flitt-პორტალიდან დაბრუნებების ჩუმი სინქრონი (callback-ის გარეშეც) —
     fire-and-forget + შიდა throttle 5 წთ; შედეგი შემდეგ განახლებაზე ჩანს */
  void reconcileRecentPaidCardPayments();

  const { tab, filter, status, q } = await searchParams;
  const rawTab = Array.isArray(tab) ? tab[0] : tab;
  const activeTab: TabKey =
    rawTab === "bookings" || rawTab === "passes" ? rawTab : "subs";
  const rawFilter = Array.isArray(filter) ? filter[0] : filter;
  const activeFilter = rawFilter === "reserved" ? "reserved" : undefined;
  const rawStatus = Array.isArray(status) ? status[0] : status;
  const activeStatus =
    rawStatus && TAB_STATUSES[activeTab].includes(rawStatus)
      ? rawStatus
      : undefined;
  const rawQ = Array.isArray(q) ? q[0] : q;
  const activeQ = rawQ?.trim() || undefined;

  return (
    <>
      <PageHeader
        title="შეკვეთები"
        description="ოფლაინ გადახდები - გადარიცხვის შემდეგ დაადასტურე; გაუქმება ადგილს ავტომატურად ათავისუფლებს."
        action={{ href: "/admin/orders/new", label: "+ წევრის დამატება" }}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/orders?tab=${item.key}`}
            className={cn(
              "min-h-10 rounded-pill px-4 py-2 text-sm font-semibold transition-colors",
              item.key === activeTab
                ? "bg-green-dark text-white"
                : "border border-line bg-white text-ink hover:bg-cream",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {activeTab === "subs" ? (
        <SubscriptionsTab filter={activeFilter} status={activeStatus} q={activeQ} />
      ) : null}
      {activeTab === "bookings" ? (
        <BookingsTab filter={activeFilter} status={activeStatus} q={activeQ} />
      ) : null}
      {activeTab === "passes" ? (
        <PassesTab filter={activeFilter} status={activeStatus} q={activeQ} />
      ) : null}
    </>
  );
}
