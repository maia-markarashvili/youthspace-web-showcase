import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getAccount } from "@/lib/auth/account-session";
import { db } from "@/lib/db";
import { accountProfiles } from "@/lib/db/schema";
import { toGeorgianMsisdn } from "@/lib/phone";

/**
 * ყიდვისას პროფილის მიბმა (§20, M5) — ერთადერთი ადგილი, სადაც ყიდვის
 * action-ები `profileId`-ს იღებენ.
 *
 * ქცევა:
 *  · სტუმარი (შესული არ არის) → `null` — ყიდვა ძველებურად მუშაობს;
 *  · შესული, აირჩია პროფილი → იმ პროფილის id, **თუ ის მისია**;
 *  · შესული, აირჩია „სხვა ადამიანი" (`new`) → იქმნება ახალი child-პროფილი
 *    ფორმაში შეყვანილი სახელით/ტელეფონით/მეილით და ებმება ყიდვას;
 *  · შესული, არჩევანის გარეშე → საკუთარი (self) პროფილი, რომ ყიდვა
 *    კაბინეტში აუცილებლად გამოჩნდეს.
 *
 * ⚠ hidden ველს არასდროს ვენდობით: მფლობელობა ბაზაში, `accountId`-თან
 * ერთად მოწმდება — სხვისი პროფილის id-ის გაგზავნა უშედეგოა (→ self/null).
 */

export const NEW_PROFILE_VALUE = "new";

export async function resolveProfileId(input: {
  raw: FormDataEntryValue | null | undefined;
  /** „ახალი პროფილის" შესაქმნელად — action-ში უკვე ვალიდირებული ველები */
  fallback: { fullName: string; phone?: string | null; email?: string | null };
}): Promise<string | null> {
  const account = await getAccount();
  if (!account || account.status !== "active") return null;

  const profileId = await resolveOwnedProfileId(account.accountId, input);
  await backfillProfilePhone(profileId, account.accountId, input.fallback.phone);
  return profileId;
}

async function resolveOwnedProfileId(
  accountId: string,
  input: {
    raw: FormDataEntryValue | null | undefined;
    fallback: { fullName: string; phone?: string | null; email?: string | null };
  },
): Promise<string | null> {
  const raw = String(input.raw ?? "").trim();

  if (raw && raw !== NEW_PROFILE_VALUE) {
    if (!z.uuid().safeParse(raw).success) return selfProfileId(accountId);
    const [owned] = await db
      .select({ id: accountProfiles.id })
      .from(accountProfiles)
      .where(
        and(
          eq(accountProfiles.id, raw),
          eq(accountProfiles.accountId, accountId),
        ),
      )
      .limit(1);
    /* სხვისი/არარსებული id → self (ჩუმად), რომ ყიდვა მაინც არ დაიკარგოს */
    return owned?.id ?? selfProfileId(accountId);
  }

  if (raw === NEW_PROFILE_VALUE) {
    const name = input.fallback.fullName.trim();
    if (name.length < 2) return selfProfileId(accountId);

    /* იმავე სახელის პროფილი უკვე თუ არსებობს — ვიყენებთ და ახალს არ ვქმნით.
       ეს ყიდვის ხელახლა ცდას (მაგ. ადგილები ამოიწურა → თავიდან) დუბლიკატების
       გარეშე ატარებს: profileId ყიდვამდე იქმნება, ყიდვა კი შეიძლება ჩავარდეს. */
    const [existing] = await db
      .select({ id: accountProfiles.id })
      .from(accountProfiles)
      .where(
        and(
          eq(accountProfiles.accountId, accountId),
          eq(accountProfiles.fullName, name),
        ),
      )
      .limit(1);
    if (existing) return existing.id;

    try {
      const [created] = await db
        .insert(accountProfiles)
        .values({
          accountId,
          fullName: name,
          phone: input.fallback.phone?.trim() || null,
          email: input.fallback.email?.trim().toLowerCase() || null,
          relationship: "child",
        })
        .returning({ id: accountProfiles.id });
      if (created) return created.id;
    } catch (error) {
      console.error("[purchase-profile] ახალი პროფილი ვერ შეიქმნა", error);
    }
    return selfProfileId(accountId);
  }

  return selfProfileId(accountId);
}

/**
 * ყიდვისას აკრეფილი ნომერი არჩეულ პროფილს ევსება — ოღონდ **მხოლოდ ცარიელს**:
 *  · არსებული ნომერი არასდროს გადაიწერება — ის მფლობელმა შეგნებულად ჩაწერა;
 *  · ეხება მხოლოდ account_profiles.phone-ს — accounts.phone და phoneVerifiedAt
 *    ვერიფიკაციის ლოგიკის ნაწილია (otp.ts, guest-ყიდვების მიბმა) და აქ არ ინახება;
 *  · მხოლოდ ვალიდური ქართული მობილური — იგივე ზღვარი, რაც კაბინეტის ფორმას
 *    (checkout-სქემები მხოლოდ სიგრძეს ამოწმებენ);
 *  · ჩავარდნა ყიდვას ვერ შეაჩერებს — ლოგი და გაგრძელება.
 */
async function backfillProfilePhone(
  profileId: string | null,
  accountId: string,
  rawPhone: string | null | undefined,
): Promise<void> {
  const phone = rawPhone?.trim() || null;
  if (!profileId || !phone || toGeorgianMsisdn(phone) === null) return;
  try {
    await db
      .update(accountProfiles)
      .set({ phone })
      .where(
        and(
          eq(accountProfiles.id, profileId),
          eq(accountProfiles.accountId, accountId),
          or(isNull(accountProfiles.phone), eq(accountProfiles.phone, "")),
        ),
      );
  } catch (error) {
    console.error("[purchase-profile] ნომრის შევსება პროფილში ჩავარდა", error);
  }
}

/** ანგარიშის self-პროფილი (რეგისტრაციისას ყოველთვის იქმნება) */
async function selfProfileId(accountId: string): Promise<string | null> {
  const [self] = await db
    .select({ id: accountProfiles.id })
    .from(accountProfiles)
    .where(
      and(
        eq(accountProfiles.accountId, accountId),
        eq(accountProfiles.relationship, "self"),
      ),
    )
    .limit(1);
  return self?.id ?? null;
}
