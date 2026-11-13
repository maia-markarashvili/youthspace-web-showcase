import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { pricingSettings } from "@/lib/db/schema";
import { PricingForm } from "./pricing-form";
import { SmsTest } from "./sms-test";

export const dynamic = "force-dynamic";

export default async function PricingAdminPage() {
  await verifyOwner();

  /* singleton — id=1; seed-ის შემდეგ ყოველთვის არსებობს */
  const [settings] = await db
    .select()
    .from(pricingSettings)
    .where(eq(pricingSettings.id, 1))
    .limit(1);

  return (
    <>
      <PageHeader
        title="ფასები"
        description="გაყიდვების მოდელის ერთადერთი წყარო - კლუბის ფასი, შესვლები, მეგობრის კოდი, სლოტების ადგილები. კურსის ფასდაკლებები თითო კურსშივე იწერება."
      />
      <PricingForm defaultValues={settings ?? null} />
      <SmsTest />
    </>
  );
}
