import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { SpaceForm } from "../space-form";

export const dynamic = "force-dynamic";

export default async function NewSpacePage() {
  await verifyOwner();

  return (
    <>
      <PageHeader
        title="ახალი სივრცე"
        description="შეავსე ველები - ფასები ფასების გვერდზე იმართება, აქ მხოლოდ აღწერა და გალერეაა."
      />
      <SpaceForm />
    </>
  );
}
