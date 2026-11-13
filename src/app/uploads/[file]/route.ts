import { readFile } from "node:fs/promises";
import path from "node:path";
import { FILE_CONTENT_TYPES, SEED_UPLOAD_DIR, UPLOAD_DIR } from "@/lib/uploads";

/**
 * ატვირთული ფაილების (ფოტო/PDF) სერვირება — public/-ის გარეშე, რომ Railway-ზეც
 * იმუშაოს (volume) და ლოკალურადაც (.uploads/). ძებნის რიგი: ჯერ UPLOAD_DIR
 * (admin-იდან ატვირთული), მერე SEED_UPLOAD_DIR (რეპოში ვერსიონირებული მუდმივი
 * დოკუმენტები). ფაილის სახელი უცვლელი რჩება, ამიტომ immutable long cache.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** მკაცრი დაშვება: მხოლოდ უსაფრთხო სახელები — path traversal-ის გარეშე */
const FILE_RE = /^[a-zA-Z0-9_-]+\.(jpe?g|png|webp|pdf)$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (!FILE_RE.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = file.split(".").pop()!.toLowerCase();
  const fileName = path.basename(file);

  for (const dir of [UPLOAD_DIR, SEED_UPLOAD_DIR]) {
    try {
      const data = await readFile(path.join(dir, fileName));
      return new Response(new Uint8Array(data), {
        headers: {
          "Content-Type": FILE_CONTENT_TYPES[ext] ?? "application/octet-stream",
          "Content-Length": String(data.byteLength),
          "Cache-Control": "public, max-age=31536000, immutable",
          /* ბრაუზერმა ტიპი არ „გამოიცნოს" — MIME-confusion-ის დაცვა */
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      /* შემდეგ საქაღალდეში ვეძებთ */
    }
  }

  return new Response("Not found", { status: 404 });
}
