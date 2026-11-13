import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { createAccountSession } from "@/lib/auth/account-session";
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  exchangeGoogleCode,
  type GoogleProfile,
} from "@/lib/auth/google";
import { db } from "@/lib/db";
import { accountProfiles, accounts } from "@/lib/db/schema";
import { siteConfig } from "@/lib/site-config";

/**
 * Google-იდან დაბრუნება: `state`-ის შემოწმება (CSRF), კოდის გაცვლა და
 * ანგარიშში შესვლა/დარეგისტრირება.
 *
 * ⚠ უსაფრთხოების ბირთვი: არსებულ (პაროლიან) ანგარიშთან დაკავშირება ხდება
 * **მხოლოდ** მაშინ, თუ Google-მა `email_verified: true` დააბრუნა. თორემ
 * დაუდასტურებელი მისამართის მქონე Google-ანგარიშით სხვისი ანგარიშის
 * მითვისება იქნებოდა შესაძლებელი.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(reason: string): Response {
  return Response.redirect(
    `${siteConfig.url}/login?error=${encodeURIComponent(reason)}`,
    303,
  );
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  /* მომხმარებელმა Google-ზე „უარი" დააჭირა — ჩუმად ვაბრუნებთ */
  if (url.searchParams.get("error")) return fail("google_cancelled");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(GOOGLE_VERIFIER_COOKIE)?.value;

  /* ერთჯერადია — შედეგის მიუხედავად ვშლით */
  cookieStore.delete(GOOGLE_STATE_COOKIE);
  cookieStore.delete(GOOGLE_VERIFIER_COOKIE);

  if (!code || !state || !expectedState || !verifier) return fail("google");
  if (state !== expectedState) return fail("google");

  const profile = await exchangeGoogleCode({ code, verifier });
  if (!profile) return fail("google");

  try {
    const accountId = await upsertGoogleAccount(profile);
    if (!accountId) return fail("google_link");

    const [row] = await db
      .select({ tokenVersion: accounts.tokenVersion })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    await createAccountSession({ accountId, ver: row?.tokenVersion ?? 0 });
  } catch (error) {
    console.error("[google] ანგარიშის შექმნა/შესვლა ჩავარდა", error);
    return fail("google");
  }

  return Response.redirect(`${siteConfig.url}/account`, 303);
}

/**
 * აბრუნებს ანგარიშის id-ს, ან `null`-ს, თუ დაკავშირება დაუშვებელია
 * (დაუდასტურებელი Google-მეილი არსებულ ანგარიშზე, ან გათიშული ანგარიში).
 */
async function upsertGoogleAccount(
  profile: GoogleProfile,
): Promise<string | null> {
  const [byGoogleId] = await db
    .select({ id: accounts.id, status: accounts.status })
    .from(accounts)
    .where(eq(accounts.googleId, profile.sub))
    .limit(1);

  if (byGoogleId) {
    if (byGoogleId.status === "disabled") return null;
    return byGoogleId.id;
  }

  const [byEmail] = await db
    .select({
      id: accounts.id,
      status: accounts.status,
      emailVerifiedAt: accounts.emailVerifiedAt,
    })
    .from(accounts)
    .where(eq(accounts.email, profile.email))
    .limit(1);

  if (byEmail) {
    if (byEmail.status === "disabled") return null;
    /* არსებულ ანგარიშს მხოლოდ დადასტურებული Google-მეილი უკავშირდება */
    if (!profile.emailVerified) return null;

    /**
     * ⚠ Pre-hijacking-ის დაცვა (უსაფრთხოების აუდიტი, 2026-08-18):
     * თუ ეს რიგი მეილს **არასდროს დაუდასტურებია**, ის შეიძლება „დაჯავშნილი"
     * იყოს თავდამსხმელის მიერ — ვიღაცამ სხვისი მეილით დაარეგისტრირა ანგარიში
     * (და ცოცხალი 30-დღიანი სესიაც აქვს). ახლა ნამდვილი მფლობელი Google-ით
     * შემოდის იმავე რიგში. ამიტომ შერწყმისას:
     *   · პაროლი უქმდება (passwordHash = null) — თავდამსხმელი ვეღარ შედის;
     *   · tokenVersion იზრდება — მისი ცოცხალი cookie მყისვე კვდება.
     * დადასტურებულ რიგზე (მფლობელმა თავად დაადასტურა) არაფერს ვცვლით —
     * ის უბრალოდ Google-საც იმაგრებს და პაროლიც უნარჩუნდება.
     */
    const wasNeverVerified = byEmail.emailVerifiedAt === null;

    await db
      .update(accounts)
      .set({
        googleId: profile.sub,
        emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
        status: "active",
        ...(wasNeverVerified
          ? {
              passwordHash: null,
              tokenVersion: sql`${accounts.tokenVersion} + 1`,
            }
          : {}),
      })
      .where(eq(accounts.id, byEmail.id));
    return byEmail.id;
  }

  /* ახალი ანგარიში — Google-ით შესული პაროლის გარეშეა (passwordHash null) */
  const fullName =
    profile.name?.trim() || profile.email.split("@")[0] || "მომხმარებელი";

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(accounts)
      .values({
        email: profile.email,
        googleId: profile.sub,
        fullName,
        passwordHash: null,
        phone: null,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        status: "active",
      })
      .returning({ id: accounts.id });
    if (!created) throw new Error("accounts insert failed");

    await tx.insert(accountProfiles).values({
      accountId: created.id,
      fullName,
      email: profile.email,
      relationship: "self",
    });

    return created.id;
  });
}
