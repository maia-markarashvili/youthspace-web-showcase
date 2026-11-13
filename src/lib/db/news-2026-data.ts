/**
 * 2026 წლის სიახლეები — წყარო: docs/სივრცის სიახლეები.xlsx („ტექსტი
 * საიტისთვის" სვეტი, მფლობელის მომზადებული). ფოტოები FB-პოსტებიდანაა
 * ჩამოტვირთული seed-uploads/-ში. ჩასმა: seed.ts + apply-content-2026-08-15b.ts.
 */

export type News2026Item = {
  slug: string;
  title: string;
  body: string;
  /** ["/uploads/news-<slug>-1.webp", …] — პირველი ბანერია */
  media: string[];
  /** ISO თბილისის დროით */
  publishedAt: string;
  /** კლუბზე მიბმა (slug) — insert-ისას id-დ იხსნება */
  clubSlug?: string;
  relatedLinks?: { label: string; href: string }[];
};

export const NEWS_2026: News2026Item[] = [
  // Content entries (names, texts, photos) are omitted from the public showcase.
];
