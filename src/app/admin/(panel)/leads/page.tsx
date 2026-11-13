import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { AdminTable, EmptyRow, PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { deleteLead, setLeadStatus } from "./actions";

export const dynamic = "force-dynamic";

const LEAD_TYPE_LABEL: Record<string, string> = {
  registration: "რეგისტრაცია",
  contact: "კონტაქტი",
  b2b_partner: "პარტნიორობა",
};

/** ფილტრის ჩანართები — null = ყველა ტიპი */
const TABS: { type: string | null; label: string }[] = [
  { type: null, label: "ყველა" },
  { type: "registration", label: "რეგისტრაციები" },
  { type: "contact", label: "კონტაქტი" },
  { type: "b2b_partner", label: "პარტნიორობა" },
];

const actionButtonClass =
  "min-h-9 rounded-pill border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-green-mid";

function truncate(text: string, max = 60) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const STATUS_PILLS: { value: string; label: string }[] = [
  { value: "new", label: "ახალი" },
  { value: "done", label: "დამუშავებული" },
];

const pillClass = (active: boolean) =>
  cn(
    "min-h-8 rounded-pill border px-3 py-1 text-xs font-semibold transition-colors",
    active
      ? "border-green-dark bg-green-dark text-white"
      : "border-line bg-white text-ink-muted hover:border-green-mid",
  );

export default async function AdminLeadsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await verifyOwner();

  const searchParams = await props.searchParams;
  const rawType = searchParams.type;
  const type =
    typeof rawType === "string" && rawType in LEAD_TYPE_LABEL ? rawType : null;
  const rawStatus = searchParams.status;
  const status =
    typeof rawStatus === "string" &&
    STATUS_PILLS.some((s) => s.value === rawStatus)
      ? rawStatus
      : null;
  const rawQ = searchParams.q;
  const q = (typeof rawQ === "string" ? rawQ : "").trim() || null;

  const allRows = type
    ? await db
        .select()
        .from(leads)
        .where(eq(leads.type, type))
        .orderBy(desc(leads.createdAt))
    : await db.select().from(leads).orderBy(desc(leads.createdAt));
  let rows = allRows;
  if (status) rows = rows.filter((row) => row.status === status);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        (row.phone ?? "").toLowerCase().includes(needle) ||
        (row.email ?? "").toLowerCase().includes(needle) ||
        (row.message ?? "").toLowerCase().includes(needle),
    );
  }

  return (
    <>
      <PageHeader
        title="განაცხადები"
        description="რეგისტრაციები, კონტაქტი და პარტნიორობა - ერთ სიაში."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.type ? `/admin/leads?type=${tab.type}` : "/admin/leads"}
              className={cn(
                "inline-flex min-h-9 items-center rounded-pill border px-4 py-1.5 text-sm font-semibold",
                tab.type === type
                  ? "border-green-dark bg-green-dark text-white"
                  : "border-line bg-white text-ink hover:border-green-mid",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        {/* Route Handler-ია (ფაილის ჩამოტვირთვა), არა გვერდი */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/admin/export/leads"
          className="min-h-8 rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-muted hover:border-green-mid"
        >
          Excel-ში ჩამოტვირთვა
        </a>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={type ? `/admin/leads?type=${type}` : "/admin/leads"}
            className={pillClass(!status)}
          >
            ყველა
          </Link>
          {STATUS_PILLS.map((s) => (
            <Link
              key={s.value}
              href={`/admin/leads?${new URLSearchParams({
                ...(type ? { type } : {}),
                status: s.value,
              }).toString()}`}
              className={pillClass(status === s.value)}
            >
              {s.label}
            </Link>
          ))}
        </div>
        <form action="/admin/leads" className="flex items-center gap-1.5">
          {type ? <input type="hidden" name="type" value={type} /> : null}
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="ძებნა: სახელი, ტელეფონი, მეილი, შეტყობინება…"
            className="min-h-8 w-64 rounded-pill border border-line bg-white px-3 py-1 text-xs text-ink placeholder:text-ink-muted/60 focus:border-green-mid"
          />
          <button
            type="submit"
            className="min-h-8 rounded-pill border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-muted hover:border-green-mid"
          >
            ძებნა
          </button>
        </form>
      </div>

      <AdminTable
        head={[
          "თარიღი",
          "ტიპი",
          "სახელი",
          "ტელეფონი",
          "ელფოსტა",
          "რაზე",
          "შეტყობინება",
          "სტატუსი",
          "მოქმედება",
        ]}
      >
        {rows.length === 0 ? (
          <EmptyRow
            colSpan={9}
            text={
              status || q
                ? "დამთხვევა ვერ მოიძებნა"
                : "განაცხადები ჯერ არ არის"
            }
          />
        ) : (
          rows.map((lead) => {
            const payload = (lead.payload ?? {}) as Record<string, unknown>;
            const about =
              typeof payload.item_title === "string"
                ? payload.item_title
                : typeof payload.topic === "string"
                  ? payload.topic
                  : "-";
            return (
              <tr key={lead.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                  {lead.createdAt.toLocaleDateString("ka-GE")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {LEAD_TYPE_LABEL[lead.type] ?? lead.type}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{lead.name}</td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                  {lead.phone ?? "-"}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {lead.email ?? "-"}
                </td>
                <td className="px-4 py-3 text-ink-muted">{about}</td>
                <td
                  className="px-4 py-3 text-ink-muted"
                  title={lead.message ?? undefined}
                >
                  {lead.message ? truncate(lead.message) : "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {lead.status === "new" ? (
                    <span className="rounded-pill bg-green-light/40 px-2.5 py-0.5 text-xs font-semibold text-green-dark">
                      ახალი
                    </span>
                  ) : (
                    <span className="rounded-pill bg-line px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                      {lead.status === "done" ? "დამუშავებული" : lead.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {lead.status === "new" ? (
                      <form action={setLeadStatus.bind(null, lead.id, "done")}>
                        <button type="submit" className={actionButtonClass}>
                          დამუშავებულად მონიშვნა
                        </button>
                      </form>
                    ) : (
                      <form action={setLeadStatus.bind(null, lead.id, "new")}>
                        <button type="submit" className={actionButtonClass}>
                          ახლად დაბრუნება
                        </button>
                      </form>
                    )}
                    <form action={deleteLead.bind(null, lead.id)}>
                      <ConfirmSubmit>წაშლა</ConfirmSubmit>
                    </form>
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
