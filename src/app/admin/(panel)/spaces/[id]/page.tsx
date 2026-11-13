import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { spaces } from "@/lib/db/schema";
import { SpaceForm } from "../space-form";

export const dynamic = "force-dynamic";

export default async function EditSpacePage(
  props: PageProps<"/admin/spaces/[id]">,
) {
  await verifyOwner();
  const { id } = await props.params;

  const [space] = await db.select().from(spaces).where(eq(spaces.id, id));
  if (!space) notFound();

  return (
    <>
      <PageHeader
        title={space.title}
        description="სივრცის რედაქტირება - ცვლილება მაშინვე ჩანს საიტზე."
      />
      <SpaceForm defaultValues={space} />
    </>
  );
}
