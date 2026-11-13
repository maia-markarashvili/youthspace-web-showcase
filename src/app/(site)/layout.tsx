import { cookies } from "next/headers";
import { ConsentBanner } from "@/components/consent-banner";
import { MetaPixel } from "@/components/meta-pixel";
import { SiteShell } from "@/components/site-shell";
import { CONSENT_COOKIE, parseConsent } from "@/lib/analytics-consent";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { toggleOn } from "@/lib/site-texts";

/** ტექსტ-override-ები DB-იდან ყოველ მოთხოვნაზე იკითხება */
export const dynamic = "force-dynamic";

/** საჯარო საიტის გარსი — route group URL-ს არ ცვლის */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* ბანერის flash-ის თავიდან ასაცილებლად თანხმობა სერვერზევე იკითხება;
     getSiteTexts React.cache-ითაა - SiteShell-ის SELECT-თან დედუპდება */
  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
  const bannerEnabled = toggleOn(await getSiteTexts(), "shared.cookies.banner");
  return (
    <>
      <SiteShell>{children}</SiteShell>
      <MetaPixel implicitConsent={!bannerEnabled} />
      <ConsentBanner enabled={bannerEnabled} initialConsent={consent} />
    </>
  );
}
