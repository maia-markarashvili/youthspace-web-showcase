import type { UploadResult } from "@/app/admin/upload-actions";

/**
 * ატვირთვის საერთო კლიენტ-გარსი admin-ველებისთვის (ImageField/GalleryField/
 * FileField): ზომის წინასწარი შემოწმება კლიენტზევე + server action-ის
 * ტრანსპორტის დონეზე ჩავარდნის (მაგ. body-ლიმიტი, ქსელი) დაჭერა — action-ის
 * გარეთ ასროლილი შეცდომა სხვაგვარად ველს გაუგებრად ამტვრევდა და მომხმარებელი
 * ვერ იგებდა, რატომ „არ ემატება" ფაილი.
 */
export async function runUpload(
  action: (formData: FormData) => Promise<UploadResult>,
  file: File,
  maxBytes: number,
  maxLabel: string,
): Promise<UploadResult> {
  if (file.size > maxBytes) {
    return {
      status: "error",
      message: `ფაილი ძალიან დიდია (მაქს. ${maxLabel})`,
    };
  }

  const formData = new FormData();
  formData.append("file", file);
  try {
    return await action(formData);
  } catch {
    return {
      status: "error",
      message:
        "ატვირთვა ვერ მოხერხდა - შეამოწმე ინტერნეტ-კავშირი და სცადე თავიდან",
    };
  }
}
