/**
 * ქვიზის კონტექსტი ყიდვამდე/რეგისტრაციამდე (§12 attribution).
 * ⚠ node-იმპორტების გარეშე - client-ფორმებიც და server action-ებიც იყენებენ.
 *
 * ნაკადი: შედეგის ბარათი → `/courses/<slug>?src=quiz&club=<winner>#buy` →
 * ლენდინგი searchParams-იდან ფორმას hidden ველებად აწვდის → action
 * `bookings.attribution` / `subscriptions.attribution`-ში წერს
 * `{ source: "quiz", quiz_club: "<slug>" }` → ადმინი ჩიპად აჩვენებს, რომ
 * ღია კარზე პერსონალმა იცოდეს, რომელი კლუბი ურჩია ტესტმა.
 */

export const QUIZ_SOURCE = "quiz";

/** კლუბის slug-ის ფორმა - სხვა არაფერი გადის ბაზამდე */
const CLUB_SLUG_RE = /^[a-z0-9-]{1,40}$/;

export type QuizAttribution = {
  source: typeof QUIZ_SOURCE;
  quiz_club: string;
};

type SearchParams = Record<string, string | string[] | undefined> | undefined;

/** searchParams → კლუბის slug; მხოლოდ `src=quiz`-თან ერთად და უსაფრთხო ფორმატით */
export function quizClubFromSearchParams(params: SearchParams): string | null {
  if (!params) return null;
  const { src, club } = params;
  if (src !== QUIZ_SOURCE || typeof club !== "string") return null;
  return CLUB_SLUG_RE.test(club) ? club : null;
}

/** ფორმის hidden ველები → attribution jsonb; null = ქვიზიდან არ მოსულა */
export function quizAttributionFromForm(
  src: unknown,
  club: unknown,
): QuizAttribution | null {
  if (src !== QUIZ_SOURCE) return null;
  if (typeof club !== "string" || !CLUB_SLUG_RE.test(club)) return null;
  return { source: QUIZ_SOURCE, quiz_club: club };
}

/** attribution jsonb → slug (ადმინის ჩიპი); უცხო/ცარიელ მნიშვნელობაზე null */
export function quizClubFromAttribution(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { source?: unknown; quiz_club?: unknown };
  if (record.source !== QUIZ_SOURCE) return null;
  return typeof record.quiz_club === "string" &&
    CLUB_SLUG_RE.test(record.quiz_club)
    ? record.quiz_club
    : null;
}

/** ბმულს ქვიზის პარამეტრები ემატება; ანკერი (#join) query-ს **შემდეგ** დგას */
export function withQuizParams(path: string, club: string, hash?: string): string {
  const query = `?src=${QUIZ_SOURCE}&club=${encodeURIComponent(club)}`;
  return `${path}${query}${hash ? `#${hash}` : ""}`;
}
