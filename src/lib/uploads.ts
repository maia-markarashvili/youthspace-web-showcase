import path from "node:path";

/**
 * ატვირთული ფოტოების საცავის ფიზიკური საქაღალდე.
 *
 * ⚠ public/-ს **გარეთ** განზრახ: ფაილებს ასერვირებს route handler
 * (`/uploads/<file>` → src/app/uploads/[file]/route.ts), არა Next-ის static
 * serving. ეს გვარიდებს „runtime-ში public/-ში ჩაწერილი ფაილი არ ჩანს"
 * პრობლემას (სწორედ ამის გამო ბრუნდებოდა 404 Railway-ზე).
 *
 * - Railway (production): `UPLOAD_DIR` = persistent volume-ის mount path
 *   (მაგ. `/data/uploads`). volume-ის გარეშე ფაილები redeploy-ზე იშლება.
 * - ლოკალურად: პროექტის `.uploads/` საქაღალდე (gitignored).
 */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), ".uploads");

/**
 * რეპოში ვერსიონირებული, მუდმივი დოკუმენტების საქაღალდე (მაგ. კვლევის
 * PDF-ანგარიშები). `/uploads/<file>` route ჯერ UPLOAD_DIR-ში ეძებს, მერე აქ —
 * ეს ფაილები deploy-სთან ერთად მიდის და Railway volume-ზე არაა დამოკიდებული.
 */
export const SEED_UPLOAD_DIR = path.join(process.cwd(), "seed-uploads");

/** დაშვებული გაფართოება → Content-Type (ატვირთვისა და სერვირების საერთო წყარო) */
export const FILE_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
