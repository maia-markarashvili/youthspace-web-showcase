/**
 * ბრენდის ხატულების გენერატორი (ერთჯერადად ან ლოგოს შეცვლისას).
 *
 * გაშვება:  npm run icons:generate
 *
 * წერს სამ ფაილს src/app/-ში (Next-ის metadata-კონვენცია):
 *  · favicon.ico  — 16/32/48 px; Google სწორედ ამ მისამართს ამოწმებს;
 *  · icon.png     — 192×192 (Google 48-ის ჯერად კვადრატს ითხოვს);
 *  · apple-icon.png — 180×180 (iOS-ის მთავარი ეკრანი).
 *
 * sharp devDependency-ია და მხოლოდ აქედან იმპორტდება — აპლიკაციის კოდში
 * არსად შედის (seed.ts-ის იგივე პრეცედენტი).
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { brandIconSvg } from "./icon-svg";

const APP_DIR = path.join(process.cwd(), "src", "app");

/** SVG → PNG ბუფერი მითითებულ ზომაზე */
async function png(size: number): Promise<Buffer> {
  return sharp(Buffer.from(brandIconSvg(size)))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * ICO-კონტეინერის აწყობა PNG-ბუფერებისგან (sharp ico-ს არ წერს).
 * ფორმატი: 6-ბაიტიანი ICONDIR + 16-ბაიტიანი ჩანაწერი თითო სურათზე +
 * თავად სურათები. ყველა რიცხვი little-endian. PNG-კადრი ICO-ს შიგნით
 * („PNG-in-ICO") ყველა თანამედროვე ბრაუზერსა და Googlebot-ს ესმის.
 */
function buildIco(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;

  for (const image of images) {
    const entry = Buffer.alloc(16);
    /* 256 პიქსელი 0-ით აღინიშნება; ჩვენს ზომებზე ეს არ გვხვდება */
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2); // colorCount
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bitCount
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.data.length;
  }

  return Buffer.concat([
    header,
    ...entries,
    ...images.map((image) => image.data),
  ]);
}

async function main() {
  console.log("→ ხატულების გენერაცია იწყება…");

  const [ico16, ico32, ico48, icon192, apple180] = await Promise.all([
    png(16),
    png(32),
    png(48),
    png(192),
    png(180),
  ]);

  const ico = buildIco([
    { size: 16, data: ico16 },
    { size: 32, data: ico32 },
    { size: 48, data: ico48 },
  ]);

  await writeFile(path.join(APP_DIR, "favicon.ico"), ico);
  console.log(`  ✓ favicon.ico (16/32/48, ${ico.length} ბაიტი)`);

  await writeFile(path.join(APP_DIR, "icon.png"), icon192);
  console.log(`  ✓ icon.png (192×192, ${icon192.length} ბაიტი)`);

  await writeFile(path.join(APP_DIR, "apple-icon.png"), apple180);
  console.log(`  ✓ apple-icon.png (180×180, ${apple180.length} ბაიტი)`);

  console.log("✓ დასრულდა - ფაილები src/app/-შია, კომიტში უნდა შევიდეს");
}

main().catch((error) => {
  console.error("✗ გენერაცია ჩავარდა:", error);
  process.exitCode = 1;
});
