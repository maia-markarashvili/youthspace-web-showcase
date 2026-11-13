"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * პრივატულობის ფოთოლი-კომპონენტი (2026-09-03) — გვერდი server component-ად
 * რჩება. სამი მოვალეობა:
 *
 * 1. ?t= fallback-ბმულზე useLayoutEffect-ით მყისიერი strip — layout-ეფექტები
 *    ყველა passive-ეფექტზე (Meta/GA ივენთებზე) ადრეა, ე.ი. ტოკენი
 *    dl/page_location-ში ვერასდროს ხვდება.
 * 2. იმავე fallback-ზე ტოკენი httpOnly cookie-ში გადადის და router.replace()
 *    URL-ს კანონიკურად ასუფთავებს (მარტო history.replaceState-ს router
 *    თავისი state-იდან აღადგენდა — ნაპოვნი და გატესტილი).
 * 3. საბოლოო სტატუსზე (success/failed) cookie მაშინვე იშლება.
 *
 * ⚠ cookie-ოპერაციები ᲠᲝᲣᲢ-ᲰᲔᲜᲓᲚᲔᲠᲘᲡ fetch-ითაა (/payment/token) და არა
 * server action-ით: action-ის პასუხი გვერდის ავტომატურ ხელახალ რენდერს
 * შეიცავს და cookie-ის წაშლისას success-ეკრანი „ვერ მოიძებნა"-თი
 * იცვლებოდა (ორივე რეალურ გადახდაზე დაფიქსირდა, 2026-09-03). fetch
 * გვერდს არ ეხება — ეკრანი რჩება.
 */

function stripTokenFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("t")) return;
  url.searchParams.delete("t");
  /* App Router-ის შიდა state უცვლელად გადადის */
  window.history.replaceState(
    window.history.state,
    "",
    url.pathname + (url.searchParams.size ? `?${url.searchParams}` : ""),
  );
}

function tokenOp(body: { op: "adopt"; token: string } | { op: "clear" }) {
  return fetch("/payment/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export function StatusCleanup({
  legacyToken,
  finished,
}: {
  /** ?t=-დან მოსული ვალიდური ტოკენი (cookie-გზაზე ცარიელი) */
  legacyToken: string;
  /** view === success | failed — cookie-ის წაშლის დროა */
  finished: boolean;
}) {
  const router = useRouter();
  const adopted = useRef(false);
  const cleared = useRef(false);

  useLayoutEffect(() => {
    stripTokenFromUrl();
  }, []);

  /* fallback-გზა: ტოკენი cookie-ში → URL კანონიკურად სუფთავდება.
     replace-ის შემდგომ რენდერზე legacyToken ცარიელდება და ქვედა ეფექტი
     cookie-ს შლის (თუ სტატუსი საბოლოოა). */
  useEffect(() => {
    if (!legacyToken || adopted.current) return;
    adopted.current = true;
    void tokenOp({ op: "adopt", token: legacyToken }).then(() => {
      router.replace("/payment/status", { scroll: false });
    });
  }, [legacyToken, router]);

  /* საბოლოო სტატუსი სუფთა URL-ით → cookie იშლება; ეკრანი უცვლელი რჩება */
  useEffect(() => {
    if (!finished || legacyToken || cleared.current) return;
    cleared.current = true;
    void tokenOp({ op: "clear" });
  }, [finished, legacyToken]);

  return null;
}
