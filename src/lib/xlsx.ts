import "server-only";
import ExcelJS from "exceljs";

/**
 * namdvili .xlsx გენერაცია admin-ის ექსპორტებისთვის (§1.6) — ცვლის ძველ
 * CSV+BOM+`sep=;` ხრიკს (`lib/csv.ts`), რომელიც პრაქტიკაში ჩავარდა: real-world
 * ფაილში (Excel-ით შენახულის შემდეგ) აღმოჩნდა double-encoded mojibake -
 * ნიშნავს, Excel-ის იმ კონკრეტულმა ვერსია/ლოკალმა UTF-8 BOM ვერ ამოიცნო.
 * XLSX ტექსტს XML-ში ცალსახა UTF-8 დეკლარაციით ინახავს - encoding-ორაზროვნება
 * კლასობრივად ქრება.
 */
export async function toXlsxBuffer(
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31)); // Excel-ის ლიმიტი

  sheet.columns = headers.map((header) => ({
    header,
    width: Math.min(40, Math.max(10, header.length + 4)),
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row.map((cell) => cell ?? ""));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
