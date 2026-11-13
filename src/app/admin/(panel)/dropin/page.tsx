import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dropinSettings } from "@/lib/db/schema";
import { DropinForm } from "./dropin-form";

export const dynamic = "force-dynamic";

export default async function DropinAdminPage() {
  await verifyOwner();

  /* singleton — id=1; ჩანაწერი შეიძლება ჯერ არ არსებობდეს */
  const [settings] = await db
    .select()
    .from(dropinSettings)
    .where(eq(dropinSettings.id, 1));

  return (
    <>
      <PageHeader
        title="Drop-in"
        description="ერთდღიანი ვიზიტის პარამეტრები - ფასი, დღიური ლიმიტი, საათები."
      />
      <DropinForm defaultValues={settings ?? null} />
    </>
  );
}
