import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { listContentPosts } from "@/lib/db/queries/content";
import { WORK_TYPES } from "@/lib/db/schema";
import { ClubForm } from "../club-form";

export const dynamic = "force-dynamic";

export default async function NewClubPage() {
  await verifyOwner();

  const stories = await listContentPosts({ types: WORK_TYPES });

  return (
    <>
      <PageHeader
        title="ახალი კლუბი"
        description="შეავსე ველები - შენახვის შემდეგ კლუბი სიაში გამოჩნდება."
      />
      <ClubForm
        storyOptions={stories.map((story) => ({
          id: story.id,
          title: story.title,
        }))}
      />
    </>
  );
}
