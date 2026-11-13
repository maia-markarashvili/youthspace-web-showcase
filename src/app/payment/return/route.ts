import { NextResponse } from "next/server";
import {
  RETURN_TOKEN_COOKIE,
  RETURN_TOKEN_MAX_AGE_S,
  RETURN_TOKEN_RE,
} from "@/lib/payment-return";
import { siteConfig } from "@/lib/site-config";

/**
 * Flitt-ის `response_url` — აქ ბრაუნდება ბრაუზერი გადახდის შემდეგ.
 *
 * Flitt ზოგ კონფიგურაციაში **POST-ს** აგზავნის, გვერდი (page.tsx) კი მხოლოდ
 * GET-ს ამუშავებს — ამიტომ ჯერ route handler-ია, რომელიც 303-ით (POST → GET)
 * სტატუსის გვერდზე გადაამისამართებს.
 *
 * პრივატულობა (2026-09-03): ტოკენი httpOnly cookie-ში იწერება და
 * გადამისამართება query-ს **გარეშე** ხდება — /payment/status-ის მისამართი
 * სუფთაა პირველივე მომენტიდან, GA/Meta ტოკენს ფიზიკურად ვერ ხედავს.
 * ფორმატი ჩაწერამდე მოწმდება; საბოლოო სტატუსზე cookie იშლება (actions.ts).
 *
 * ⚠ ეს გადამისამართება **სტატუსის წყარო არ არის** — მას მომხმარებელი ადვილად
 * გააყალბებდა. სტატუსი ჩვენი ბაზიდან იკითხება, ტოკენით.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handle(request: Request): Response {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const valid = RETURN_TOKEN_RE.test(token);

  /* ⚠ ტოკენი ორივე გზით მიდის (2026-09-03, cookie-only-ის რეგრესიის შემდეგ):
     - httpOnly cookie — პირველადი: როცა მუშაობს, URL სუფთაა თავიდანვე;
     - ?t= query — fallback: Flitt-ის რეალური cross-site POST + 303 redirect +
       Cloudflare-ის პირობებში SameSite=Lax cookie ხანდახან status-გვერდამდე
       ვერ აღწევს (ცოცხალზე დაფიქსირდა). ?t= საიმედოა; StatusCleanup მას
       PageView-მდე ასუფთავებს, ე.ი. GA/Meta-მდე ტოკენი მაინც ვერ ხვდება. */
  const target = valid
    ? `${siteConfig.url}/payment/status?t=${encodeURIComponent(token)}`
    : `${siteConfig.url}/payment/status`;
  const response = NextResponse.redirect(target, 303);
  if (valid) {
    response.cookies.set(RETURN_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/payment",
      maxAge: RETURN_TOKEN_MAX_AGE_S,
    });
  }
  return response;
}

export const GET = handle;
export const POST = handle;
