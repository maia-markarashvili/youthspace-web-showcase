/**
 * თანხები ბაზაში ინახება **თეთრში** (integer, GEL × 100) — PRD §6.
 * UI-ში ყოველთვის ამ ფუნქციებით ითარგმნება, არასდროს პირდაპირ.
 */

const formatter = new Intl.NumberFormat("ka-GE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 18000 → „180 ₾" · 18050 → „180.5 ₾" */
export function formatGel(tetri: number): string {
  return `${formatter.format(tetri / 100)} ₾`;
}

/** ლარი → თეთრი (admin ფორმებისთვის და seed-ისთვის) */
export function toTetri(gel: number): number {
  return Math.round(gel * 100);
}

/** თეთრი → ლარი (admin ფორმის input value) */
export function toGel(tetri: number): number {
  return tetri / 100;
}
