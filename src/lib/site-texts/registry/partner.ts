import type { TextGroup } from "../types";

export const partnerTexts: TextGroup = {
  slug: "partner",
  title: "პარტნიორობა",
  entries: [
    /* ── SEO ─────────────────────────────────────────────────────── */
    {
      key: "partner.seo.title",
      label: "SEO - გვერდის სათაური",
      kind: "text",
      default: "კურსის პარტნიორობა",
    },
    {
      key: "partner.seo.description",
      label: "SEO - გვერდის აღწერა",
      kind: "textarea",
      default:
        "ასწავლი? შემოიტანე შენი კურსი „სივრცეში“ - ჩვენ სივრცეს, აუდიტორიას და გაყიდვას ვუზრუნველყოფთ, შემოსავალი კი იყოფა.",
    },

    /* ── ჰერო ────────────────────────────────────────────────────── */
    {
      key: "partner.hero.eyebrow",
      label: "ჰერო - ზედწარწერა",
      kind: "text",
      default: "ორგანიზაციებს · ლექტორებს",
    },
    {
      key: "partner.hero.title",
      label: "ჰერო - სათაური (H1)",
      kind: "text",
      default: "ასწავლე შენი კურსი „სივრცეში“",
    },
    {
      key: "partner.hero.lead",
      label: "ჰერო - ლიდ-აბზაცი",
      kind: "textarea",
      default:
        "ჩვენ ვეძებთ პრაქტიკოსებს, რომლებსაც აქვთ რისი გაზიარებაც ახალგაზრდებთან. შენ კურსს ატარებ - ლოგისტიკა და გაყიდვები ჩვენზეა.",
    },

    /* ── სამი ნაბიჯი ─────────────────────────────────────────────── */
    {
      key: "partner.steps.1.title",
      label: "ნაბიჯი 1 - სათაური",
      kind: "text",
      default: "შენ მოგაქვს ცოდნა",
    },
    {
      key: "partner.steps.1.text",
      label: "ნაბიჯი 1 - ტექსტი",
      kind: "textarea",
      default: "კურსის თემა, პროგრამა და სწავლების გამოცდილება - შენი მხარეა.",
    },
    {
      key: "partner.steps.2.title",
      label: "ნაბიჯი 2 - სათაური",
      kind: "text",
      default: "ჩვენ გვაქვს დანარჩენი",
    },
    {
      key: "partner.steps.2.text",
      label: "ნაბიჯი 2 - ტექსტი",
      kind: "textarea",
      default:
        "დარბაზი, ტექნიკა, მარკეტინგი, რეგისტრაცია და გადახდები - ჩვენი მხარეა.",
    },
    {
      key: "partner.steps.3.title",
      label: "ნაბიჯი 3 - სათაური",
      kind: "text",
      default: "შემოსავალი იყოფა",
    },
    {
      key: "partner.steps.3.text",
      label: "ნაბიჯი 3 - ტექსტი",
      kind: "textarea",
      default:
        "ვმუშაობთ revenue-share მოდელით - კონკრეტული პროცენტი ინდივიდუალურად თანხმდება.",
    },

    /* ── განაცხადის ფორმის ბლოკი ─────────────────────────────────── */
    {
      key: "partner.form.title",
      label: "ფორმის ბლოკი - სათაური",
      kind: "text",
      default: "გამოგვიგზავნე განაცხადი",
    },
    {
      key: "partner.form.text",
      label: "ფორმის ბლოკი - ტექსტი",
      kind: "textarea",
      default:
        "შეავსე ფორმა - გავეცნობით და პირობების შესათანხმებლად დაგიკავშირდებით.",
    },
  ],
};
