import type { TextGroup } from "../types";

/**
 * ანგარიშის (კაბინეტის) გვერდის ტექსტები — 2026-08-29-ს ხისტი სტრიქონები
 * ადმინში გადმოვიდა (მფლობელის მოთხოვნა). {name}/{percent}/{n}/{amount}
 * თარგები სერვერზე ივსება. ძველი „ჩემი ჯავშნები" (my) ჯგუფი წაიშალა —
 * ის გვერდი აღარ არსებობს (/my → /account რედირექტია).
 */
export const accountTexts: TextGroup = {
  slug: "account",
  title: "ანგარიში",
  entries: [
    {
      key: "account.seo.title",
      label: "SEO - გვერდის სათაური",
      kind: "text",
      default: "ჩემი ანგარიში",
    },
    {
      key: "account.hero.eyebrow",
      label: "ზედწარწერა",
      kind: "text",
      default: "ჩემი ანგარიში",
    },
    {
      key: "account.hero.greeting",
      label: "მისალმება ({name} = მომხმარებლის სახელი)",
      kind: "text",
      default: "გამარჯობა, {name}",
    },
    {
      key: "account.logout",
      label: "გასვლის ღილაკი",
      kind: "text",
      default: "გასვლა",
    },
    {
      key: "account.empty.title",
      label: "ცარიელი კაბინეტი - სათაური",
      kind: "text",
      default: "ჯერ არაფერი გაქვს დაჯავშნილი",
    },
    {
      key: "account.empty.description",
      label: "ცარიელი კაბინეტი - ტექსტი",
      kind: "textarea",
      default:
        "აირჩიე კლუბი, კურსი ან შესვლა - ყველაფერი აქ, ერთ ადგილას გამოჩნდება.",
    },
    {
      key: "account.clubs.title",
      label: "ჯგუფი კლუბები - სათაური",
      kind: "text",
      default: "კლუბები",
    },
    {
      key: "account.clubs.empty",
      label: "ჯგუფი კლუბები - ცარიელი მდგომარეობა",
      kind: "text",
      default: "კლუბის წევრობა ჯერ არ გაქვს.",
    },
    {
      key: "account.clubs.cta",
      label: "ჯგუფი კლუბები - ბმულის ტექსტი",
      kind: "text",
      default: "კლუბები →",
    },
    {
      key: "account.passes.title",
      label: "ჯგუფი შესვლები - სათაური",
      kind: "text",
      default: "შესვლები",
    },
    {
      key: "account.passes.empty",
      label: "ჯგუფი შესვლები - ცარიელი მდგომარეობა",
      kind: "text",
      default: "შესვლების პაკეტი ჯერ არ გაქვს.",
    },
    {
      key: "account.passes.cta",
      label: "ჯგუფი შესვლები - ბმულის ტექსტი",
      kind: "text",
      default: "შესვლები →",
    },
    {
      key: "account.passes.bookEntry",
      label: "აქტიური პასის რიგი - დაჯავშნის ბმული",
      kind: "text",
      default: "დაჯავშნე შესვლა →",
    },
    {
      key: "account.courses.title",
      label: "ჯგუფი კურსები - სათაური",
      kind: "text",
      default: "კურსები",
    },
    {
      key: "account.courses.empty",
      label: "ჯგუფი კურსები - ცარიელი მდგომარეობა",
      kind: "text",
      default: "კურსზე ჯერ არ ხარ ჩაწერილი.",
    },
    {
      key: "account.courses.cta",
      label: "ჯგუფი კურსები - ბმულის ტექსტი",
      kind: "text",
      default: "კურსები →",
    },
    {
      key: "account.bookings.title",
      label: "ჯგუფი ჯავშნები - სათაური",
      kind: "text",
      default: "ჯავშნები",
    },
    {
      key: "account.bookings.empty",
      label: "ჯგუფი ჯავშნები - ცარიელი მდგომარეობა",
      kind: "text",
      default: "აქტიური ჯავშანი არ არის.",
    },
    {
      key: "account.bookings.cta",
      label: "ჯგუფი ჯავშნები - ბმულის ტექსტი",
      kind: "text",
      default: "დაჯავშნე შესვლა →",
    },
    {
      key: "account.events.title",
      label: "ჯგუფი ღონისძიებები - სათაური",
      kind: "text",
      default: "ღონისძიებები",
    },
    {
      key: "account.events.empty",
      label: "ჯგუფი ღონისძიებები - ცარიელი მდგომარეობა",
      kind: "text",
      default: "ღონისძიების ჯავშანი არ არის.",
    },
    {
      key: "account.events.cta",
      label: "ჯგუფი ღონისძიებები - ბმულის ტექსტი",
      kind: "text",
      default: "დაჯავშნე სივრცე →",
    },
    {
      key: "account.badge.active",
      label: "ბეიჯი - აქტიური",
      kind: "text",
      default: "აქტიური",
    },
    {
      key: "account.badge.done",
      label: "ბეიჯი - დასრულებული",
      kind: "text",
      default: "დასრულებული",
    },
    {
      key: "account.footer.helper",
      label: "ქვედა დახმარების ხაზი",
      kind: "text",
      default: "რამე არ ჩანს ან შეკითხვა გაქვს?",
    },
    {
      key: "account.footer.link",
      label: "ქვედა დახმარების ბმული",
      kind: "text",
      default: "დაგვიკავშირდი",
    },
    {
      key: "account.referral.title",
      label: "მოწვევის ბარათი - სათაური",
      kind: "text",
      default: "მოიწვიე მეგობარი",
    },
    {
      key: "account.referral.body",
      label: "მოწვევის ბარათი - ტექსტი ({percent} = ფასდაკლება)",
      kind: "textarea",
      default:
        "გაუზიარე შენი კოდი. მეგობარი პირველ თვეს {percent}%-ით იაფად მიიღებს, შენ კი შემდეგ თვეზე იმავე ფასდაკლებას მოიპოვებ.",
    },
    {
      key: "account.referral.copy",
      label: "მოწვევის ბარათი - კოპირების ღილაკი",
      kind: "text",
      default: "კოდის კოპირება",
    },
    {
      key: "account.referral.copied",
      label: "მოწვევის ბარათი - დაკოპირებულია",
      kind: "text",
      default: "დაკოპირდა ✓",
    },
    {
      key: "account.referral.accrued",
      label: "მოწვევის ბარათი - დაგროვილი თვეები ({n} = რაოდენობა)",
      kind: "text",
      default: "დაგროვილი გაქვს {n} ფასდაკლებული თვე.",
    },
    {
      key: "account.referral.nextRenewal",
      label: "მოწვევის ბარათი - შემდეგი განახლების ფასი ({amount})",
      kind: "text",
      default: "შემდეგი განახლება {amount} დაგიჯდება.",
    },
    {
      key: "account.referral.footnote",
      label: "მოწვევის ბარათი - ქვედა მინაწერი",
      kind: "text",
      default: "თითო მოწვეული მეგობარი = ერთი ფასდაკლებული თვე შენთვის.",
    },
  ],
};
