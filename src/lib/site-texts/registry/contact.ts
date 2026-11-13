import type { TextGroup } from "../types";

export const contactTexts: TextGroup = {
  slug: "contact",
  title: "კონტაქტი",
  entries: [
    /* ── SEO ─────────────────────────────────────────────────────── */
    {
      key: "contact.seo.title",
      label: "SEO - გვერდის სათაური",
      kind: "text",
      default: "კონტაქტი",
    },
    {
      key: "contact.seo.description",
      label: "SEO - გვერდის აღწერა",
      kind: "textarea",
      default:
        "დაგვიკავშირდი ელფოსტით ან სოციალური არხებით - ან მოგვწერე პირდაპირ საიტიდან.",
    },

    /* ── ჰერო ────────────────────────────────────────────────────── */
    {
      key: "contact.hero.eyebrow",
      label: "ჰერო - ზედწარწერა",
      kind: "text",
      default: "კონტაქტი",
    },
    {
      key: "contact.hero.title",
      label: "ჰერო - სათაური (H1)",
      kind: "text",
      default: "მოგვწერე",
    },
    {
      key: "contact.hero.lead",
      label: "ჰერო - ლიდ-აბზაცი",
      kind: "textarea",
      default:
        "გაქვს შეკითხვა კლუბებზე, კურსებზე ან სივრცის დაჯავშნაზე? გვიპასუხე ჩვეულებრივ სამუშაო საათებში - ხშირად უფრო მალეც.",
    },

    /* ── პირდაპირი კავშირის ბარათი ───────────────────────────────── */
    {
      key: "contact.whatsapp.prefill",
      label: "WhatsApp-შეტყობინების შაბლონი",
      kind: "text",
      default: "გამარჯობა! მაქვს შეკითხვა „სივრცის“ შესახებ.",
    },
    {
      key: "contact.direct.eyebrow",
      label: "ბარათი „პირდაპირი კავშირი“ - ზედწარწერა",
      kind: "text",
      default: "პირდაპირი კავშირი",
    },
    {
      key: "contact.direct.whatsapp",
      label: "ბარათი „პირდაპირი კავშირი“ - WhatsApp-ბმულის წარწერა",
      kind: "text",
      default: "მოგვწერე WhatsApp-ში →",
    },

    /* ── სოციალური არხების ბარათი ────────────────────────────────── */
    {
      key: "contact.follow.eyebrow",
      label: "ბარათი „გამოგვყევი“ - ზედწარწერა",
      kind: "text",
      default: "გამოგვყევი",
    },
    {
      key: "contact.follow.text",
      label: "ბარათი „გამოგვყევი“ - ტექსტი",
      kind: "textarea",
      default:
        "სიახლეები, ღონისძიებები და რეგისტრაციები პირველად ჩვენს არხებზე ქვეყნდება.",
    },
  ],
};
