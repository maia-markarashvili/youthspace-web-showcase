import type { TextGroup } from "../types";

export const clubsTexts: TextGroup = {
  slug: "clubs",
  title: "კლუბები",
  entries: [
    // SEO
    {
      key: "clubs.seo.title",
      label: "SEO - სათაური",
      kind: "text",
      default: "კლუბები",
    },
    {
      key: "clubs.seo.description",
      label: "SEO - აღწერა",
      kind: "textarea",
      default:
        "ოთხი კლუბი 15–23 წლის ახალგაზრდებისთვის - მოაზროვნეები, ინოვატორები, ლიდერები და მეწარმეები: გონებრივი, ციფრული, სოციალური და ფინანსური უნარები.",
    },
    // სიის გვერდის თავი
    {
      key: "clubs.hero.eyebrow",
      label: "სია - ზედა წარწერა",
      kind: "text",
      default: "კლუბები",
    },
    {
      key: "clubs.hero.title",
      label: "სია - მთავარი სათაური",
      kind: "text",
      default: "აირჩიე კლუბი, სადაც შენი აზრი ისმის",
    },
    {
      key: "clubs.hero.lead",
      label: "სია - შესავალი ტექსტი",
      kind: "textarea",
      default:
        "ყოველი კლუბი 12-შეხვედრიანი ციკლია: კვირაში ერთი გარანტირებული 90-წუთიანი შეხვედრა, მოწვეული სტუმრები, წევრების ინიციატივები და ბოლოს - საჯარო ფინალი.",
    },
    // ფასის ახსნის ბარათი
    {
      key: "clubs.pricing.eyebrow",
      label: "ფასის ბარათი - ზედა წარწერა",
      kind: "text",
      default: "რა შედის ფასში",
    },
    {
      key: "clubs.pricing.note",
      label: "ფასის ბარათი - დასკვნითი წინადადება",
      kind: "textarea",
      default:
        "ერთი ფასი ყველა კლუბზე - 120 ₾ თვეში, ანუ ორი 60-ლარიანი 4-შესვლიანი პაკეტის ფასი. წევრობაში შედის კვირაში ერთი გარანტირებული კლუბის დღე (14:00–18:00), საკუთარი 4-შესვლიანი პაკეტი თავისუფალი ჯავშნებისთვის და შეხვედრები მენტორთან და სტუმრებთან - ერთი პაკეტი ფაქტობრივად საჩუქრად გრჩება. თვიური გამოწერაა - ნებისმიერ დროს შეგიძლია შეაჩერო.",
    },
    // ტესტის თიზერი
    {
      key: "clubs.quiz.teaser",
      label: "ტესტის თიზერი - ტექსტი",
      kind: "text",
      default: "არ იცი, რომელი კლუბი აირჩიო?",
    },
    {
      key: "clubs.quiz.cta",
      label: "ტესტის თიზერი - ღილაკი",
      kind: "text",
      default: "გაიარე ტესტი →",
    },
    {
      key: "clubs.detail.closed",
      label: "კლუბის გვერდი - შეტყობინება, როცა მიღება დასრულებულია",
      kind: "textarea",
      default:
        "ამ კლუბზე მიღება დასრულებულია - ახალი მიღების გამოცხადებას მალე ნახავ.",
    },
    // დასრულებული კლუბების სექცია
    {
      key: "clubs.list.ended.title",
      label: "სია - დასრულებული კლუბების სათაური",
      kind: "text",
      default: "დასრულებული კლუბები",
    },
    {
      key: "clubs.list.ended.description",
      label: "სია - დასრულებული კლუბების აღწერა",
      kind: "textarea",
      default:
        "ამ კლუბების მიმდინარე სეზონი სრულდება - ახალი სეზონის გამოცხადებას მალე ნახავ.",
    },
    // ცარიელი მდგომარეობა
    {
      key: "clubs.empty.title",
      label: "ცარიელი სია - სათაური",
      kind: "text",
      default: "კლუბები ჯერ არ არის გამოქვეყნებული",
    },
    {
      key: "clubs.empty.description",
      label: "ცარიელი სია - აღწერა",
      kind: "text",
      default: "ახალი სეზონის კლუბები მალე დაემატება.",
    },
    // კლუბის ლენდინგი (დეტალური გვერდი)
    {
      key: "clubs.detail.badge",
      label: "ლენდინგი - ტიპის ბეჯი",
      kind: "text",
      default: "კლუბი",
    },
    // „რას მიიღებ“
    {
      key: "clubs.detail.benefits.title",
      label: "ლენდინგი - „რას მიიღებ“ სათაური",
      kind: "text",
      default: "რას მიიღებ",
    },
    // პროგრამა + ციკლის ბარათი
    {
      key: "clubs.landing.program.title",
      label: "ლენდინგი - პროგრამის სათაური",
      kind: "text",
      default: "პროგრამა",
    },
    {
      key: "clubs.detail.result.eyebrow",
      label: "ლენდინგი - ციკლის ბარათის ზედა წარწერა",
      kind: "text",
      default: "საბოლოო შედეგი",
    },
    {
      key: "clubs.landing.cycle.storyLink",
      label: "ლენდინგი - ციკლის სთორის ბმულის წარწერა",
      kind: "text",
      default: "ნახე როგორ ჩატარდა",
    },
    // გაწევრიანების ბლოკი
    {
      key: "clubs.landing.join.title",
      label: "ლენდინგი - გაწევრიანების ბლოკის სათაური",
      kind: "text",
      default: "გაწევრიანება",
    },
    // ხშირი კითხვები
    // ქვედა სექციები
    {
      key: "clubs.detail.gallery.title",
      label: "ლენდინგი - გალერეის სათაური",
      kind: "text",
      default: "კლუბი ფოტოებში",
    },
    {
      key: "clubs.detail.outputs.title",
      label: "ლენდინგი - ნამუშევრების სათაური",
      kind: "text",
      default: "ჩვენი წევრების მიერ შექმნილი",
    },
    {
      key: "clubs.detail.outputs.text",
      label: "ლენდინგი - ნამუშევრების აღწერა",
      kind: "textarea",
      default:
        "კლუბის მონაწილეების ნამუშევრები, პროექტები და გამოქვეყნებული შედეგები.",
    },
    {
      key: "clubs.match.badge",
      label: "კლუბები - ქვიზიდან მოსულის ბეჯი (?match=)",
      kind: "text",
      default: "შენი შედეგი ✨",
    },
  ],
};
