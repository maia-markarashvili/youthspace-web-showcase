import { MemberForm } from "./member-form";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import {
  clubSeatsRemainingByClub,
  getPricingSettings,
  seatsFor,
} from "@/lib/db/queries/availability";
import { listClubs } from "@/lib/db/queries/catalog";
import { clubMonthlyPrice } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * წევრის ხელით დამატება — იგივე გზა, რაც საიტიდან ყიდვას
 * (createClubSubscription), ამიტომ საიტის მთვლელები ავტომატურად რეაგირებენ.
 */
export default async function NewMemberPage() {
  await verifyOwner();

  const settings = await getPricingSettings();
  const [clubRows, remaining] = await Promise.all([
    listClubs(),
    clubSeatsRemainingByClub(settings),
  ]);

  const clubOptions = clubRows.map((club) => ({
    id: club.id,
    title: club.title,
    seatsRemaining: seatsFor(remaining, club.id, settings),
  }));

  return (
    <>
      <PageHeader
        title="წევრის დამატება"
        description="ხელით დამატებული წევრი იმავე კვოტებში ითვლება, რაც საიტიდან ყიდვა - ადგილები ავტომატურად შემცირდება."
      />
      <MemberForm
        clubs={clubOptions}
        clubSeatCapacity={settings.clubSeatCapacity}
        pricePair={clubMonthlyPrice(settings)}
      />
    </>
  );
}
