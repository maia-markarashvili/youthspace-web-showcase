/**
 * 2026 წლის დასრულებული კურსები/შეხვედრები — წყარო: docs/სივრცის კურსები.xlsx
 * (FB-ტექსტები გაწმენდილია: ჰეშთეგები, მოძველებული სარეგისტრაციო ბმულები და
 * მისამართის ხაზები მოშორებულია; დეტალები landing.facts-შია გადატანილი).
 * დასრულებულ კურსზე ფასი UI-ში არ ჩანს — priceRegular ისტორიული ჩანაწერია.
 * ჩასმა: seed.ts + apply-content-2026-08-15b.ts.
 */
import type { LandingContent } from "../landing";
import { toTetri } from "../money";

export type ArchiveCourse = {
  slug: string;
  title: string;
  description: string;
  category: string;
  lecturer: string | null;
  scheduleText: string;
  coverImage: string | null;
  gallery: string[];
  priceRegular: number;
  startDate: string;
  endDate: string;
  landing: LandingContent;
};

export const COURSE_ARCHIVE_2026: ArchiveCourse[] = [
  // Content entries (names, texts, photos) are omitted from the public showcase.
];
