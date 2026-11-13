/**
 * მიგრაციების გაშვება — მუშაობს ორივე დრაივერზე:
 *  · Neon/Postgres (DATABASE_URL) — drizzle-orm/postgres-js/migrator
 *  · ლოკალური PGlite (fallback)  — drizzle-orm/pglite/migrator
 *
 * გაშვება:  npm run db:migrate
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { resolveDatabaseTarget } from "./connect";

const MIGRATIONS_FOLDER = "./drizzle";

async function main() {
  const target = resolveDatabaseTarget();

  if (target.kind === "pglite") {
    console.info(`→ მიგრაციები ლოკალურ PGlite ბაზაზე (${target.dataDir})`);
    const { mkdirSync } = await import("node:fs");
    mkdirSync(target.dataDir, { recursive: true }); // PGlite parent dir-ს არ ქმნის
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");

    const db = drizzle({ connection: { dataDir: target.dataDir } });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    await db.$client.close();
  } else {
    console.info("→ მიგრაციები Postgres/Neon ბაზაზე");
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");

    const client = postgres(target.url, { prepare: false, max: 1 });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    await client.end();
  }

  console.log("✓ მიგრაციები შესრულდა");
}

main().catch((error) => {
  console.error("✗ მიგრაცია ჩავარდა:", error);
  process.exitCode = 1;
});
