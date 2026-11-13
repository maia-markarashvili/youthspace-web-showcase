import type { TextGroup } from "../types";

export const dropinTexts: TextGroup = {
  slug: "dropin",
  title: "ერთჯერადი შესვლა",
  entries: [
    {
      key: "dropin.seo.title",
      label: "SEO - გვერდის სათაური",
      kind: "text",
      default: "ერთჯერადი შესვლა",
    },
    {
      key: "dropin.seo.description",
      label: "SEO - გვერდის აღწერა",
      kind: "textarea",
      default:
        "შემოდი სივრცეში 4-საათიანი სლოტით (10:00–14:00, 14:00–18:00 ან 18:00–22:00) ან აიღე 4 შესვლის პაკეტი - დაჯავშნე ადგილი წინასწარ.",
    },
    {
      key: "dropin.hero.eyebrow",
      label: "სათავე - ზედსათაური",
      kind: "text",
      default: "ერთჯერადი შესვლა",
    },
    {
      key: "dropin.hero.title",
      label: "სათავე - H1 სათაური",
      kind: "text",
      default: "შემოდი სივრცეში - აირჩიე შენი დრო",
    },
    {
      key: "dropin.hero.lead",
      label: "სათავე - შესავალი (ჩანს, თუ აღწერა DB-ში ცარიელია)",
      kind: "textarea",
      default:
        "სამუშაო ადგილი, Wi-Fi, ყავა და საერთო ზონა - 4-საათიანი შესვლა შენთვის მოსახერხებელ სლოტში.",
    },
    {
      key: "dropin.benefits.eyebrow",
      label: "„რას იღებ“ ბარათი - ზედსათაური",
      kind: "text",
      default: "რას იღებ",
    },
    {
      key: "dropin.benefits.1",
      label: "„რას იღებ“ - პუნქტი 1",
      kind: "text",
      default: "· სამუშაო ადგილი 4-საათიან სლოტში",
    },
    {
      key: "dropin.benefits.2",
      label: "„რას იღებ“ - პუნქტი 2",
      kind: "text",
      default: "· სწრაფი Wi-Fi და დამატებითი მონიტორები",
    },
    {
      key: "dropin.benefits.3",
      label: "„რას იღებ“ - პუნქტი 3",
      kind: "text",
      default: "· ყავა, ჩაი და საერთო სამზარეულო",
    },
    {
      key: "dropin.benefits.4",
      label: "„რას იღებ“ - პუნქტი 4",
      kind: "text",
      default: "· წვდომა ღია ღონისძიებებზე იმ დღეს",
    },
    {
      key: "dropin.how.eyebrow",
      label: "„როგორ მუშაობს“ ბარათი - ზედსათაური",
      kind: "text",
      default: "როგორ მუშაობს",
    },
    {
      key: "dropin.how.1",
      label: "„როგორ მუშაობს“ - ნაბიჯი 1",
      kind: "text",
      default: "1 · აირჩიე ტარიფი, დღე და სლოტი",
    },
    {
      key: "dropin.how.2",
      label: "„როგორ მუშაობს“ - ნაბიჯი 2",
      kind: "text",
      default: "2 · დაჯავშნე - ადგილი მაშინვე გეჭირება",
    },
    {
      key: "dropin.how.3",
      label: "„როგორ მუშაობს“ - ნაბიჯი 3",
      kind: "text",
      default: "3 · გადარიცხე თანხა და ადმინი დაადასტურებს",
    },
    {
      key: "dropin.bullets.slots",
      label: "პუნქტი - სლოტების ჩამონათვალი ({slots} = დროები ავტომატურად)",
      kind: "text",
      default: "· შესვლა 4-საათიანი სლოტია: {slots}",
    },
    {
      key: "dropin.bullets.midday",
      label: "პუნქტი - 14:00–18:00 შუალედის განმარტება",
      kind: "text",
      default:
        "· 14:00–18:00 ძირითადად კლუბების დროა - ამ შუალედში შესვლა მხოლოდ ცალკეულ დღეებშია ხელმისაწვდომი",
    },
    {
      key: "dropin.bullets.capacity",
      label: "პუნქტი - ადგილების შეზღუდვა",
      kind: "text",
      default:
        "· სლოტში ადგილების რაოდენობა შეზღუდულია - ჯავშანი აუცილებელია; თავისუფალი დროები კალენდარში ჩანს",
    },
    {
      key: "dropin.bullets.cancellation",
      label: "პუნქტი - გაუქმების პირობა",
      kind: "text",
      default:
        "· გაუქმება შესაძლებელია ჯავშნის წინა დღის 10:00 საათამდე ანგარიშის გვერდიდან",
    },
    {
      key: "dropin.pass.note",
      label: "აბონემენტის ტაბი - განმარტება",
      kind: "textarea",
      default:
        "ჯავშნა შესაძლებელია გადახდის დადასტურების შემდეგ. კლუბის წევრებს ბონუს-შესვლები იმავე კოდით აქვთ, რაც წევრობას.",
    },
    {
      key: "dropin.booking.eyebrow",
      label: "ჯავშნის ბარათი - ზედსათაური",
      kind: "text",
      default: "დაჯავშნე ადგილი",
    },
    {
      key: "dropin.booking.lead",
      label: "ჯავშნის ბარათი - შესავალი",
      kind: "text",
      default:
        "აირჩიე ტარიფი, დღე და სლოტი - სიაში მხოლოდ თავისუფალი დროებია ნაჩვენები.",
    },
    {
      key: "dropin.booking.weekendNote",
      label: "ჯავშნის ბარათი - შაბათ-კვირის შენიშვნა",
      kind: "text",
      default: "შაბათ-კვირას სივრცე დაკეტილია, თუ კალენდარში სხვა რამ არ წერია.",
    },
    {
      key: "dropin.booking.empty",
      label: "ჯავშნის ბარათი - თავისუფალი დღეები არ არის",
      kind: "text",
      default: "ამ პერიოდში თავისუფალი დღეები არ არის - სცადე მოგვიანებით.",
    },
  ],
};
