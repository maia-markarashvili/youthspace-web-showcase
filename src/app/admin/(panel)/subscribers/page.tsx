import { count, desc, eq } from "drizzle-orm";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { AdminTable, EmptyRow, StatusDot } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { deleteSubscriber, toggleSubscriber } from "./actions";

export const dynamic = "force-dynamic";

const actionButtonClass =
  "min-h-9 rounded-pill border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-green-mid";

export default async function AdminSubscribersPage() {
  await verifyOwner();

  const [rows, [active]] = await Promise.all([
    db.select().from(subscribers).orderBy(desc(subscribers.createdAt)),
    db
      .select({ n: count() })
      .from(subscribers)
      .where(eq(subscribers.isActive, true)),
  ]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-bold text-green-dark">გამომწერები</h1>
          <p className="mt-1 text-sm text-ink-muted">
            ნიუსლეთერის ბაზა - აქტიური გამომწერი: {active?.n ?? 0}
          </p>
        </div>
        {/* Route Handler-ია (ფაილის ჩამოტვირთვა), არა გვერდი - Link-ის
            client-router-ული გადასვლა ჩამოტვირთვას გაფუჭებდა */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/admin/export/subscribers"
          className="inline-flex min-h-10 items-center rounded-pill bg-green-dark px-5 py-2 text-sm font-semibold text-white hover:bg-green-mid"
        >
          Excel-ში ჩამოტვირთვა
        </a>
      </div>

      <AdminTable head={["ელფოსტა", "წყარო", "თარიღი", "სტატუსი", "მოქმედება"]}>
        {rows.length === 0 ? (
          <EmptyRow colSpan={5} text="გამომწერები ჯერ არ არის" />
        ) : (
          rows.map((subscriber) => (
            <tr
              key={subscriber.id}
              className="border-b border-line last:border-0"
            >
              <td className="px-4 py-3 font-medium text-ink">
                {subscriber.email}
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {subscriber.source ?? "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {subscriber.createdAt.toLocaleDateString("ka-GE")}
              </td>
              <td className="px-4 py-3">
                <StatusDot active={subscriber.isActive} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <form action={toggleSubscriber.bind(null, subscriber.id)}>
                    <button type="submit" className={actionButtonClass}>
                      {subscriber.isActive ? "გამორთვა" : "ჩართვა"}
                    </button>
                  </form>
                  <form action={deleteSubscriber.bind(null, subscriber.id)}>
                    <ConfirmSubmit>წაშლა</ConfirmSubmit>
                  </form>
                </div>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </>
  );
}
