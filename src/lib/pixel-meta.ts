/**
 * Meta Pixel-ის საზიარო მეტამონაცემები — წმინდა მოდული (server-only არაა):
 * კლიენტის კომპონენტიც იყენებს (meta-pixel.tsx), სერვერიც (payment/status,
 * meta-capi.ts). ივენთების სემანტიკა და კატეგორიები — მფლობელის
 * სპეციფიკაცია (2026-09-02): content_category-ზე იგება Custom Conversions.
 */

export type PixelCategory = "club" | "drop-in" | "event" | "quiz";

/** orderRef-ის პრეფიქსი → კატეგორია/კატალოგური id (იხ. lib/order-ref.ts).
 *  CLB + ძველი SIV = კლუბის გამოწერა. */
export function purchasePixelMeta(orderRef: string): {
  category: PixelCategory;
  id: string;
} {
  if (orderRef.startsWith("PSS")) {
    return { category: "drop-in", id: "drop-in-single" };
  }
  if (orderRef.startsWith("CWK")) {
    return { category: "drop-in", id: "drop-in-4pack" };
  }
  if (orderRef.startsWith("CRS")) return { category: "event", id: "course" };
  if (orderRef.startsWith("SPC")) {
    return { category: "event", id: "event-space" };
  }
  return { category: "club", id: "club-membership" };
}
