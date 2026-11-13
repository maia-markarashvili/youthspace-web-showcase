import Image from "next/image";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { deleteClub, toggleClubActive } from "./actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { AdminTable, EmptyRow, PageHeader, StatusDot } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  clubSeatsRemainingByClub,
  getPricingSettings,
  seatsFor,
} from "@/lib/db/queries/availability";
import { clubs } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminClubsPage() {
  await verifyOwner();

  const [rows, settings] = await Promise.all([
    db.select().from(clubs).orderBy(asc(clubs.sortOrder), asc(clubs.createdAt)),
    getPricingSettings(),
  ]);
  const remaining = await clubSeatsRemainingByClub(settings);

  return (
    <>
      <PageHeader
        title="კლუბები"
        description="recurring კლუბები - განრიგი, გაყიდული ადგილები, ხილვადობა საიტზე. ფასები იმართება «ფასები» გვერდიდან."
        action={{ href: "/admin/clubs/new", label: "+ ახალი კლუბი" }}
      />

      <AdminTable
        head={[
          "ფოტო",
          "სახელი",
          "Slug",
          "ასაკი",
          "გაყიდული",
          "შეხვედრა",
          "რიგი",
          "სტატუსი",
          "მოქმედება",
        ]}
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={9} text="კლუბები ჯერ არ არის - დაამატე პირველი" />
        ) : (
          rows.map((club) => (
            <tr key={club.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                {club.coverImage ? (
                  <Image
                    src={club.coverImage}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="size-12 rounded-card border border-line object-cover"
                  />
                ) : (
                  <div aria-hidden className="size-12 rounded-card bg-cream" />
                )}
              </td>
              <td className="px-4 py-3 font-medium text-ink">{club.title}</td>
              <td className="px-4 py-3 text-ink-muted">{club.slug}</td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {club.ageRange ?? "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink">
                {`${settings.clubSeatCapacity - seatsFor(remaining, club.id, settings)}/${settings.clubSeatCapacity}`}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {club.meetingDay ?? "-"}
                {club.meetingTime ? ` · ${club.meetingTime}` : ""}
              </td>
              <td className="px-4 py-3 text-ink-muted">{club.sortOrder}</td>
              <td className="px-4 py-3">
                <StatusDot active={club.isActive} />
                {club.registrationClosed ? (
                  <span className="mt-1 block text-xs font-semibold whitespace-nowrap text-ink-muted">
                    მიღება დასრულ.
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Link
                    href={`/admin/clubs/${club.id}`}
                    className="inline-flex min-h-9 items-center rounded-pill px-3 py-1.5 text-sm font-semibold text-green-dark hover:bg-green-light/30"
                  >
                    რედაქტირება
                  </Link>
                  <form action={toggleClubActive.bind(null, club.id)}>
                    <button
                      type="submit"
                      className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold text-ink hover:bg-cream"
                    >
                      {club.isActive ? "გამორთვა" : "ჩართვა"}
                    </button>
                  </form>
                  <form action={deleteClub.bind(null, club.id)}>
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
