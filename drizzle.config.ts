import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL?.trim();

/**
 * DATABASE_URL-ის არსებობისას — Neon/Postgres; თორემ ლოკალური PGlite
 * (./.pglite/data), იგივე fallback რაც აპლიკაციაში (src/lib/db/connect.ts).
 * შენიშვნა: drizzle-kit studio PGlite-ზე ვერ გაეშვება dev სერვერთან
 * ერთდროულად — PGlite ერთ პროცესს უჭერს მხარს.
 */
export default defineConfig(
  url && !url.startsWith("pglite:")
    ? {
        schema: "./src/lib/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        dbCredentials: { url },
        verbose: true,
        strict: true,
      }
    : {
        schema: "./src/lib/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        driver: "pglite",
        dbCredentials: {
          url: url?.startsWith("pglite:")
            ? url.slice("pglite:".length)
            : "./.pglite/data",
        },
        verbose: true,
        strict: true,
      },
);
