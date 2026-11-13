import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import {
  type AdminRole,
  OWNER_ONLY_EXACT_PATHS,
  OWNER_ONLY_PREFIXES,
  homeForRole,
  normalizeRole,
  safeAdminPath,
} from "@/lib/auth/roles";

/**
 * Admin-მარშრუტების ოპტიმისტური დაცვა (Next 16: middleware → proxy).
 * მხოლოდ cookie-ის ვალიდურობასა და როლს ამოწმებს — ნამდვილი დაცვა DAL-შია
 * (lib/auth/session.ts → loadAdmin/verifyOwner/requireOwner/verifyStaff/
 * requireStaff ყველა გვერდზე/action-ში). Server Action-ები ცალკე მარშრუტი
 * არაა (POST იმ გვერდზე, სადაც გამოიყენება), ამიტომ როლის რეალური კონტროლი
 * აქ **ვერასდროს** იქნება საკმარისი — მხოლოდ GET-ნავიგაციის მოხერხებულობაა.
 * proxy განზრახ არ იზიარებს session.ts-ს (server-only/headers მოდულებია).
 */
const COOKIE_NAME = "admin_session";

function isOwnerOnlyPath(pathname: string): boolean {
  if ((OWNER_ONLY_EXACT_PATHS as readonly string[]).includes(pathname)) {
    return true;
  }
  return OWNER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;

  let role: AdminRole | null = null;
  let staleToken = false;
  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ["HS256"],
      });
      /* ⚠ JWT-ის role claim მხოლოდ ამ ოპტიმისტური რედირექტისთვისაა — ცოცხალ
         დეაქტივაციას/როლის ცვლილებას ვერ ხედავს (ის loadAdmin()-ის საქმეა).
         `ver` claim-ის არარსებობა = admin-როლების დამატებამდე (Stage 3-მდე)
         გაცემული ძველი cookie — მას აქაც და loadAdmin()-შიც სესია არ არის
         უნდა ეთვლებოდეს, თორემ normalizeRole-ის fail-closed default
         ("reception") მას ცრუდ ავთენტიფიცირებულად აჩვენებდა, loadAdmin()
         კი ver-ის შეუსაბამობაზე მაინც უარყოფდა — login↔desk უსასრულო
         რედირექტი (ERR_TOO_MANY_REDIRECTS) */
      const raw = payload as { role?: unknown; ver?: unknown };
      if (typeof raw.ver === "number") {
        role = normalizeRole(raw.role);
      } else {
        staleToken = true;
      }
    } catch {
      /* ვადაგასული/გაყალბებული cookie = სესია არ არის */
    }
  }

  /* ⚠ „უკვე შესულია → login-იდან დაშბორდზე" გადამისამართება განზრახ **არ**
     ხდება აქ (JWT-ის ზედაპირული როლით) - login/page.tsx-ში, getSession()-ის
     DB-დადასტურებული შედეგით ხდება. თუ ორივე შრეს ეს გადაწყვეტილება
     დამოუკიდებლად მიეღო სხვადასხვა წყაროზე დაყრდნობით (proxy - ტოკენი,
     DAL - ბაზა), token_version-ის შეუსაბამობისას ისინი ერთმანეთს
     დაუპირისპირდებოდნენ - login↔დანიშნულების გვერდი უსასრულო რედირექტი. */
  let response: NextResponse;
  if (!role && !isLoginPage) {
    /* დანიშნულება login-ს გადაეცემა (QR-სკანი სესიის გარეშე → შესვლის
       მერე იმავე scan-მისამართზე დაბრუნება); ფილტრი roles.ts-შია */
    const loginUrl = new URL("/admin/login", request.url);
    const next = safeAdminPath(pathname + request.nextUrl.search);
    if (next) loginUrl.searchParams.set("next", next);
    response = NextResponse.redirect(loginUrl);
  } else if (role && role !== "admin" && isOwnerOnlyPath(pathname)) {
    response = NextResponse.redirect(new URL(homeForRole(role), request.url));
  } else {
    response = NextResponse.next();
  }
  if (staleToken) response.cookies.delete(COOKIE_NAME);
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
