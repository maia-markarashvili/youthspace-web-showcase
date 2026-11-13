import "server-only";
import { z } from "zod";

/**
 * სერვერული env — ვალიდირდება პირველივე წაკითხვაზე.
 * კლიენტისთვის განკუთვნილი (NEXT_PUBLIC_*) ცვლადები აქ არ ჩანს — ისინი
 * build-ზე inline-დება და პირდაპირ process.env-იდან იკითხება (siteConfig).
 */
const serverEnvSchema = z.object({
  /** ცარიელი dev-ში ნიშნავს ლოკალურ PGlite fallback-ს (connect.ts);
   *  production-ში არარსებობა connect.ts-შივე ვარდება მკაფიო შეცდომით */
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  FLITT_MERCHANT_ID: z.string().optional(),
  FLITT_SECRET_KEY: z.string().optional(),
  /** "live" = ბარათის ღილაკი ყველას ჩანს; სხვა/ცარიელი = მხოლოდ ?pay=card-ით */
  FLITT_MODE: z.string().optional(),
  /** "1" = callback-ი მხოლოდ Flitt-ის IP-ებიდან მიიღება */
  FLITT_ENFORCE_IP: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().optional(),
  N8N_SECRET: z.string().optional(),
  /** ubill.dev SMS — ორივეს არარსებობისას გაგზავნა no-op-ია */
  UBILL_API_KEY: z.string().optional(),
  UBILL_BRAND_ID: z.string().optional(),
  /** Google-ით შესვლა — ორივეს გარეშე ღილაკი არ ჩანს (googleConfigured()) */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** ⚠ SMTP აღარ გამოიყენება (2026-08-19): Railway ბლოკავს გამავალ SMTP-პორტებს
   *  (ETIMEDOUT). მეილი Resend HTTP-API-ით იგზავნება (mail.ts). ეს ცვლადები
   *  რჩება ჩავარდნის გარეშე, მაგრამ იგნორირებულია. */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** "on" = Neon keep-alive-ის ჩართვა (instrumentation.ts). Default გამორთულია
   *  (2026-09-13): keepalive Free-გეგმის compute-საათებს ჭამდა */
  NEON_KEEPALIVE: z.string().optional(),
  /** Meta Conversions API — ტოკენის გარეშე სერვერული Purchase no-op-ია;
   *  TEST_CODE დროებითია (Events Manager → Test Events), შემოწმების მერე იხსნება */
  META_CAPI_ACCESS_TOKEN: z.string().optional(),
  META_CAPI_TEST_CODE: z.string().optional(),
  /** Resend HTTP-API — გასაღების გარეშე მეილის გაგზავნა no-op-ია */
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_REPLY_TO: z.string().optional(),
  ADMIN_SEED_EMAIL: z.string().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),
});

let cached: z.infer<typeof serverEnvSchema> | null = null;

export function serverEnv() {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  · ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`გარემოს ცვლადები არასწორია:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}
