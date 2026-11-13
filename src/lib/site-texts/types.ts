/**
 * საიტის ტექსტების რეესტრის ტიპები — default-ები კოდში ცხოვრობს,
 * DB (site_texts) მხოლოდ override-ებს ინახავს. რიგის წაშლა = default-ზე დაბრუნება.
 */
/** markdown = დიდი ერთიანი ტექსტი, ადმინში MarkdownField-ით (ტულბარი+პრევიუ) */
export type TextKind = "text" | "textarea" | "markdown" | "image" | "toggle";

export type TextEntry = {
  /** უნიკალური key ჯგუფის პრეფიქსით, მაგ. "home.hero.title" */
  key: string;
  /** ქართული ლეიბლი ადმინის ფორმისთვის */
  label: string;
  kind: TextKind;
  /** საიტზე დღეს არსებული ზუსტი ტექსტი — override-ის გარეშე ეს ჩანს */
  default: string;
  /**
   * true = ცარიელი მნიშვნელობა ბაზაში ინახება და შეტყობინების **გამორთვას**
   * ნიშნავს (SMS/ელფოსტა). ჩვეულებრივ ტექსტებზე ცარიელი ველი, პირიქით,
   * რიგს შლის და default-ს აბრუნებს — გვერდი ცარიელი სათაურით არ გვინდა.
   */
  disablable?: boolean;
};

export type TextGroup = {
  slug: string;
  /** ჯგუფის ქართული სახელი ადმინის ტაბისთვის */
  title: string;
  entries: TextEntry[];
};
