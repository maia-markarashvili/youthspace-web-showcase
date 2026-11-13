import "server-only";
import { createDb, type Db } from "./connect";
import * as schema from "./schema";

/**
 * აპლიკაციის DB singleton.
 *
 * ინიციალიზაცია **ლენივია** (პირველ query-ზე) — build-ის დროს გვერდების
 * მოდულები DATABASE_URL-ის გარეშეც უნდა იტვირთებოდეს; დრაივერის არჩევა
 * (Neon ან ლოკალური PGlite) ხდება მხოლოდ რეალურ request-ზე (connect.ts).
 */
const globalForDb = globalThis as unknown as { __youthspaceDb?: Db };

function getDb(): Db {
  if (!globalForDb.__youthspaceDb) {
    globalForDb.__youthspaceDb = createDb();
  }
  return globalForDb.__youthspaceDb;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

export { schema };
