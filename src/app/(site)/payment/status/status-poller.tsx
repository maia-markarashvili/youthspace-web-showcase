"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { reconcilePayment } from "./actions";

/**
 * „მუშავდება" მდგომარეობაში გვერდი თავად ნახლდება (მაქს. ~30 წამი).
 * ყოველ ტიკზე ჯერ სერვერი Flitt-ში აქტიურად ამოწმებს სტატუსს
 * (reconcilePayment) — callback რომ დაიკარგოს ან დაგვიანდეს,
 * დადასტურება მაინც წამებში ჩანს.
 */
export function StatusPoller({
  token,
  intervalMs = 3000,
  maxTries = 10,
}: {
  token: string;
  intervalMs?: number;
  maxTries?: number;
}) {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= maxTries) return;
    const timer = setTimeout(async () => {
      try {
        await reconcilePayment(token);
      } catch {
        /* შემდეგი ტიკი ისევ სცდის */
      }
      setTries((n) => n + 1);
      router.refresh();
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [tries, maxTries, intervalMs, router, token]);

  return null;
}
