import { cookies } from "next/headers";
import {
  GOOGLE_COOKIE_MAX_AGE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  createGoogleState,
  googleAuthUrl,
} from "@/lib/auth/google";
import { siteConfig } from "@/lib/site-config";

/**
 * Google-ით შესვლის დაწყება — `state` (CSRF) და PKCE `code_verifier` იქმნება,
 * ორივე მოკლევადიან httpOnly cookie-ში ინახება და მომხმარებელი Google-ზე
 * გადადის. creds-ის გარეშე უბრალოდ /login-ზე ბრუნდება.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { state, verifier } = createGoogleState();
  const url = googleAuthUrl({ state, verifier });

  if (!url) {
    return Response.redirect(`${siteConfig.url}/login?error=google`, 303);
  }

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: GOOGLE_COOKIE_MAX_AGE,
  };
  cookieStore.set(GOOGLE_STATE_COOKIE, state, options);
  cookieStore.set(GOOGLE_VERIFIER_COOKIE, verifier, options);

  return Response.redirect(url, 303);
}
