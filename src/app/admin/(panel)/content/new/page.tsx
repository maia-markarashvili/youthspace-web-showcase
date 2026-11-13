import { asc } from "drizzle-orm";
import { ContentForm } from "../content-form";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { clubs } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function NewContentPostPage() {
  await verifyOwner();

  const clubsOptions = await db
    .select({ id: clubs.id, title: clubs.title })
    .from(clubs)
    .orderBy(asc(clubs.sortOrder));

  return (
    <>
      <PageHeader
        title="ახალი ჩანაწერი"
        description="გალერეის, სიახლის, ნამუშევრის ან გამოხმაურების დამატება."
      />
      <ContentForm clubsOptions={clubsOptions} />
    </>
  );
}
