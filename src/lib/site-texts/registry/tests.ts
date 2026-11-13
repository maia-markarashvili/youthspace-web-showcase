import type { TextGroup } from "../types";

export const testsTexts: TextGroup = {
  slug: "tests",
  title: "ტესტები",
  entries: [
    {
      key: "tests.seo.title",
      label: "SEO - სათაური",
      kind: "text",
      default: "ტესტები",
    },
    {
      key: "tests.seo.description",
      label: "SEO - აღწერა",
      kind: "textarea",
      default:
        "სახალისო ტესტები „სივრცისგან“ - გაიგე, რომელი კლუბი ან კურსი მოგერგება.",
    },
    {
      key: "tests.hero.eyebrow",
      label: "ზედა წარწერა (eyebrow)",
      kind: "text",
      default: "ტესტები",
    },
    {
      key: "tests.hero.title",
      label: "მთავარი სათაური",
      kind: "text",
      default: "გაიგე, რა მოგერგება ✨",
    },
    {
      key: "tests.hero.lead",
      label: "შესავალი აბზაცი",
      kind: "textarea",
      default:
        "რამდენიმე მარტივი კითხვა - და გეტყვით, სად არის შენი ადგილი სივრცეში.",
    },
    {
      key: "tests.card.cta",
      label: "ტესტის ბარათი - ღილაკის ტექსტი",
      kind: "text",
      default: "დაიწყე ტესტი 🚀",
    },
    {
      key: "tests.quiz.progress",
      label: "ტესტი - პროგრესის ტექსტი ({n} და {total} იცვლება)",
      kind: "text",
      default: "კითხვა {n} / {total}",
    },
    {
      key: "tests.quiz.back",
      label: "ტესტი - უკან ღილაკი",
      kind: "text",
      default: "← წინა კითხვა",
    },
    {
      key: "tests.quiz.result.eyebrow",
      label: "შედეგი - ზედა წარწერა",
      kind: "text",
      default: "შენი შედეგი",
    },
    {
      key: "tests.quiz.result.title",
      label: "შედეგი - სათაური",
      kind: "text",
      default: "შენი კლუბია… 🎉",
    },
    {
      key: "tests.quiz.result.cta",
      label: "შედეგი - კლუბის ღილაკი",
      kind: "text",
      default: "გაიცანი კლუბი →",
    },
    {
      key: "tests.quiz.result.retake",
      label: "შედეგი - თავიდან გავლის ღილაკი",
      kind: "text",
      default: "🔄 თავიდან გავლა",
    },
    {
      key: "tests.quiz.result.fallback",
      label: "შედეგი - fallback (კლუბი ვერ მოიძებნა)",
      kind: "textarea",
      default:
        "ვერ შევარჩიეთ ზუსტი კლუბი - გადახედე ყველა კლუბს და აირჩიე, რომელიც გულთან მიდის.",
    },
    {
      key: "tests.quiz.result.all-clubs",
      label: "შედეგი - ყველა კლუბის ღილაკი",
      kind: "text",
      default: "ყველა კლუბი",
    },
    {
      key: "tests.quiz.choice.title",
      label: "შედეგი - არჩევანის სათაური",
      kind: "text",
      default: "რა გინდა ახლა?",
    },
    {
      key: "tests.quiz.choice.badge",
      label: "შედეგი - გამოყოფილი ბარათის ბეჯი",
      kind: "text",
      default: "რეკომენდებული",
    },
    {
      key: "tests.quiz.choice.openday.title",
      label: "შედეგი - ღია კარის ბარათი: სათაური",
      kind: "text",
      default: "👀 ჯერ ნახე, მერე გადაწყვიტე",
    },
    {
      key: "tests.quiz.choice.openday.text",
      label: "შედეგი - ღია კარის ბარათი: ტექსტი",
      kind: "textarea",
      default:
        "მოდი ღია კარის დღეზე: 2 საათი, ცოცხალი გაცნობა, ვალდებულების გარეშე.",
    },
    {
      key: "tests.quiz.choice.openday.cta",
      label: "შედეგი - ღია კარის ბარათი: ღილაკი",
      kind: "text",
      default: "დარეგისტრირდი",
    },
    {
      key: "tests.quiz.choice.buy.title",
      label: "შედეგი - ყიდვის ბარათი: სათაური",
      kind: "text",
      default: "🎯 შემოგვიერთდი ახლავე",
    },
    {
      key: "tests.quiz.choice.buy.text",
      label: "შედეგი - ყიდვის ბარათი: ტექსტი ({club} იცვლება)",
      kind: "textarea",
      default:
        "{club}: თვიური გამოწერა, ყოველკვირეული შეხვედრები, შეჩერება ნებისმიერ დროს.",
    },
    {
      key: "tests.quiz.choice.buy.cta",
      label: "შედეგი - ყიდვის ბარათი: ღილაკი",
      kind: "text",
      default: "გაწევრიანდი",
    },
    {
      key: "tests.quiz.choice.clubs.title",
      label: "შედეგი - კლუბების ბარათი: სათაური",
      kind: "text",
      default: "🧭 გაიცანი ყველა კლუბი",
    },
    {
      key: "tests.quiz.choice.clubs.text",
      label: "შედეგი - კლუბების ბარათი: ტექსტი",
      kind: "textarea",
      default: "ყველა კლუბი ერთ ფასად - შეადარე და აირჩიე შენი.",
    },
    {
      key: "tests.quiz.choice.clubs.cta",
      label: "შედეგი - კლუბების ბარათი: ღილაკი",
      kind: "text",
      default: "კლუბების ნახვა",
    },
  ],
};
