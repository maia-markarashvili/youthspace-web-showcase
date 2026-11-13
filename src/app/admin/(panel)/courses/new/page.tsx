import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { listClubs } from "@/lib/db/queries/catalog";
import { CourseForm } from "../course-form";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  await verifyOwner();

  const clubs = (await listClubs()).map((club) => ({
    id: club.id,
    title: club.title,
  }));

  return (
    <>
      <PageHeader
        title="ახალი კურსი"
        description="შეავსე ველები - კურსი კატალოგში მაშინვე გამოჩნდება, თუ აქტიურია."
      />
      <CourseForm clubs={clubs} />
    </>
  );
}
