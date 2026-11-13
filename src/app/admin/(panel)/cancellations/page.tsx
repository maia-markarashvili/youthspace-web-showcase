import Link from "next/link";
import { AdminTable, EmptyRow, PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { listCancellations } from "@/lib/db/queries/cancellations";
import { formatGel } from "@/lib/money";
import { formatDateKa } from "@/lib/subscription-rules";
import { formatTimeKa } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const ACTOR_LABEL: Record<string, string> = {
  customer: "მომხმარებელმა",
  admin: "ადმინმა",
  system: "სისტემამ (ვადა)",
};

function ActorBadge({ by }: { by: string | null }) {
  const isCustomer = by === "customer";
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        isCustomer
          ? "bg-amber-100 text-amber-900"
          : "bg-line text-ink-muted",
      )}
    >
      {by ? (ACTOR_LABEL[by] ?? by) : "-"}
    </span>
  );
}

function RefundBadge({ paymentStatus }: { paymentStatus: string | null }) {
  if (paymentStatus === "paid") {
    return (
      <span className="rounded-pill bg-red-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-red-700">
        დასაბრუნებელია (ბარათი)
      </span>
    );
  }
  if (paymentStatus === "refunded") {
    return (
      <span className="rounded-pill bg-green-light/40 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-green-dark">
        დაბრუნებულია
      </span>
    );
  }
  return <span className="text-xs text-ink-muted">-</span>;
}

/** გაუქმებული შეკვეთების ჟურნალი — მომხმარებლის გაუქმებულები default-ად */
export default async function AdminCancellationsPage({
  searchParams,
}: {
  searchParams: Promise<{ by?: string | string[] }>;
}) {
  await verifyOwner();

  const { by } = await searchParams;
  const rawBy = Array.isArray(by) ? by[0] : by;
  const showAll = rawBy === "all";

  const rows = await listCancellations({
    by: showAll ? null : "customer",
    limit: 100,
  });

  const tabClass = (active: boolean) =>
    cn(
      "rounded-pill border px-4 py-1.5 text-sm font-semibold",
      active
        ? "border-green-dark bg-green-dark text-white"
        : "border-line bg-white text-ink-muted hover:border-green-mid",
    );

  return (
    <>
      <PageHeader
        title="გაუქმებები"
        description="გაუქმებული შეკვეთები - მომხმარებლის მიერ კაბინეტიდან გაუქმებულებზე შეამოწმე თანხის დაბრუნება. ბონუს-პასები კლუბს მიჰყვება და ცალკე არ ჩანს."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/cancellations" className={tabClass(!showAll)}>
          მომხმარებლის გაუქმებული
        </Link>
        <Link href="/admin/cancellations?by=all" className={tabClass(showAll)}>
          ყველა გაუქმება
        </Link>
      </div>

      <AdminTable
        head={[
          "დრო",
          "ვინ გააუქმა",
          "პროდუქტი",
          "კოდი",
          "მყიდველი",
          "თანხა",
          "თანხის სტატუსი",
        ]}
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={7} text="გაუქმებული შეკვეთები არ არის." />
        ) : (
          rows.map((row) => (
            <tr key={row.key} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3 whitespace-nowrap text-ink">
                {row.cancelledAt
                  ? `${formatDateKa(row.cancelledAt)} · ${formatTimeKa(row.cancelledAt)}`
                  : "-"}
              </td>
              <td className="px-4 py-3">
                <ActorBadge by={row.cancelledBy} />
              </td>
              <td className="px-4 py-3 text-ink">{row.title}</td>
              <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                {row.orderRef || "-"}
              </td>
              <td className="px-4 py-3 text-ink">
                {row.name}
                <span className="block text-xs text-ink-muted">{row.phone}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap font-semibold text-ink">
                {formatGel(row.amountTetri)}
              </td>
              <td className="px-4 py-3">
                <RefundBadge paymentStatus={row.paymentStatus} />
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </>
  );
}
