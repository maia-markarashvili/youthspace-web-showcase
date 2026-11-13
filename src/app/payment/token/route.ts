import { NextResponse } from "next/server";
import {
  RETURN_TOKEN_COOKIE,
  RETURN_TOKEN_MAX_AGE_S,
  RETURN_TOKEN_RE,
} from "@/lib/payment-return";

/**
 * დაბრუნების cookie-ის მართვა — ᲠᲝᲣᲢ-ᲰᲔᲜᲓᲚᲔᲠᲘ და არა server action:
 * action-ის პასუხი Next-ში გვერდის ავტომატურ ხელახალ რენდერს შეიცავს და
 * cookie-ის წაშლისას success-ეკრანი „ვერ მოიძებნა"-თი იცვლებოდა (ორივე
 * რეალურ გადახდაზე დაფიქსირებული ბაგი, 2026-09-03). ჩვეულებრივი fetch
 * გვერდს არ ეხება — ეკრანი რჩება, cookie კი მაშინვე იშლება.
 *
 * ოპერაციები same-origin fetch-ით, მხოლოდ ამ ერთი cookie-ს ეხება:
 *  · adopt — ძველი ?t= ბმულის ტოკენი cookie-ში (ფორმატის შემოწმებით);
 *  · clear — საბოლოო სტატუსზე (success/failed) მყისიერი წაშლა.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    /* ცუდი body → no-op პასუხი ქვემოთ */
  }
  const op =
    typeof body === "object" && body !== null && "op" in body
      ? (body as { op?: unknown }).op
      : null;

  const response = new NextResponse(null, { status: 204 });

  if (op === "clear") {
    response.cookies.set(RETURN_TOKEN_COOKIE, "", { path: "/payment", maxAge: 0 });
    return response;
  }
  if (op === "adopt") {
    const token =
      typeof body === "object" && body !== null && "token" in body
        ? (body as { token?: unknown }).token
        : null;
    if (typeof token === "string" && RETURN_TOKEN_RE.test(token)) {
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
  return response;
}
