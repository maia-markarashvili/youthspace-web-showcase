import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { HeroSlideForm } from "../hero-form";

export const dynamic = "force-dynamic";

export default async function NewHeroSlidePage() {
  await verifyOwner();

  return (
    <>
      <PageHeader
        title="ახალი სლაიდი"
        description="მთავარი გვერდის ახალი ბანერის დამატება."
      />
      <HeroSlideForm />
    </>
  );
}
