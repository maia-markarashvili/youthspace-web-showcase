import { AdminTable, EmptyRow, PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { listVisits } from "@/lib/db/queries/visits";
import { todayTbilisi } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ვიზიტების დღის ჟურნალი — ვინ, როდის და რომელმა ოპერატორმა მიიღო */
export default async function AdminVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  await verifyOwner();

  const { date } = await searchParams;
  const rawDate = Array.isArray(date) ? date[0] : date;
  const dateISO =
    rawDate && DATE_RE.test(rawDate) ? rawDate : todayTbilisi();

  const rows = await listVisits(dateISO);

  return (
    <>
      <PageHeader
        title="ვიზიტები"
        description="მისაღებში აღრიცხული შემოსვლები - QR-სკანით ან ხელით. დრო თბილისითაა."
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          თარიღი
          <input
            type="date"
            name="date"
            defaultValue={dateISO}
            className="min-h-10 rounded-card border border-line bg-white px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="min-h-10 rounded-pill bg-green-dark px-5 py-2 text-sm font-semibold text-white hover:bg-green-mid"
        >
          ჩვენება
        </button>
        {/* Route Handler-ია (ფაილის ჩამოტვირთვა), არა გვერდი - Link-ის
            client-router-ული გადასვლა ჩამოტვირთვას გაფუჭებდა */}
        <a
          href={`/admin/export/visits?date=${dateISO}`}
          className="inline-flex min-h-10 items-center rounded-pill border border-line bg-white px-5 py-2 text-sm font-semibold text-ink hover:border-green-mid"
        >
          ეს დღე Excel-ში
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/admin/export/visits"
          className="inline-flex min-h-10 items-center rounded-pill border border-line bg-white px-5 py-2 text-sm font-semibold text-ink hover:border-green-mid"
        >
          სრული ისტორია Excel-ში
        </a>
      </form>

      <AdminTable
        head={["დრო", "ვიზიტი", "კოდი", "სახელი", "ოპერატორი", "მეთოდი"]}
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={6} text="ამ დღეს აღრიცხული ვიზიტები არ არის." />
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3 whitespace-nowrap font-semibold text-ink">
                {row.time}
              </td>
              <td className="px-4 py-3 text-ink">{row.itemLabel}</td>
              <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                {row.orderRef}
              </td>
              <td className="px-4 py-3 text-ink">{row.name}</td>
              <td className="px-4 py-3 text-ink-muted">{row.operator}</td>
              <td className="px-4 py-3">
                <span className="inline-block rounded-pill bg-cream px-2.5 py-0.5 text-xs font-semibold text-ink">
                  {row.method === "qr" ? "QR" : "ხელით"}
                </span>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </>
  );
}
