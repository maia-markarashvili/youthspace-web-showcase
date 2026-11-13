import type { Metadata } from "next";
import QRCode from "qrcode";
import { LogoMark } from "@/components/logo";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { getTicketView } from "@/lib/db/queries/ticket";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";
import { t } from "@/lib/site-texts";
import { verifyTicketToken } from "@/lib/ticket-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "QR-ბილეთი",
  robots: { index: false, follow: false },
};

/**
 * საჯარო QR-ბილეთი — მომხმარებელი მეილის ბმულიდან ხსნის და მისაღებში
 * ეკრანს აჩვენებს. QR-ში ადმინის deep-link წერია (/admin/desk?scan=<token>),
 * რომელიც staff-სესიის გარეშე არაფერს აჩვენებს. გვერდზე PII არ ჩანს -
 * მხოლოდ სახელის პირველი სიტყვა, სერვისი და კოდი.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const texts = await getSiteTexts();

  /* ტოკენის გამოცნობა ისედაც შეუძლებელია (HMAC), rate-limit უბრალოდ
     brute-force-ს აძვირებს; გადაჭარბებაზეც იგივე ზოგადი პასუხია */
  const withinLimit = checkRateLimit(await clientKey("ticket"), { limit: 30 });
  const ticket = withinLimit ? await verifyTicketToken(token) : null;
  const view = ticket ? await getTicketView(ticket.kind, ticket.id) : null;

  let body: React.ReactNode;
  if (!view) {
    body = (
      <p className="text-center text-sm leading-7 text-ink-muted">
        {t(texts, "ticket.invalid")}
      </p>
    );
  } else if (!view.active) {
    body = (
      <>
        <p className="text-center text-base font-bold text-ink">{view.title}</p>
        <p className="mt-3 text-center text-sm leading-7 text-ink-muted">
          {t(texts, "ticket.inactive")}
        </p>
      </>
    );
  } else {
    const qrSvg = await QRCode.toString(
      `${siteConfig.url}/admin/desk?scan=${token}`,
      { type: "svg", errorCorrectionLevel: "M", margin: 2 },
    );
    body = (
      <>
        <p className="text-center text-base font-bold text-ink">{view.title}</p>
        <p className="mt-1 text-center text-sm text-ink-muted">
          {view.firstName}
          {view.dateLabel ? ` · ${view.dateLabel}` : ""}
          {view.slotLabel ? ` · ${view.slotLabel}` : ""}
        </p>
        {view.note ? (
          <p className="mt-1 text-center text-xs text-ink-muted">{view.note}</p>
        ) : null}
        <div
          aria-label="QR-კოდი"
          className="mx-auto mt-5 w-64 max-w-full rounded-card border border-line bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="mt-3 text-center font-mono text-sm font-bold tracking-wider text-green-dark">
          {view.orderRef}
        </p>
        <p className="mt-4 text-center text-sm leading-7 text-ink-muted">
          {t(texts, "ticket.hint")}
        </p>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-8 shadow-card">
        <div className="flex items-center justify-center gap-2.5">
          <LogoMark className="h-8 w-auto" />
          <div className="leading-tight">
            <p className="text-lg font-bold text-ink">{siteConfig.name}</p>
            <p className="text-xs font-semibold tracking-widest text-green-mid uppercase">
              {t(texts, "ticket.title")}
            </p>
          </div>
        </div>
        <div className="mt-6">{body}</div>
      </div>
    </div>
  );
}
