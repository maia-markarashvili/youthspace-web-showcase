/**
 * ადმინის როლები — სუფთა მოდული (server-only არაა), რადგან `proxy.ts`-საც
 * სჭირდება (proxy განზრახ არ იზიარებს session.ts-ს — server-only/headers
 * მოდულებია, `src/proxy.ts`-ის თავზე ახსნილია).
 *
 * ⚠ როლის ნამდვილი შემოწმება არასდროს proxy-შია — მხოლოდ session.ts-ის
 * DAL-ში (loadAdmin ბაზიდან კითხულობს). აქაური helper-ები UI/რედირექტების
 * გამოსათვლელად გამოიყენება ორივე მხარეს, რომ ლოგიკა ერთხელ იყოს დაწერილი.
 */

export const ADMIN_ROLES = ["admin", "reception"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** უცნობი/დაზიანებული როლი → ყველაზე დაბალი უფლება (fail-closed) */
export function normalizeRole(raw: unknown): AdminRole {
  return raw === "admin" ? "admin" : "reception";
}

/** როლის საწყისი გვერდი — შესვლის/არასაკმარისი-უფლების რედირექტისთვის */
export function homeForRole(role: AdminRole): string {
  return role === "admin" ? "/admin" : "/admin/desk";
}

/**
 * მისამართები, რომლებზეც reception-ს GET-ნავიგაციისას ვერ მიუწვდება
 * (proxy.ts-ის ოპტიმისტური რედირექცია — UX, არა უსაფრთხოება).
 * `/admin/desk` და `/admin/login` განზრახ არ ჩანს აქ — ორივესთვის ღიაა.
 */
export const OWNER_ONLY_PREFIXES = [
  "/admin/leads",
  "/admin/orders",
  "/admin/cancellations",
  "/admin/visits",
  "/admin/clubs",
  "/admin/courses",
  "/admin/spaces",
  "/admin/dropin",
  "/admin/calendar",
  "/admin/pricing",
  "/admin/hero",
  "/admin/texts",
  "/admin/content",
  "/admin/subscribers",
  "/admin/users",
  "/admin/export",
] as const;

/** ზუსტად `/admin` (დაშბორდი) — პრეფიქსად რომ არ ჩაითვალოს `/admin/desk`-ში */
export const OWNER_ONLY_EXACT_PATHS = ["/admin"] as const;

/**
 * login-ის `next`-პარამეტრის მკაცრი ფილტრი (open redirect-ის საწინააღმდეგოდ):
 * მხოლოდ შიდა /admin-გზა ერთი წამყვანი `/`-ით. QR-სკანი (`/admin/desk?scan=…`)
 * ვადაგასული სესიისას login-ის მერე ამით უბრუნდება თავის მისამართს.
 */
export function safeAdminPath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) {
    return null;
  }
  if (/[\\\r\n]/.test(raw)) return null;
  if (!/^\/admin(\/|\?|$)/.test(raw)) return null;
  return raw;
}
