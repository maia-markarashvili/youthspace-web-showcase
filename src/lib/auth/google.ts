import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

/**
 * Google-ით შესვლა — authorization code + PKCE, **ბიბლიოთეკის გარეშე**.
 *
 * რატომ ხელით: ნაკადი მოკლეა, კლიენტი კონფიდენციალურია (secret სერვერზეა),
 * `id_token` პირდაპირ Google-ის token endpoint-იდან, TLS-ით მოდის — ე.ი.
 * ხელმოწერის ცალკე გადამოწმება საჭირო არაა (Google-ის დოკუმენტაციის მიხედვით).
 * ეს პროექტი ისედაც თავად წერს ავტორიზაციას (next-auth-ის ნაცვლად jose),
 * ამიტომ ახალი dependency მხოლოდ supply-chain ზედაპირს გაზრდიდა.
 *
 * creds-ის გარეშე ყველაფერი უბრალოდ **გამორთულია** (`googleConfigured()` false)
 * — `mailConfigured()`/`smsConfigured()`/`flittMode()`-ის იგივე პრინციპი.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** state/code_verifier cookie-ები — მხოლოდ ნაკადის განმავლობაში ცოცხლობენ */
export const GOOGLE_STATE_COOKIE = "g_state";
export const GOOGLE_VERIFIER_COOKIE = "g_verifier";
export const GOOGLE_COOKIE_MAX_AGE = 10 * 60;

function config() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = serverEnv();
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET };
}

export function googleConfigured(): boolean {
  return config() !== null;
}

/** ზუსტად ეს მისამართი უნდა ეწეროს Google Console-ში (სიმბოლომდე) */
export function googleRedirectUri(): string {
  return `${siteConfig.url}/login/google/callback`;
}

/** base64url — PKCE-ს და state-ს ერთი ფორმატი */
function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export function createGoogleState(): { state: string; verifier: string } {
  return {
    state: base64url(randomBytes(32)),
    verifier: base64url(randomBytes(32)),
  };
}

/** PKCE S256 — challenge = base64url(sha256(verifier)) */
function codeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export function googleAuthUrl(input: {
  state: string;
  verifier: string;
}): string | null {
  const cfg = config();
  if (!cfg) return null;

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    code_challenge: codeChallenge(input.verifier),
    code_challenge_method: "S256",
    /* ანგარიშის ამორჩევა ყოველ ჯერზე — საერთო კომპიუტერზე მნიშვნელოვანია */
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  /** Google-ის მუდმივი იდენტიფიკატორი (`accounts.googleId`) */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

/** id_token-ის payload — ხელმოწერას არ ვამოწმებთ (იხ. ფაილის თავზე) */
function decodeIdToken(idToken: string): Record<string, unknown> | null {
  const part = idToken.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * კოდის გაცვლა პროფილზე. `null` = ნებისმიერი ჩავარდნა (ლოგში იწერება,
 * მომხმარებელს ერთი ზოგადი შეცდომა ხვდება — დეტალი არ უნდა გაჟონოს).
 */
export async function exchangeGoogleCode(input: {
  code: string;
  verifier: string;
}): Promise<GoogleProfile | null> {
  const cfg = config();
  if (!cfg) return null;

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code: input.code,
        code_verifier: input.verifier,
        grant_type: "authorization_code",
        redirect_uri: googleRedirectUri(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`[google] token endpoint HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { id_token?: string };
    if (!data.id_token) {
      console.error("[google] id_token არ დაბრუნდა");
      return null;
    }

    const payload = decodeIdToken(data.id_token);
    if (!payload) {
      console.error("[google] id_token ვერ წაიკითხა");
      return null;
    }

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!sub || !email) {
      console.error("[google] id_token-ში sub/email აკლია");
      return null;
    }

    return {
      sub,
      email: email.toLowerCase(),
      /* Google-ს ეს ველი bool-ად ან სტრიქონად მოაქვს */
      emailVerified:
        payload.email_verified === true || payload.email_verified === "true",
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch (error) {
    console.error("[google] კოდის გაცვლა ჩავარდა", error);
    return null;
  }
}
