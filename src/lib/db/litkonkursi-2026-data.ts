/**
 * ლიტერატურული კონკურსის „წიგნიდან დაწყებული ამბავი" (2026) გამარჯვებულთა
 * ტექსტები — წყარო: ავტორთა Canva-პუბლიკაციები (გამარჯვებულების ტექსტების
 * ბმულები.docx). ჩასმა: apply-content-2026-08.ts.
 *
 * ბაზაში უკვე არსებული ორი პოსტი (ვაჩე ყანჩაველი, მარიამ ბუკია) აქ არ შედის —
 * მათი ტექსტი ადმინიდანაა შეყვანილი და მხოლოდ ბანერი უახლდებათ.
 */
export type LitkonkursiWinner = {
  slug: string;
  authorName: string;
  title: string;
  body: string;
};

/**
 * არააქტიური ფსევდო-კლუბი „ლიტერატურული კონკურსი" — ადმინის კონტენტ-ფორმის
 * dropdown-ში ჩანს (ის isActive-ს არ ფილტრავს), საჯარო გვერდებზე/ძებნაში არა.
 * კონკურსის ტექსტები კლუბის ნაცვლად ამ ჩანაწერზეა მიბმული.
 */
export const LITKONKURSI_PSEUDO_CLUB = {
  slug: "literaturuli-konkursi",
  title: "ლიტერატურული კონკურსი",
  isActive: false,
  sortOrder: 99,
} as const;

/** მინაწერი კონკურსის ყველა ტექსტის ბოლოში — body-ში „> "-ით ემატება */
export const LITKONKURSI_2026_FOOTNOTE =
  "ტექსტი შექმნილია სივრცის სასწავლო კურსის „ბიზნესლაბორატორიის“ მიერ ორგანიზებული ლიტერატურული კონკურსის „[წიგნიდან დაწყებული ამბავი](/stories/litkonkursi-2026-pirobebi)“ ფარგლებში.";

export const LITKONKURSI_2026_WINNERS: LitkonkursiWinner[] = [
  // Content entries (names, texts, photos) are omitted from the public showcase.
];
