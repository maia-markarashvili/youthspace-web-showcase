import type { TextGroup } from "../types";

export const membershipTexts: TextGroup = {
  slug: "membership",
  title: "პაკეტები",
  entries: [
    {
      key: "membership.seo.title",
      label: "SEO - სათაური",
      kind: "text",
      default: "პაკეტები",
    },
    {
      key: "membership.seo.description",
      label: "SEO - აღწერა",
      kind: "textarea",
      default:
        "სამი მარტივი გეგმა: ერთჯერადი შესვლა, 4 შესვლის პაკეტი და კლუბის წევრობა - ორი პაკეტის ფასად, ერთი ფაქტობრივად საჩუქრად.",
    },
    {
      key: "membership.hero.eyebrow",
      label: "ზედა წარწერა (eyebrow)",
      kind: "text",
      default: "ფასები",
    },
    {
      key: "membership.hero.title",
      label: "მთავარი სათაური",
      kind: "text",
      default: "პაკეტები და ფასები",
    },
    {
      key: "membership.hero.lead",
      label: "შესავალი აბზაცი",
      kind: "textarea",
      default:
        "სამი მარტივი გეგმა: შემოდი ერთხელ, აიღე 4 შესვლა ან გახდი კლუბის წევრი. კლუბის წევრობა ორი 4-შესვლიანი პაკეტის ფასი ღირს - შიგნით კი გარანტირებული კლუბის დღე, საკუთარი 4-შესვლიანი პაკეტი და მენტორის შეხვედრებიც შედის.",
    },
    {
      key: "membership.single.badge",
      label: "ერთჯერადი შესვლის ბარათი - ბეჯი",
      kind: "text",
      default: "ერთჯერადი",
    },
    {
      key: "membership.single.title",
      label: "ერთჯერადი შესვლის ბარათი - სათაური",
      kind: "text",
      default: "ერთჯერადი შესვლა",
    },
    {
      key: "membership.single.cta",
      label: "ერთჯერადი შესვლის ბარათი - ღილაკი",
      kind: "text",
      default: "აირჩიე დღე და დრო",
    },
    {
      key: "membership.single.feature.1",
      label: "ერთჯერადი - პუნქტი 1 ({slots} = სლოტები)",
      kind: "text",
      default: "4-საათიანი სლოტი - {slots}",
    },
    {
      key: "membership.single.feature.2",
      label: "ერთჯერადი - პუნქტი 2",
      kind: "text",
      default: "სამუშაო ადგილი, Wi-Fi და საერთო ზონა",
    },
    {
      key: "membership.single.feature.3",
      label: "ერთჯერადი - პუნქტი 3",
      kind: "text",
      default: "ჯავშანი პირდაპირ საიტიდან",
    },
    {
      key: "membership.fourpack.badge",
      label: "4 შესვლის ბარათი - ბეჯი",
      kind: "text",
      default: "4 შესვლა",
    },
    {
      key: "membership.fourpack.title",
      label: "4 შესვლის ბარათი - სათაური",
      kind: "text",
      default: "4 შესვლის აბონემენტი",
    },
    {
      key: "membership.fourpack.cta",
      label: "4 შესვლის ბარათი - ღილაკი",
      kind: "text",
      default: "იყიდე პაკეტი",
    },
    {
      key: "membership.fourpack.feature.1",
      label: "4 შესვლა - პუნქტი 1 ({slots} = სლოტები)",
      kind: "text",
      default: "4 შესვლა იმავე სლოტებში ({slots})",
    },
    {
      key: "membership.fourpack.feature.2",
      label: "4 შესვლა - პუნქტი 2 ({days} = მოქმედების დღეები)",
      kind: "text",
      default: "მოქმედებს ყიდვიდან {days} დღე",
    },
    {
      key: "membership.fourpack.feature.3",
      label: "4 შესვლა - პუნქტი 3",
      kind: "text",
      default: "ერთი კოდი - დაჯავშნე, როცა მოგიხერხდება",
    },
    {
      key: "membership.club.badge",
      label: "კლუბის ბარათი - ბეჯი",
      kind: "text",
      default: "ყველაზე სრული",
    },
    {
      key: "membership.club.title",
      label: "კლუბის ბარათი - სათაური",
      kind: "text",
      default: "კლუბის წევრობა",
    },
    {
      key: "membership.club.cta",
      label: "კლუბის ბარათი - ღილაკი",
      kind: "text",
      default: "აირჩიე კლუბი",
    },
    {
      key: "membership.club.dealBadge",
      label: "კლუბის ბარათი - აქციური ბეჯი (როცა ფასი = 2 პაკეტს)",
      kind: "text",
      default: "2 პაკეტის ფასად - ერთი საჩუქრად",
    },
    {
      key: "membership.club.mathNote",
      label:
        "კლუბის ბარათი - გამოთვლის ხაზი ({club}, {packs}, {pack} placeholder-ები)",
      kind: "text",
      default: "{club} = {packs} × {pack}",
    },
    {
      key: "membership.club.feature.1",
      label: "კლუბი - პუნქტი 1 ({band} = კლუბის საათები)",
      kind: "text",
      default: "კვირაში 1 გარანტირებული დღე შენს კლუბში ({band})",
    },
    {
      key: "membership.club.feature.2",
      label: "კლუბი - პუნქტი 2 ({pack} = პაკეტის ფასი)",
      kind: "text",
      default:
        "{pack}-იანი 4 შესვლის პაკეტი ყოველ თვეს - ფასშივე შედის, დაჯავშნი როცა გინდა",
    },
    {
      key: "membership.club.feature.3",
      label: "კლუბი - პუნქტი 3",
      kind: "text",
      default:
        "შეხვედრები მენტორთან და მოწვეულ სტუმრებთან (+1.5 საათი) - დამატებითი გადასახადის გარეშე",
    },
    {
      key: "membership.club.feature.4",
      label: "კლუბი - პუნქტი 4",
      kind: "text",
      default: "ფასდაკლება კურსებზე",
    },
    {
      key: "membership.club.feature.5",
      label: "კლუბი - პუნქტი 5",
      kind: "text",
      default: "მეგობრის მოწვევის ბონუსი",
    },
    {
      key: "membership.referral.eyebrow",
      label: "რეფერალის სექცია - eyebrow",
      kind: "text",
      default: "მოიყვანე მეგობარი",
    },
    {
      key: "membership.referral.title",
      label: "რეფერალის სექცია - სათაური",
      kind: "text",
      default: "მეგობრის კოდი - ფასდაკლება ორივესთვის",
    },
    {
      key: "membership.referral.body",
      label: "რეფერალის სექცია - ტექსტი ({percent} = განაკვეთი)",
      kind: "textarea",
      default:
        "კლუბის წევრობის ყიდვისას მიიღებ პირად კოდს. გაუზიარე მეგობარს: ის გაწევრიანებისას −{percent}%-ს მიიღებს, შენ კი შემდეგი თვე −{percent}%-ით დაგიჯდება. თითო მოყვანილი მეგობარი - ერთი ფასდაკლებული თვე.",
    },
    {
      key: "membership.slots.eyebrow",
      label: "განრიგის შენიშვნა - eyebrow",
      kind: "text",
      default: "განრიგი",
    },
    {
      key: "membership.slots.note",
      label: "განრიგის შენიშვნა - ტექსტი",
      kind: "textarea",
      default:
        "შესვლა 4-საათიანი სლოტია: 10:00–14:00, 14:00–18:00 ან 18:00–22:00. 14:00–18:00 ძირითადად კლუბების დროა - ამ შუალედში შესვლა მხოლოდ ცალკეულ დღეებშია ხელმისაწვდომი.",
    },
  ],
};
