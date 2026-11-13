import { inArray } from "drizzle-orm";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPricingSettings } from "@/lib/db/queries/availability";
import {
  bookings,
  clubs,
  entryPasses,
  leads,
  subscribers,
  subscriptions,
} from "@/lib/db/schema";
import { listAllVisits, listVisits } from "@/lib/db/queries/visits";
import { toXlsxBuffer } from "@/lib/xlsx";
import { formatGel } from "@/lib/money";
import { formatDateKa, subscriptionPhase } from "@/lib/subscription-rules";

/**
 * Excel-ში ჩამოტვირთვა (§1.6) — admin-ის ხელით SMS-ების გასაგზავნად
 * (ვადა ეწურება) და ზოგადი ექსპორტისთვის. namdvili `.xlsx` (lib/xlsx.ts) -
 * ადრინდელი CSV+BOM ტრიუკი პრაქტიკაში ჩავარდა (real-world Excel-ის
 * კონფიგურაციაზე double-encoding-ს იძლეოდა), XLSX-ს ეს პრობლემა არ აქვს.
 *
 * ⚠ `(panel)` route group-ის მიღმაა (route handler layout-ს ვერ იზიარებს),
 * ამიტომ ავტორიზაცია აქვე, ხელით — verifyOwner() ჯერ კიდევ redirect-ს
 * აკეთებს route handler-შიც (Next-ის დოკუმენტაცია ამას მხარს უჭერს).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_KINDS = [
  "subscriptions",
  "bookings",
  "passes",
  "leads",
  "subscribers",
  "visits",
] as const;
type ExportKind = (typeof EXPORT_KINDS)[number];

function xlsxResponse(fileName: string, buffer: Buffer): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

const DAY_MS = 86_400_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  await verifyOwner();

  const { kind } = await params;
  if (!EXPORT_KINDS.includes(kind as ExportKind)) {
    return new Response("Not found", { status: 404 });
  }

  const filter = new URL(request.url).searchParams.get("filter");
  const today = new Date().toISOString().slice(0, 10);

  if (kind === "subscriptions") {
    const settings = await getPricingSettings();
    const [allRows, clubRows] = await Promise.all([
      db
        .select()
        .from(subscriptions)
        .where(inArray(subscriptions.planType, ["club", "vip"])),
      db.select({ id: clubs.id, title: clubs.title }).from(clubs),
    ]);
    const clubTitles = new Map(clubRows.map((club) => [club.id, club.title]));
    const now = Date.now();

    /* „ვადა ეწურება" = გრეისში/გასული, ან აქტიური და 14 დღეზე ნაკლები დარჩა —
       ეს ზუსტად ის სია, რასაც ადმინი ხელით SMS-ისთვის იყენებს */
    const rows =
      filter === "expiring"
        ? allRows.filter((row) => {
            if (row.status !== "active" || !row.currentPeriodEnd) return false;
            const phase = subscriptionPhase(
              row.currentPeriodEnd,
              settings.renewalGraceDays,
            );
            if (phase !== "active") return true;
            const daysLeft = Math.ceil(
              (row.currentPeriodEnd.getTime() - now) / DAY_MS,
            );
            return daysLeft <= 14;
          })
        : allRows;

    const buffer = await toXlsxBuffer(
      "კლუბ-გამოწერები",
      [
        "კოდი",
        "სახელი",
        "ტელეფონი",
        "მეილი",
        "ასაკი",
        "კლუბები",
        "თანხა",
        "სტატუსი",
        "ფაზა",
        "ვადის ბოლო",
        "დარჩა დღე",
        "დაკავებული გადაუხდელი",
      ],
      rows.map((row) => {
        const titles = (row.clubIds ?? [])
          .map((clubId) => clubTitles.get(clubId))
          .filter(Boolean)
          .join(", ");
        const phase =
          row.status === "active" && row.currentPeriodEnd
            ? subscriptionPhase(row.currentPeriodEnd, settings.renewalGraceDays)
            : null;
        const daysLeft = row.currentPeriodEnd
          ? Math.ceil((row.currentPeriodEnd.getTime() - now) / DAY_MS)
          : null;
        return [
          row.orderRef ?? "",
          row.subscriberName,
          row.subscriberPhone,
          row.subscriberEmail,
          row.childAge ?? "",
          titles,
          formatGel(row.amountGel),
          row.status,
          phase ?? "",
          row.currentPeriodEnd ? formatDateKa(row.currentPeriodEnd) : "",
          daysLeft ?? "",
          row.reservedAt ? "დიახ" : "",
        ];
      }),
    );
    return xlsxResponse(`kluburi-gamowerebi-${today}.xlsx`, buffer);
  }

  if (kind === "bookings") {
    const rows = await db.select().from(bookings);
    const buffer = await toXlsxBuffer(
      "ჯავშნები",
      [
        "კოდი",
        "ტიპი",
        "თარიღი",
        "სახელი",
        "ტელეფონი",
        "მეილი",
        "ასაკი",
        "თანხა",
        "სტატუსი",
        "დაკავებული გადაუხდელი",
        /* განვადება — თანხის სვეტი ერთი თვეა, ამიტომ გეგმა ცალკე ჩანს */
        "გეგმა",
        "გადახდილი თვეები",
        "შემდეგი ვადა",
      ],
      rows.map((row) => [
        row.orderRef,
        row.itemType,
        row.bookingDate,
        row.buyerName,
        row.buyerPhone,
        row.buyerEmail,
        row.childAge ?? "",
        formatGel(row.amountGel),
        row.status,
        row.reservedAt ? "დიახ" : "",
        row.planMonths
          ? `განვადება ${formatGel(row.amountGel)} × ${row.planMonths}`
          : "",
        row.planMonths ? `${row.monthsPaid}/${row.planMonths}` : "",
        row.planNextDueAt ? formatDateKa(row.planNextDueAt) : "",
      ]),
    );
    return xlsxResponse(`javshnebi-${today}.xlsx`, buffer);
  }

  if (kind === "passes") {
    const rows = await db.select().from(entryPasses);
    const buffer = await toXlsxBuffer(
      "პასები",
      [
        "კოდი",
        "სახელი",
        "ტელეფონი",
        "მეილი",
        "თანხა",
        "სულ შესვლა",
        "ვადა",
        "სტატუსი",
        "დაკავებული გადაუხდელი",
      ],
      rows.map((row) => [
        row.orderRef,
        row.buyerName,
        row.buyerPhone,
        row.buyerEmail ?? "",
        formatGel(row.amountGel),
        row.entriesTotal,
        formatDateKa(row.expiresAt),
        row.status,
        row.reservedAt ? "დიახ" : "",
      ]),
    );
    return xlsxResponse(`pasebi-${today}.xlsx`, buffer);
  }

  if (kind === "visits") {
    /* ?date=YYYY-MM-DD → ერთი დღე (გვერდის ფილტრის შესაბამისი);
       უამისოდ → სრული ისტორია */
    const date = new URL(request.url).searchParams.get("date");
    const dayOnly = Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date));
    const rows = dayOnly
      ? await listVisits(date as string, 10_000)
      : await listAllVisits();

    const buffer = await toXlsxBuffer(
      "ვიზიტები",
      ["თარიღი", "დრო", "ვიზიტი", "კოდი", "სახელი", "ოპერატორი", "მეთოდი"],
      rows.map((row) => [
        row.dateISO,
        row.time,
        row.itemLabel,
        row.orderRef,
        row.name,
        row.operator,
        row.method === "qr" ? "QR" : "ხელით",
      ]),
    );
    return xlsxResponse(
      dayOnly ? `vizitebi-${date}.xlsx` : `vizitebi-sruli-${today}.xlsx`,
      buffer,
    );
  }

  if (kind === "leads") {
    const rows = await db.select().from(leads);
    const buffer = await toXlsxBuffer(
      "განაცხადები",
      ["ტიპი", "სახელი", "ტელეფონი", "მეილი", "შეტყობინება", "სტატუსი", "თარიღი"],
      rows.map((row) => [
        row.type,
        row.name,
        row.phone ?? "",
        row.email ?? "",
        row.message ?? "",
        row.status,
        formatDateKa(row.createdAt),
      ]),
    );
    return xlsxResponse(`ganacxadebi-${today}.xlsx`, buffer);
  }

  const rows = await db.select().from(subscribers);
  const buffer = await toXlsxBuffer(
    "გამომწერები",
    ["მეილი", "წყარო", "აქტიური", "თარიღი"],
    rows.map((row) => [
      row.email,
      row.source ?? "",
      row.isActive ? "დიახ" : "არა",
      formatDateKa(row.createdAt),
    ]),
  );
  return xlsxResponse(`gamomwerebi-${today}.xlsx`, buffer);
}
