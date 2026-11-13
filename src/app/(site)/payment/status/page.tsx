import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { findOrderByRef } from "@/lib/db/mutations/confirm-order";
import { findPaymentByReturnToken } from "@/lib/db/mutations/payment";
import { getPricingSettings } from "@/lib/db/queries/availability";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { formatGel } from "@/lib/money";
import { t } from "@/lib/site-texts";
import { TrackPurchase } from "@/components/meta-pixel";
import { purchasePixelMeta } from "@/lib/pixel-meta";
import {
  RETURN_TOKEN_COOKIE,
  RETURN_TOKEN_RE,
} from "@/lib/payment-return";
import { StatusCleanup } from "./status-cleanup";
import { StatusPoller } from "./status-poller";

/**
 * გადახდის შედეგის გვერდი (Flitt-ის `response_url` აქ გადმოამისამართებს).
 *
 * ⚠ ბრაუზერის დაბრუნებას **არ ვენდობით** — სტატუსი მხოლოდ ჩვენი ბაზიდან
 * იკითხება. მისამართში order_ref კი არა, ერთჯერადი ტოკენია: კოდი მეგობრის
 * კოდადაც ვრცელდება და მარტო მას წვდომა არ უნდა ჰქონდეს.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTexts();
  return { title: t(texts, "payment.status.seo.title"), robots: { index: false } };
}

type View = "success" | "pending" | "failed" | "notfound";

export default async function PaymentStatusPage(
  props: PageProps<"/payment/status">,
) {
  const searchParams = await props.searchParams;
  /* პრივატულობა (2026-09-03): ძირითადი გზა httpOnly cookie-ა (return/route.ts);
     ?t= მხოლოდ ძველი ბმულების fallback-ია და StatusCleanup მაშინვე შლის
     URL-იდან + cookie-ში გადააქვს. ორივე მნიშვნელობა ფორმატით მოწმდება. */
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(RETURN_TOKEN_COOKIE)?.value ?? "";
  const rawQueryToken = typeof searchParams.t === "string" ? searchParams.t : "";
  const legacyToken = RETURN_TOKEN_RE.test(rawQueryToken) ? rawQueryToken : "";
  const token = RETURN_TOKEN_RE.test(cookieToken) ? cookieToken : legacyToken;
  const texts = await getSiteTexts();

  const payment = token ? await findPaymentByReturnToken(token) : null;
  const target = payment ? await findOrderByRef(payment.orderRef) : null;

  /* შეკვეთა უკვე აქტიურია → წარმატება, თუნდაც payments ჯერ „created" იყოს
     (ადმინმა ხელით დაადასტურა, ან callback-ი ჯერ ჩაიწერება) */
  const targetSettled =
    target?.status === "active" || target?.status === "confirmed";

  const view: View = !payment
    ? "notfound"
    : payment.status === "paid" || targetSettled
      ? "success"
      : payment.status === "created"
        ? "pending"
        : "failed";

  const settings = view === "failed" ? await getPricingSettings() : null;

  return (
    <Section tone="cream">
      <StatusCleanup
        legacyToken={legacyToken}
        finished={view === "success" || view === "failed"}
      />
      {/* Purchase — ერთადერთი „ფული რეალურად დაჯდა" წერტილი კლიენტში.
          ორმაგი guard კომპონენტშივეა (StatusPoller-ის refresh მრავალჯერ არენდერებს) */}
      {view === "success" && payment ? (
        <TrackPurchase
          orderRef={payment.orderRef}
          valueTetri={payment.amountGel}
          category={purchasePixelMeta(payment.orderRef).category}
          name={target?.title ?? payment.orderRef}
          ids={[purchasePixelMeta(payment.orderRef).id]}
          quizClub={target?.quizClub ?? null}
        />
      ) : null}
      <div className="mx-auto max-w-xl">
        <Card>
          <h1 className="text-h2 font-bold text-green-dark">
            {t(texts, `payment.status.${view}.title`)}
          </h1>
          <p className="mt-3 leading-7 text-ink">
            {t(texts, `payment.status.${view}.body`)}
          </p>

          {payment ? (
            <dl className="mt-5 flex flex-col gap-1.5 rounded-card border border-line bg-white px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">კოდი</dt>
                <dd className="font-mono font-bold text-ink">
                  {payment.orderRef}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">თანხა</dt>
                <dd className="font-bold text-ink">
                  {formatGel(payment.amountGel)}
                </dd>
              </div>
            </dl>
          ) : null}

          {view === "failed" && settings?.bankRequisites ? (
            <div className="mt-5 rounded-card border border-line bg-white px-4 py-3">
              <p className="eyebrow">გადარიცხვის რეკვიზიტები</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">
                {settings.bankRequisites}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <ButtonLink href="/account" variant="secondary">
              {t(texts, "payment.status.myOrders")}
            </ButtonLink>
          </div>
        </Card>

        {view === "pending" ? <StatusPoller token={token} /> : null}
      </div>
    </Section>
  );
}
