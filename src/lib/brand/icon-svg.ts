/**
 * ბრენდის ხატულის SVG — ერთი წყარო favicon-ისთვის, PWA/Apple-ხატულისთვის.
 * ნახატი იმეორებს `src/components/logo.tsx`-ის მარკს, ოღონდ თეთრად, მწვანე
 * გრადიენტის კვადრატზე.
 *
 * ⚠ სამი წესი (ხატულას librsvg რენდერავს, არა React):
 *  1. ატრიბუტები kebab-case-ია (`stroke-width`, არა `strokeWidth`) — JSX-ის
 *     სახელებს librsvg ჩუმად აიგნორებს და ხაზები თმისოდენა გამოვა;
 *  2. `var(--color-…)` აქ არ მუშაობს — ფერები ლიტერალური hex-ია;
 *  3. ქვედა სოლს `fill`-იც და `stroke`-იც სჭირდება (stroke-width 6 სილუეტს
 *     თითო მხრიდან 3 ერთეულით აფართოებს).
 */

/** ბრენდის ტოკენები globals.css-იდან (@theme); ბოლო ტონი ოდნავ ყვითელ-მწვანეა,
 *  რომ დიაგონალი მფლობელის შერჩეულ ვარიანტს დაემთხვეს */
const GREEN_DARK = "#2b5533";
const GREEN_MID = "#5f9457";
const GREEN_LIGHT = "#a6c85c";

/**
 * მარკის ნამდვილი bbox — logo.tsx-ის viewBox („-8 -8 116 92") padding-იანია.
 * round-cap-ები ხაზის ბოლოებს strokeWidth/2 = 5.75-ით აგრძელებს, სოლს კი
 * stroke-width 6 → ±3. გაერთიანება: x ∈ [-1.75, 101.75], y ∈ [-3.25, 79.25].
 */
const MARK = { x: -1.75, y: -3.25, w: 103.5, h: 82.5 } as const;

/**
 * მარკის სიგანე კვადრატის მიმართ. პატარა ზომებზე პადინგი ნაკლებია: 16px-ზე
 * 0.62 ნიშნავს ~1px-იან შტრიხს და ნიშანი ქრება — ეს ხატულების ჩვეულებრივი
 * კომპრომისია (დიდზე ჰაერიანი, პატარაზე კომპაქტური).
 */
function markRatioFor(size: number): number {
  if (size <= 20) return 0.82;
  if (size <= 40) return 0.72;
  return 0.62;
}

/** მარკის ფორმები (logo.tsx-ის გეომეტრია, თეთრად) */
function markShapes(): string {
  return [
    '<line x1="4" y1="72" x2="43" y2="12" stroke="#ffffff" stroke-width="11.5" stroke-linecap="round"/>',
    '<line x1="52" y1="2.5" x2="96" y2="73.5" stroke="#ffffff" stroke-width="11.5" stroke-linecap="round"/>',
    '<path d="M24 70.5 L72 57 L80 70 L28 74 Z" fill="#ffffff" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/>',
  ].join("");
}

/** მრგვალება ორ ათწილადამდე — SVG-ს გრძელი float-ები არ სჭირდება */
function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * კვადრატული ხატულის SVG მითითებულ პიქსელურ ზომაზე. თითო ზომაზე ცალკე
 * გენერირდება (და არა ერთხელ დიდზე + შემცირება) — 16px-ზე ასე მკვეთრია.
 */
export function brandIconSvg(size: number): string {
  const scale = (size * markRatioFor(size)) / MARK.w;
  const tx = size / 2 - (MARK.x + MARK.w / 2) * scale;
  const ty = size / 2 - (MARK.y + MARK.h / 2) * scale;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
    `<stop offset="0" stop-color="${GREEN_DARK}"/>`,
    /* შუა ტონი 0.62-ზე და არა 0.5-ზე — მარკის უკან ფონი უფრო მუქი რჩება და
       თეთრი ნიშანი პატარა ზომებზეც იკითხება */
    `<stop offset="0.62" stop-color="${GREEN_MID}"/>`,
    `<stop offset="1" stop-color="${GREEN_LIGHT}"/>`,
    "</linearGradient></defs>",
    `<rect width="${size}" height="${size}" fill="url(#g)"/>`,
    `<g transform="translate(${round(tx)},${round(ty)}) scale(${round(scale)})" fill="none">`,
    markShapes(),
    "</g></svg>",
  ].join("");
}
