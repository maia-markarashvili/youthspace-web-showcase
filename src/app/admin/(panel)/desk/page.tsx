import { PageHeader } from "@/components/admin/ui";
import { Card } from "@/components/ui/card";
import { verifyStaff } from "@/lib/auth/session";
import { deskSlotBoard } from "@/lib/db/queries/calendar";
import { findAtDeskById } from "@/lib/db/queries/desk";
import { verifyTicketToken } from "@/lib/ticket-token";
import { ChangePasswordForm } from "./change-password-form";
import { DeskSearchForm } from "./desk-form";
import { DeskResultCard } from "./desk-results";
import { DeskSlotBoard } from "./desk-slot-board";

export const dynamic = "force-dynamic";

/**
 * QR-სკანის შესვლის წერტილი: სტუმრის ბილეთის QR-ში `/admin/desk?scan=<token>`
 * წერია - თანამშრომლის ტელეფონის კამერა ამ გვერდს ხსნის, ტოკენი მოწმდება
 * და ბარათი ვერდიქტით/„მიღება" ღილაკით ჩნდება. ძებნის ფორმა fallback-ად
 * ყოველთვის ქვემოთაა.
 */
export default async function AdminDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string | string[] }>;
}) {
  await verifyStaff();
  const board = await deskSlotBoard();

  const { scan } = await searchParams;
  const scanToken = Array.isArray(scan) ? scan[0] : scan;

  let scanSection: React.ReactNode = null;
  if (scanToken) {
    const ticket = await verifyTicketToken(scanToken);
    const match = ticket ? await findAtDeskById(ticket.kind, ticket.id) : null;
    scanSection = match ? (
      <section className="mb-8 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-green-dark">QR-სკანის შედეგი</h2>
        <DeskResultCard result={match} admitMethod="qr" />
      </section>
    ) : (
      <div className="mb-8 rounded-card border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        QR-კოდი არასწორია ან ვადაგასულია - მოძებნე ხელით.
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="მისაღები"
        description="დაასკანერე სტუმრის QR-კოდი ტელეფონის კამერით ან მოძებნე ტელეფონით/კოდით - სახელი სრულად ჩანს, ტელეფონი და მეილი ნაწილობრივ."
      />

      {scanSection}

      <DeskSearchForm />

      <Card className="mt-8 max-w-3xl">
        <h2 className="text-base font-bold text-green-dark">
          ჯავშნები უახლოეს დღეებში
        </h2>
        <p className="mt-0.5 mb-3 text-xs text-ink-muted">
          შესვლები დაკავებული/სულ თითო სლოტზე - ოპერატორის დაგეგმვისთვის;
          სივრცის (ღონისძიების) ჯავშანი ცალკე ჭდით ჩანს. დღევანდელი სლოტი
          საიტზე იყიდება მხოლოდ თუ მასზე ჯავშანი უკვე არსებობს ან დღესვე
          გაყიდვას ჩართავ.
        </p>
        {!board[0]?.isToday ? (
          <p className="mb-3 text-xs font-semibold text-ink-muted">
            დღეს დახურულია - დღესვე გაყიდვისთვის ჯერ მფლობელმა კალენდრიდან
            გახსნას დღე.
          </p>
        ) : null}
        <DeskSlotBoard board={board} />
      </Card>

      <div className="mt-10 max-w-sm">
        <h2 className="mb-3 text-sm font-bold text-green-dark">ჩემი პაროლის შეცვლა</h2>
        <ChangePasswordForm />
      </div>
    </>
  );
}
