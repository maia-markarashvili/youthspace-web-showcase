"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireOwner } from "@/lib/auth/session";
import { UPLOAD_DIR } from "@/lib/uploads";

/**
 * ფაილების ატვირთვა → UPLOAD_DIR (Railway-ზე persistent volume, ლოკალურად .uploads/).
 * ფაილს ასერვირებს route handler `/uploads/<file>` — public/-ის გარეშე, რომ
 * runtime-ში ჩაწერილი ფაილიც ჩანდეს (public/ static serving ამას ვერ აკეთებს).
 */

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
};
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export type UploadResult =
  | { status: "success"; url: string }
  | { status: "error"; message: string };

/**
 * ფაილის რეალური ტიპის შემოწმება პირველი ბაიტებით (magic bytes) — ბრაუზერის
 * მიერ გამოცხადებული `file.type`-ს არ ვენდობით. მხოლოდ მფლობელი ტვირთავს,
 * მაგრამ ეს დამატებითი ბადეა (ტიპის გაყალბება ვერ გაივლის).
 */
function magicMatches(buffer: Buffer, ext: string): boolean {
  const b = buffer;
  switch (ext) {
    case "jpg":
      return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "png":
      return (
        b.length >= 8 &&
        b[0] === 0x89 &&
        b[1] === 0x50 &&
        b[2] === 0x4e &&
        b[3] === 0x47 &&
        b[4] === 0x0d &&
        b[5] === 0x0a &&
        b[6] === 0x1a &&
        b[7] === 0x0a
      );
    case "webp":
      /* "RIFF" .... "WEBP" */
      return (
        b.length >= 12 &&
        b.toString("ascii", 0, 4) === "RIFF" &&
        b.toString("ascii", 8, 12) === "WEBP"
      );
    case "pdf":
      return b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-";
    default:
      return false;
  }
}

export async function uploadImage(formData: FormData): Promise<UploadResult> {
  await requireOwner();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "ფაილი ვერ მოიძებნა" };
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return { status: "error", message: "დაშვებულია მხოლოდ JPG, PNG ან WebP" };
  }
  if (file.size > MAX_BYTES) {
    return { status: "error", message: "ფაილი ძალიან დიდია (მაქს. 5MB)" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!magicMatches(buffer, ext)) {
    return { status: "error", message: "ფაილის შიგთავსი ტიპს არ შეესაბამება" };
  }

  const fileName = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

  return { status: "success", url: `/uploads/${fileName}` };
}

/** PDF დოკუმენტის ატვირთვა (კვლევები) — იგივე საცავი, ცალკე ლიმიტები */
export async function uploadDocument(
  formData: FormData,
): Promise<UploadResult> {
  await requireOwner();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "ფაილი ვერ მოიძებნა" };
  }

  const ext = ALLOWED_DOCUMENT_TYPES[file.type];
  if (!ext) {
    return { status: "error", message: "დაშვებულია მხოლოდ PDF" };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { status: "error", message: "ფაილი ძალიან დიდია (მაქს. 15MB)" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!magicMatches(buffer, ext)) {
    return { status: "error", message: "ფაილის შიგთავსი ტიპს არ შეესაბამება" };
  }

  const fileName = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

  return { status: "success", url: `/uploads/${fileName}` };
}
