import { permanentRedirect } from "next/navigation";

/**
 * ძველი per-ოთახი გვერდები (/spaces/patara-otaxi და სხვ.) — 2026-08-30
 * რედიზაინის შემდეგ სივრცე მხოლოდ მთლიანად ქირავდება ერთ გვერდზე.
 * ძველი ბმულები (ძებნა, გაზიარებული ლინკები) მუდმივი redirect-ით ცოცხლობს.
 */
export default function SpaceDetailRedirect() {
  permanentRedirect("/spaces");
}
