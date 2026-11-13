import Image from "next/image";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { deleteSpace, toggleSpaceActive } from "./actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { AdminTable, EmptyRow, PageHeader, StatusDot } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { spaces } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminSpacesPage() {
  await verifyOwner();

  const rows = await db
    .select()
    .from(spaces)
    .orderBy(asc(spaces.sortOrder), asc(spaces.createdAt));

  return (
    <>
      <PageHeader
        title="სივრცეები"
        description="ღონისძიების გვერდის კონტენტი (აღწერა, გალერეა, ინვენტარი) - საიტი პირველ აქტიურ რიგს აჩვენებს. ფასები „ფასების“ გვერდიდან იმართება, დღეები - კალენდრიდან."
        action={{ href: "/admin/spaces/new", label: "+ ახალი სივრცე" }}
      />

      <AdminTable
        head={[
          "ფოტო",
          "სახელწოდება",
          "Slug",
          "ტევადობა",
          "რიგი",
          "სტატუსი",
          "მოქმედებები",
        ]}
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={7} text="სივრცეები ჯერ არ არის - დაამატე პირველი" />
        ) : (
          rows.map((space) => (
            <tr key={space.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                {space.coverImage ? (
                  <div className="relative h-10 w-16 overflow-hidden rounded-card border border-line bg-cream">
                    <Image
                      src={space.coverImage}
                      alt={space.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-16 items-center justify-center rounded-card border border-line bg-cream text-xs text-ink-muted">
                    -
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-ink">
                <Link
                  href={`/admin/spaces/${space.id}`}
                  className="hover:text-green-dark"
                >
                  {space.title}
                </Link>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {space.slug}
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {space.capacity ?? "-"}
              </td>
              <td className="px-4 py-3 text-ink-muted">{space.sortOrder}</td>
              <td className="px-4 py-3">
                <StatusDot active={space.isActive} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Link
                    href={`/admin/spaces/${space.id}`}
                    className="inline-flex min-h-9 items-center rounded-pill px-3 py-1.5 text-sm font-semibold text-green-dark hover:bg-green-light/40"
                  >
                    რედაქტირება
                  </Link>
                  <form action={toggleSpaceActive.bind(null, space.id)}>
                    <button
                      type="submit"
                      className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-cream"
                    >
                      {space.isActive ? "გამორთვა" : "ჩართვა"}
                    </button>
                  </form>
                  <form action={deleteSpace.bind(null, space.id)}>
                    <ConfirmSubmit confirmText="წავშალო სივრცე? მოქმედება შეუქცევადია.">
                      წაშლა
                    </ConfirmSubmit>
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
