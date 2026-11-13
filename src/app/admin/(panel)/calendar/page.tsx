import { asc, gte } from "drizzle-orm";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { PageHeader } from "@/components/admin/ui";
import { Card } from "@/components/ui/card";
import { verifyOwner } from "@/lib/auth/session";
import {
  addDays,
  isDateOpen,
  isWeekend,
  shortDayLabelKa,
  todayTbilisi,
} from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { calendarOverrides, type CalendarOverride } from "@/lib/db/schema";
import { getPricingSettings } from "@/lib/db/queries/availability";
import { formatDateKa } from "@/lib/subscription-rules";
import {
  resolveEventSlotOpen,
  type EntrySlotKey,
  type EventSlotOverride,
  type EventWeekdays,
} from "@/lib/slots";
import { removeOverride, toggleDay } from "./actions";
import { CloseDayForm } from "./close-day-form";
import { DayCapacityForm } from "./day-capacity-form";
import { EventSlotsForm } from "./event-slots-form";
import { EventWeekdayForm } from "./event-weekday-form";
import { WeekdayCapacityForm } from "./weekday-capacity-form";

export const dynamic = "force-dynamic";

/** 6 კვირა წინ — საიტის 14-დღიან ფანჯარას მარაგით ფარავს */
const GRID_DAYS = 42;

/* ორშაბათით დაწყებული რიგები */
const WEEKDAY_HEADERS = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"];

const toggleButtonClass =
  "min-h-8 w-fit rounded-pill border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-green-mid";

/** „10:00–14:00" ბადის უჯრაში ვერ ეტევა — მოკლე ფორმა */
const SHORT_SLOTS = [
  { key: "morning", label: "10-14" },
  { key: "midday", label: "14-18" },
  { key: "evening", label: "18-22" },
] as const satisfies readonly { key: EntrySlotKey; label: string }[];

type DayView = {
  date: string;
  label: string;
  open: boolean;
  stateLabel: string;
  chipClass: string;
  note: string | null;
  /** „10-14: 8 · 14-18: სტანდ. · 18-22: სტანდ." — კაპასიტეტ-კონფიგიან დღეებზე */
  capacityLabel: string | null;
  /** გამოთვლილი ღონისძიების სლოტები — „ღონისძ: 10-14 / 18-22" */
  eventLabel: string | null;
};

/** DB-რიგი → resolveEventSlotOpen-ის გამონაკლისი */
function eventOverrideOf(
  override: CalendarOverride | undefined,
): EventSlotOverride | undefined {
  if (!override) return undefined;
  return {
    isOpen: override.isOpen,
    event: {
      morning: override.eventMorning,
      midday: override.eventMidday,
      evening: override.eventEvening,
    },
  };
}

function capacityLabelFor(override: CalendarOverride | undefined): string | null {
  if (!override) return null;
  const parts: string[] = [];
  if (
    override.capacityMorning !== null ||
    override.capacityMidday !== null ||
    override.capacityEvening !== null
  ) {
    const part = (value: number | null) =>
      value === null ? "სტანდ." : `${value}`;
    parts.push(
      `10-14: ${part(override.capacityMorning)} · 14-18: ${part(override.capacityMidday)} · 18-22: ${part(override.capacityEvening)}`,
    );
  }
  /* დღესვე-გაყიდვის დროშები (მისაღებიდან ირთვება) — read-only მინიშნება */
  const flagged = [
    override.sameDayMorning ? "10-14" : null,
    override.sameDayMidday ? "14-18" : null,
    override.sameDayEvening ? "18-22" : null,
  ].filter(Boolean);
  if (flagged.length) parts.push(`დღესვე: ${flagged.join(" / ")}`);
  return parts.length ? parts.join(" · ") : null;
}

/** ხელით დასმული ღონისძიების გამონაკლისები — „ღონისძ: 10-14 არა · 18-22 კი";
 *  გამონაკლისების სიისთვისაა, ბადის უჯრაში გამოთვლილი შედეგი ჩანს */
function eventExceptionLabel(override: CalendarOverride): string | null {
  const flags = eventOverrideOf(override)?.event;
  if (!flags) return null;
  const parts = SHORT_SLOTS.filter((slot) => flags[slot.key] !== null).map(
    (slot) => `${slot.label} ${flags[slot.key] ? "კი" : "არა"}`,
  );
  return parts.length ? `ღონისძ: ${parts.join(" · ")}` : null;
}

/** რომელი სლოტი იყიდება ღონისძიებად ამ დღეს — ბადე + გამონაკლისი + ღიაობა */
function eventLabelFor(
  date: string,
  override: CalendarOverride | undefined,
  weekly: EventWeekdays | null,
): string | null {
  const open = SHORT_SLOTS.filter((slot) =>
    resolveEventSlotOpen(date, slot.key, weekly, eventOverrideOf(override)),
  ).map((slot) => slot.label);
  return open.length ? `ღონისძ: ${open.join(" / ")}` : null;
}

function resolveDay(
  date: string,
  override: CalendarOverride | undefined,
  weekly: EventWeekdays | null,
): DayView {
  // T12:00Z → თბილისში იმავე კალენდარულ დღეს — label ზუსტია
  const label = shortDayLabelKa(date);
  const open = isDateOpen(date, override?.isOpen);
  const defaultOpen = !isWeekend(date);
  const base = {
    date,
    label,
    open,
    note: override?.note ?? null,
    capacityLabel: capacityLabelFor(override),
    eventLabel: eventLabelFor(date, override, weekly),
  };

  /* ლეიბლი ღიაობის default-თან შედარებით ისაზღვრება — რიგი შეიძლება
     მხოლოდ კაპასიტეტების გამო არსებობდეს და ეს „ხელით გახსნა" არაა */
  if (override && override.isOpen && !defaultOpen) {
    return {
      ...base,
      stateLabel: "გახსნილია ხელით",
      chipClass: "border-green-mid bg-green-light/20 text-green-dark",
    };
  }
  if (override && !override.isOpen) {
    return {
      ...base,
      stateLabel: "დახურულია",
      chipClass: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (isWeekend(date)) {
    return {
      ...base,
      stateLabel: "შაბ-კვირა - დაკეტილი",
      chipClass: "border-line bg-cream/60 text-ink-muted",
    };
  }
  return {
    ...base,
    stateLabel: "ღია",
    chipClass: "border-line bg-white text-green-dark",
  };
}

export default async function AdminCalendarPage() {
  await verifyOwner();

  const today = todayTbilisi();

  /* ერთი მოთხოვნა ორივესთვის: ბადის lookup + მომავალი გამონაკლისების სია */
  const [futureOverrides, settings] = await Promise.all([
    db
      .select()
      .from(calendarOverrides)
      .where(gte(calendarOverrides.date, today))
      .orderBy(asc(calendarOverrides.date)),
    getPricingSettings(),
  ]);

  const overrideByDate = new Map(
    futureOverrides.map((row) => [row.date, row]),
  );

  const days = Array.from({ length: GRID_DAYS }, (_, i) => {
    const date = addDays(today, i);
    return resolveDay(date, overrideByDate.get(date), settings.eventWeekdays);
  });

  /* პირველი რიგის გასწორება ორშაბათზე — ცარიელი უჯრები დღევანდელობამდე */
  const leadingBlanks = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;

  return (
    <>
      <PageHeader
        title="კალენდარი"
        description="შესვლის დღეებისა და სლოტების მართვა - შაბათ-კვირა ჩვეულებრივ დაკეტილია; აქედან შეგიძლია დღის გახსნა/დახურვა და კონკრეტული დღის ადგილების შეცვლა."
      />

      <div className="overflow-x-auto rounded-card border border-line bg-white p-4 shadow-card">
        <div className="grid min-w-[840px] grid-cols-7 gap-2">
          {WEEKDAY_HEADERS.map((label) => (
            <p
              key={label}
              className="px-1 text-center text-xs font-bold text-ink-muted"
            >
              {label}
            </p>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`blank-${i}`} aria-hidden />
          ))}
          {days.map((day) => (
            <div
              key={day.date}
              className={cn(
                "flex flex-col gap-1 rounded-card border p-2.5",
                day.chipClass,
              )}
            >
              <p className="text-xs font-bold">{day.label}</p>
              <p className="text-[11px] font-medium">{day.stateLabel}</p>
              {day.capacityLabel ? (
                <p className="text-[11px] font-semibold" title={day.capacityLabel}>
                  {day.capacityLabel}
                </p>
              ) : null}
              {day.eventLabel ? (
                <p
                  className="text-[11px] font-semibold text-green-dark"
                  title={`${day.eventLabel} (ღონისძიების საჯავშნო კალენდარში ჩანს)`}
                >
                  {day.eventLabel}
                </p>
              ) : null}
              {day.note ? (
                <p className="truncate text-[11px]" title={day.note}>
                  {day.note}
                </p>
              ) : null}
              <form action={toggleDay.bind(null, day.date)} className="mt-auto pt-1">
                <button type="submit" className={toggleButtonClass}>
                  {day.open ? "დახურე" : "გახსენი"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <Card className="mt-8 max-w-3xl">
        <h2 className="text-base font-bold text-green-dark">
          კვირის დღეების რაოდენობები
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          თითო კვირის დღეს თითო სლოტზე თავისი რაოდენობა - მოქმედებს ყველა ღია
          დღეზე, რომელსაც კონკრეტული გამონაკლისი არ აქვს. ცარიელი უჯრა =
          გლობალური რაოდენობა (ფასების გვერდიდან), 0 = სლოტი იმ კვირის დღეს
          დაკეტილია. შაბ-კვირა default-ად დაკეტილია - რიცხვი იმოქმედებს
          მხოლოდ მაშინ, თუ დღეს ზემოთ ბადეში გახსნი.
        </p>
        <div className="mt-4">
          <WeekdayCapacityForm current={settings.weekdayCapacities} />
        </div>
      </Card>

      <Card className="mt-8 max-w-3xl">
        <h2 className="text-base font-bold text-green-dark">
          სლოტის ადგილები კონკრეტულ დღეს
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          ცალკეული დღის გამონაკლისი - ჯაბნის კვირის დღის და გლობალურ
          რაოდენობას; 0 სლოტს იმ დღეს მთლიანად კეტავს.
        </p>
        <div className="mt-4">
          <DayCapacityForm minDate={today} />
        </div>
      </Card>

      <Card className="mt-8 max-w-3xl">
        <h2 className="text-base font-bold text-green-dark">
          ღონისძიების კვირის ბადე
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          მონიშნული უჯრა ნიშნავს, რომ ის სლოტი იმ კვირის დღეს ჩანს ღონისძიების
          საჯავშნო კალენდარში (გვერდი „ღონისძიების დაჯავშნა“); ცარიელი უჯრა -
          იმ დღეს არ იხსნება. ბადე მოქმედებს მხოლოდ ღია დღეებზე: ზემოთ დახურული
          დღე ღონისძიებასაც კეტავს. სლოტი, რომელზეც შესვლის ჯავშანი დაიდო,
          ავტომატურად ქრება (და პირიქით) - ვინც პირველია, ის იკავებს. საიტზე
          ერთდროულად უახლოესი 14 დღე ჩანს (იგივე ფანჯარა, რაც შესვლებზე);
          ზემოთა ბადეში მწვანე წარწერა თითო დღეზე გამოთვლილ შედეგს აჩვენებს.
        </p>
        <div className="mt-4">
          <EventWeekdayForm current={settings.eventWeekdays} />
        </div>

        <h3 className="mt-8 text-sm font-bold text-ink">
          გამონაკლისი კონკრეტულ თარიღზე
        </h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          ბადის გამონაკლისი ერთ დღეზე - „კი“ ხსნის სლოტს დახურულ დღესაც, „არა“
          კი კეტავს ბადის მიუხედავად.
        </p>
        <div className="mt-4">
          <EventSlotsForm minDate={today} />
        </div>
      </Card>

      <Card className="mt-8 max-w-3xl">
        <h2 className="text-base font-bold text-green-dark">
          დღის დახურვა შენიშვნით
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          უქმეებისა და განსაკუთრებული დღეებისთვის - დახურული დღე საიტის
          კალენდრიდან ავტომატურად ქრება.
        </p>
        <div className="mt-4">
          <CloseDayForm minDate={today} />
        </div>

        <h3 className="mt-8 text-sm font-bold text-ink">
          მომავალი გამონაკლისები
        </h3>
        {futureOverrides.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            გამონაკლისები ჯერ არ არის - ყველა დღე ჩვეულებრივი წესით მუშაობს.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col">
            {futureOverrides.map((override) => (
              <li
                key={override.date}
                className="flex flex-wrap items-center gap-2 border-b border-line py-2.5 last:border-0"
              >
                <span className="text-sm font-semibold text-ink">
                  {formatDateKa(new Date(`${override.date}T12:00:00Z`))}
                </span>
                <span
                  className={cn(
                    "rounded-pill px-2.5 py-0.5 text-xs font-semibold",
                    override.isOpen
                      ? "bg-green-light/40 text-green-dark"
                      : "bg-red-50 text-red-700",
                  )}
                >
                  {override.isOpen ? "გახსნილია" : "დახურულია"}
                </span>
                {capacityLabelFor(override) ? (
                  <span className="rounded-pill bg-cream px-2.5 py-0.5 text-xs font-semibold text-ink">
                    {capacityLabelFor(override)}
                  </span>
                ) : null}
                {eventExceptionLabel(override) ? (
                  <span className="rounded-pill bg-green-light/40 px-2.5 py-0.5 text-xs font-semibold text-green-dark">
                    {eventExceptionLabel(override)}
                  </span>
                ) : null}
                {override.note ? (
                  <span className="text-sm text-ink-muted">{override.note}</span>
                ) : null}
                <form
                  action={removeOverride.bind(null, override.date)}
                  className="ml-auto"
                >
                  <ConfirmSubmit confirmText="წაიშალოს გამონაკლისი? დღე ჩვეულებრივ წესს დაუბრუნდება (კაპასიტეტები და ღონისძიების დროშებიც).">
                    წაშლა
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
