import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { BroadcastButton } from "@/components/admin/broadcast-button";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listClubs } from "@/lib/db/queries/catalog";
import { courses, subscribers } from "@/lib/db/schema";
import { resolveCourseLanding } from "@/lib/landing";
import { CourseForm } from "../course-form";

export const dynamic = "force-dynamic";

/** არასწორი id-თ Postgres uuid-შეცდომას ვაგდებთ — ჯერ ფორმატს ვამოწმებთ */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCoursePage(
  props: PageProps<"/admin/courses/[id]">,
) {
  const admin = await verifyOwner();

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [[course], [subscriberCount], clubRows] = await Promise.all([
    db.select().from(courses).where(eq(courses.id, id)),
    db
      .select({ n: count() })
      .from(subscribers)
      .where(eq(subscribers.isActive, true)),
    listClubs(),
  ]);
  if (!course) notFound();

  /* placeholder-ებში ეფექტური (ავტო ან შენახული) მნიშვნელობები ჩანს */
  const resolved = resolveCourseLanding(course);
  const clubs = clubRows.map((club) => ({ id: club.id, title: club.title }));

  return (
    <>
      <PageHeader title={course.title} description="კურსის რედაქტირება" />
      <CourseForm
        defaultValues={course}
        placeholders={resolved.facts}
        clubs={clubs}
      />
      <div className="mt-10 max-w-2xl border-t border-line pt-6">
        <h2 className="text-sm font-bold text-ink">სიახლის გაგზავნა</h2>
        <p className="mt-1 text-xs text-ink-muted">
          გაუგზავნე ეს გვერდი სიახლეების გამომწერებს - თითოეულს ცალკე
          წერილი მიდის, გამოწერის გაუქმების ბმულით.
        </p>
        <div className="mt-4">
          <BroadcastButton
            defaultTestEmail={admin.email}
            itemType="course"
            itemId={course.id}
            subscriberCount={subscriberCount.n}
          />
        </div>
      </div>
    </>
  );
}
