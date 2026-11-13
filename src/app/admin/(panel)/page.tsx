import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { AdminTable, EmptyRow, PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  bookings,
  clubs,
  courses,
  entryPasses,
  leads,
  subscribers,
  subscriptions,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const LEAD_TYPE_LABEL: Record<string, string> = {
  registration: "რეგისტრაცია",
  contact: "კონტაქტი",
  b2b_partner: "პარტნიორობა",
};

export default async function AdminDashboardPage() {
  await verifyOwner();

  const [
    [newLeads],
    [subscriberCount],
    [clubCount],
    [courseCount],
    [pendingSubs],
    [pendingBookings],
    [pendingPasses],
    recent,
  ] = await Promise.all([
    db.select({ n: count() }).from(leads).where(eq(leads.status, "new")),
    db
      .select({ n: count() })
      .from(subscribers)
      .where(eq(subscribers.isActive, true)),
    db.select({ n: count() }).from(clubs).where(eq(clubs.isActive, true)),
    db.select({ n: count() }).from(courses).where(eq(courses.isActive, true)),
    db
      .select({ n: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "pending")),
    db
      .select({ n: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "pending"),
          inArray(bookings.itemType, ["dropin", "course"]),
        ),
      ),
    db
      .select({ n: count() })
      .from(entryPasses)
      .where(eq(entryPasses.status, "pending")),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(8),
  ]);

  const pendingOrders =
    (pendingSubs?.n ?? 0) + (pendingBookings?.n ?? 0) + (pendingPasses?.n ?? 0);

  const stats = [
    {
      label: "დასადასტურებელი შეკვეთა",
      value: pendingOrders,
      href: "/admin/orders",
    },
    { label: "ახალი განაცხადი", value: newLeads?.n ?? 0, href: "/admin/leads" },
    {
      label: "აქტიური გამომწერი",
      value: subscriberCount?.n ?? 0,
      href: "/admin/subscribers",
    },
    { label: "აქტიური კლუბი", value: clubCount?.n ?? 0, href: "/admin/clubs" },
    {
      label: "აქტიური კურსი",
      value: courseCount?.n ?? 0,
      href: "/admin/courses",
    },
  ];

  return (
    <>
      <PageHeader
        title="მთავარი"
        description="რას აკეთებს საიტი ახლა - განაცხადები, გამომწერები, კატალოგი."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-card border border-line bg-white p-5 shadow-card transition hover:shadow-card-hover"
          >
            <p className="text-h2 font-bold text-green-dark">{stat.value}</p>
            <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-h3 font-bold text-green-dark">
        ბოლო განაცხადები
      </h2>
      <AdminTable head={["თარიღი", "ტიპი", "სახელი", "კონტაქტი", "რაზე", "სტატუსი"]}>
        {recent.length === 0 ? (
          <EmptyRow colSpan={6} text="განაცხადები ჯერ არ არის" />
        ) : (
          recent.map((lead) => {
            const payload = (lead.payload ?? {}) as Record<string, unknown>;
            return (
              <tr key={lead.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                  {lead.createdAt.toLocaleDateString("ka-GE")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {LEAD_TYPE_LABEL[lead.type] ?? lead.type}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{lead.name}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {lead.phone ?? lead.email ?? "-"}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {typeof payload.item_title === "string"
                    ? payload.item_title
                    : (payload.topic as string | undefined) ?? "-"}
                </td>
                <td className="px-4 py-3">
                  {lead.status === "new" ? (
                    <span className="rounded-pill bg-green-light/40 px-2.5 py-0.5 text-xs font-semibold text-green-dark">
                      ახალი
                    </span>
                  ) : (
                    <span className="rounded-pill bg-line px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                      {lead.status}
                    </span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>
    </>
  );
}
