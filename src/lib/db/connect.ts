import { mkdirSync } from "node:fs";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * დრაივერის არჩევა:
 *  · DATABASE_URL = postgres://…  → Neon/Postgres (postgres.js, prepare:false)
 *  · DATABASE_URL = pglite:<dir>  → ლოკალური embedded Postgres (PGlite)
 *  · DATABASE_URL ცარიელი        → dev-ში PGlite fallback (./.pglite/data),
 *                                   production-ში — მკაფიო შეცდომა
 *
 * ეს ფაილი განზრახ არ იყენებს "server-only"-ს — seed/migrate სკრიპტები
 * tsx-ით ეშვება Next-ის გარეთ. აპლიკაცია მას მხოლოდ index.ts-ის
 * (server-only) გავლით იყენებს.
 */
export const PGLITE_DIR = "./.pglite/data";

/** ორივე დრაივერი Postgres-ის იდენტურ query API-ს იძლევა — ტიპად
 *  postgres-js ვიყენებთ, რომ queries-ის ტიპები დრაივერზე არ იყოს
 *  დამოკიდებული. */
export type Db = PostgresJsDatabase<typeof schema>;

export function resolveDatabaseTarget():
  | { kind: "postgres"; url: string }
  | { kind: "pglite"; dataDir: string } {
  const url = process.env.DATABASE_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  /* production-ში მხოლოდ რეალური Postgres — pglite: პრეფიქსი ან ცარიელი URL
     ხმამაღალი შეცდომაა. თორემ შემთხვევით ჩაწერილი pglite:-ით აპლიკაცია
     ეფემერულ ლოკალურ ბაზაზე გადავიდოდა და მონაცემები redeploy-ზე დაიკარგებოდა. */
  if (isProduction && (!url || url.startsWith("pglite:"))) {
    throw new Error(
      "production-ში DATABASE_URL აუცილებელია და უნდა იყოს Neon-ის postgres:// მისამართი (pglite: აკრძალულია)",
    );
  }

  if (url?.startsWith("pglite:")) {
    return { kind: "pglite", dataDir: url.slice("pglite:".length) };
  }
  if (url) {
    return { kind: "postgres", url };
  }
  return { kind: "pglite", dataDir: PGLITE_DIR };
}

export function createDb(options?: { maxConnections?: number }): Db {
  const target = resolveDatabaseTarget();

  if (target.kind === "pglite") {
    console.info(`[db] ლოკალური PGlite dev ბაზა → ${target.dataDir}`);
    mkdirSync(target.dataDir, { recursive: true }); // PGlite parent dir-ს არ ქმნის
    return drizzlePglite({
      connection: { dataDir: target.dataDir },
      schema,
    }) as unknown as Db;
  }

  const client = postgres(target.url, {
    prepare: false, // Neon pooled endpoint = PgBouncer transaction mode
    /* დაბალ ტრაფიკზე ცოტა თბილი სოკეტი ჯობს ბევრ ცივს: ყოველი ახალი კავშირი
       TCP+TLS+SCRAM+pg_type handshake-ს იხდის ბაზამდე. idle_timeout 20წმ იყო
       და თითქმის ყოველი ვიზიტორი ხელახლა აწყობდა კავშირებს (TTFB-აუდიტი,
       2026-09-02); 300წმ სოკეტებს მოთხოვნებს შორის აცოცხლებს (postgres.js-ის
       default keep_alive=60წმ NAT-ჩავარდნისგან იცავს). connect_timeout default
       30წმ იყო - გაჭედილი handshake გვერდს ამდენ ხანს ვეღარ დაიჭერს. */
    max: options?.maxConnections ?? 5,
    idle_timeout: 300,
    connect_timeout: 10,
  });
  return drizzlePostgres(client, { schema });
}

/** სკრიპტებისთვის (seed/migrate) — პროცესის დასრულებამდე კავშირის დახურვა */
export async function closeDb(db: Db) {
  const client = (db as unknown as { $client?: unknown }).$client as
    | { end?: () => Promise<void>; close?: () => Promise<void> }
    | undefined;

  if (client?.end) await client.end();
  else if (client?.close) await client.close();
}
