/**
 * Neon keep-alive — **გამორთულია** (მფლობელის გადაწყვეტილება, 2026-09-13).
 *
 * იდეა იყო: ყოველ 4 წუთში `select 1` 09:00-23:00 (თბილისით) კომპუტს თბილად
 * ინახავდა, რომ ვიზიტორს Neon-ის გაღვიძება (~1-2წმ) არ გადახდოდა.
 * პრაქტიკამ სხვა აჩვენა: ყოველი შეკითხვა autosuspend-ის ტაიმერს ახლიდან
 * უშვებს, ანუ 14 აქტიური საათი დღეში ≈ 14 compute-საათი დღეში - 13 დღეში
 * Free-გეგმის თვიური ლიმიტის (191.9 სთ) ნახევარზე მეტი დაიხარჯა.
 * მფლობელმა აირჩია ცივი სტარტის ფასი და არა ფასიან გეგმაზე გადასვლა.
 *
 * ⚠ ახლა **opt-in**-ია: default გამორთულია და ირთვება მხოლოდ ცხადად,
 * `NEON_KEEPALIVE=on`-ით (Railway → Variables, ბრჭყალების გარეშე + redeploy).
 * ძველი `NEON_KEEPALIVE=off` აღარაფერს ცვლის - „off" უბრალოდ არ არის „on".
 */

const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;
const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000;
const ACTIVE_FROM_HOUR = 9;
const ACTIVE_TO_HOUR = 23;

function tbilisiHour(): number {
  return new Date(Date.now() + TBILISI_OFFSET_MS).getUTCHours();
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  /* ⚠ ცხადი „on" აუცილებელია — ცვლადის არარსებობა = გამორთული */
  if (process.env.NEON_KEEPALIVE !== "on") return;
  if (!(process.env.DATABASE_URL ?? "").startsWith("postgres")) return;

  console.info(
    "[keepalive] ჩართულია (NEON_KEEPALIVE=on) — compute-საათები იხარჯება",
  );

  setInterval(async () => {
    const hour = tbilisiHour();
    if (hour < ACTIVE_FROM_HOUR || hour >= ACTIVE_TO_HOUR) return;
    try {
      /* lazy import — server-only მოდულები register-ის თავში არ გვჭირდება */
      const [{ db }, { sql }] = await Promise.all([
        import("@/lib/db"),
        import("drizzle-orm"),
      ]);
      await db.execute(sql`select 1`);
    } catch (error) {
      console.error("[keepalive] ჩავარდა", error);
    }
  }, KEEPALIVE_INTERVAL_MS);
}
