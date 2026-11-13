import Image from "next/image";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { deleteCourse, toggleCourseActive } from "./actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import {
  AdminTable,
  EmptyRow,
  PageHeader,
  StatusDot,
} from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { formatGel } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  await verifyOwner();

  const rows = await db.select().from(courses).orderBy(desc(courses.createdAt));

  return (
    <>
      <PageHeader
        title="კურსები"
        description="ერთჯერადი კურსების კატალოგი - ფასები, ლექტორები, ადგილები."
        action={{ href: "/admin/courses/new", label: "+ ახალი კურსი" }}
      />

      <AdminTable
        head={[
          "ფოტო",
          "სათაური",
          "Slug",
          "კატეგორია",
          "ლექტორი",
          "ფასი",
          "ადგილები",
          "სტატუსი",
          "მოქმედება",
        ]}
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={9} text="კურსები ჯერ არ არის - დაამატე პირველი" />
        ) : (
          rows.map((course) => (
            <tr key={course.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                {course.coverImage ? (
                  <div className="relative h-10 w-16 overflow-hidden rounded-card border border-line bg-cream">
                    <Image
                      src={course.coverImage}
                      alt={course.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden
                    className="h-10 w-16 rounded-card border border-line bg-cream"
                  />
                )}
              </td>
              <td className="px-4 py-3 font-medium text-ink">{course.title}</td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {course.slug}
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {course.category ?? "-"}
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {course.lecturer ?? "-"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatGel(course.priceRegular)}
                {course.monthlyPrice != null && course.monthlyMonths != null ? (
                  <span className="block text-xs text-ink-muted">
                    განვადება {formatGel(course.monthlyPrice)} ×{" "}
                    {course.monthlyMonths}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {course.capacity ?? "-"}
              </td>
              <td className="px-4 py-3">
                <StatusDot active={course.isActive} />
                {course.registrationClosed ? (
                  <span className="mt-1 block text-xs font-semibold whitespace-nowrap text-ink-muted">
                    მიღება დასრულ.
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="inline-flex min-h-9 items-center rounded-pill px-3 py-1.5 text-sm font-semibold text-green-dark hover:bg-cream"
                  >
                    რედაქტირება
                  </Link>
                  <form action={toggleCourseActive.bind(null, course.id)}>
                    <button
                      type="submit"
                      className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-cream"
                    >
                      {course.isActive ? "გამორთვა" : "ჩართვა"}
                    </button>
                  </form>
                  <form action={deleteCourse.bind(null, course.id)}>
                    <ConfirmSubmit confirmText="წავშალო კურსი? მოქმედება შეუქცევადია.">
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
