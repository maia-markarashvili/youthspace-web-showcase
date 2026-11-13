import { cookies } from "next/headers";
import { ConsentBanner } from "@/components/consent-banner";
import { MetaPixel } from "@/components/meta-pixel";
import { SiteShell } from "@/components/site-shell";
import { CONSENT_COOKIE, parseConsent } from "@/lib/analytics-consent";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { toggleOn } from "@/lib/site-texts";

/**
 * ლენდინგ-გვერდების გარსი (/clubs/[slug], /courses/[slug]) — იგივე სრული
 * ნავიგაცია (ჰედერი/ფუტერი/FAB), რაც მთელ საიტს აქვს (SiteShell), პლუს
 * Meta Pixel მხოლოდ ამ გვერდებზე (FB-რეკლამის დანიშნულების გვერდები).
 */

export const dynamic = "force-dynamic";

export default async function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
