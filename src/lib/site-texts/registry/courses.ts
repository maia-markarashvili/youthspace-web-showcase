import type { TextGroup } from "../types";

export const coursesTexts: TextGroup = {
  slug: "courses",
  title: "კურსები",
  entries: [
    {
      key: "courses.seo.title",
      label: "SEO - გვერდის სათაური",
      kind: "text",
      default: "კურსები",
    },
    {
      key: "courses.seo.description",
      label: "SEO - გვერდის აღწერა",
      kind: "textarea",
      default:
        "პრაქტიკული კურსები მოწვეული ლექტორებისგან - კლუბის წევრებსა და აბონემენტის მფლობელებს შეღავათიანი ფასი.",
    },
    {
      key: "courses.hero.eyebrow",
      label: "სათავე - ზედსათაური",
      kind: "text",
      default: "კურსები",
    },
    {
      key: "courses.hero.title",
      label: "სათავე - H1 სათაური",
      kind: "text",
      default: "მოკლე კურსები, რომლებიც ერთ უნარს ბოლომდე ასწავლიან",
    },
    {
      key: "courses.hero.lead",
      label: "სათავე - შესავალი აბზაცი",
      kind: "textarea",
      default:
        "თითო კურსი კონკრეტული შედეგით სრულდება. კლუბის წევრებსა და აბონემენტის მფლობელებს ავტომატურად ერიცხებათ წევრის ფასი.",
    },
    {
      key: "courses.filters.categoryLabel",
      label: "ფილტრები - კატეგორიის წარწერა",
      kind: "text",
      default: "კატეგორია:",
    },
    {
      key: "courses.filters.all",
      label: "ფილტრები - „ყველა“ ღილაკი",
      kind: "text",
      default: "ყველა",
    },
    {
      key: "courses.filters.priceLabel",
      label: "ფილტრები - ფასის წარწერა",
      kind: "text",
      default: "ფასი:",
    },
    {
      key: "courses.filters.price.1",
      label: "ფასის ფილტრი 1 - ყველა",
      kind: "text",
      default: "ყველა ფასი",
    },
    {
      key: "courses.filters.price.2",
      label: "ფასის ფილტრი 2 - 200 ₾-მდე",
      kind: "text",
      default: "200 ₾-მდე",
    },
    {
      key: "courses.filters.price.3",
      label: "ფასის ფილტრი 3 - 200–400 ₾",
      kind: "text",
      default: "200–400 ₾",
    },
    {
      key: "courses.filters.price.4",
      label: "ფასის ფილტრი 4 - 400 ₾-დან",
      kind: "text",
      default: "400 ₾-დან",
    },
    {
      key: "courses.list.planned.title",
      label: "სია - დაგეგმილი კურსების სათაური",
      kind: "text",
      default: "დაგეგმილი კურსები",
    },
    {
      key: "courses.list.ended.title",
      label: "სია - დასრულებული კურსების სათაური",
      kind: "text",
      default: "დასრულებული კურსები",
    },
    {
      key: "courses.detail.about.title",
      label: "კურსის გვერდი - სრული აღწერის სექციის სათაური",
      kind: "text",
      default: "აღწერა",
    },
    {
      key: "courses.detail.ended",
      label: "კურსის გვერდი - შეტყობინება დასრულებულ კურსზე",
      kind: "textarea",
      default:
        "ეს ნაკადი დასრულებულია - ახალი ნაკადის გამოცხადებას სიახლეებში ნახავ.",
    },
    {
      key: "courses.empty.filtered.title",
      label: "ცარიელი მდგომარეობა (ფილტრით) - სათაური",
      kind: "text",
      default: "ამ ფილტრით კურსი ვერ მოიძებნა",
    },
    {
      key: "courses.empty.filtered.description",
      label: "ცარიელი მდგომარეობა (ფილტრით) - აღწერა",
      kind: "text",
      default: "სცადე სხვა კატეგორია ან ფასის დიაპაზონი.",
    },
    {
      key: "courses.empty.none.title",
      label: "ცარიელი მდგომარეობა (კურსები არაა) - სათაური",
      kind: "text",
      default: "კურსები ჯერ არ არის გამოქვეყნებული",
    },
    {
      key: "courses.empty.none.description",
      label: "ცარიელი მდგომარეობა (კურსები არაა) - აღწერა",
      kind: "text",
      default: "ახალი სეზონის კურსები მალე დაემატება.",
    },
    {
      key: "courses.detail.badge",
      label: "კურსის გვერდი - ბეჯი",
      kind: "text",
      default: "კურსი",
    },
    {
      key: "courses.detail.soldOut",
      label: "კურსის გვერდი - შეტყობინება, როცა ადგილები ამოიწურა",
      kind: "textarea",
      default:
        "ამ ნაკადზე ადგილები ამოიწურა - ახალი ნაკადის გამოცხადებას მალე ნახავ.",
    },
    {
      key: "courses.detail.closed",
      label: "კურსის გვერდი - შეტყობინება, როცა მიღება დასრულებულია",
      kind: "textarea",
      default:
        "ამ ნაკადზე მიღება დასრულებულია - ახალი ნაკადის გამოცხადებას მალე ნახავ.",
    },
    {
      key: "courses.detail.gallery.title",
      label: "კურსის გვერდი - გალერეის სათაური",
      kind: "text",
      default: "კურსი ფოტოებში",
    },
    {
      key: "courses.detail.benefits.title",
      label: "კურსის გვერდი - „რას მიიღებ“ სექციის სათაური",
      kind: "text",
      default: "რას მიიღებ",
    },
    {
      key: "courses.detail.lecturer.eyebrow",
      label: "კურსის გვერდი - ლექტორის ბარათის ზედსათაური",
      kind: "text",
      default: "ვინ გიძღვება",
    },
    {
      key: "courses.landing.member.heroPrefix",
      label: "ლენდინგი - ჰეროს წევრის ფასის წარწერა (ფასი ავტომატურად ემატება)",
      kind: "text",
      default: "კლუბის წევრებს",
    },
    {
      key: "courses.landing.program.title",
      label: "ლენდინგი - პროგრამის სექციის სათაური",
      kind: "text",
      default: "პროგრამა",
    },
    {
      key: "courses.landing.faq.title",
      label: "ლენდინგი - ხშირი კითხვების სექციის სათაური",
      kind: "text",
      default: "ხშირი კითხვები",
    },
    {
      key: "courses.landing.buy.title",
      label: "ლენდინგი - ყიდვის ბლოკის სათაური",
      kind: "text",
      default: "დარეგისტრირდი კურსზე",
    },
    {
      key: "courses.landing.buy.priceLine",
      label: "ლენდინგი - ფასის ხაზის წარწერა (ფასი ავტომატურად ემატება)",
      kind: "text",
      default: "კურსის ღირებულება",
    },
    {
      key: "courses.landing.free.priceLine",
      label:
        "ლენდინგი - ფასის ხაზის ნაცვლად უფასო ღონისძიებაზე (ფასი 0; ციფრი არ ჩანს)",
      kind: "text",
      default: "დასასწრებად საჭიროა წინასწარი რეგისტრაცია",
    },
    {
      key: "courses.landing.free.microcopy",
      label: "ლენდინგი - მიკროტექსტი ველების ქვეშ უფასო ღონისძიებაზე",
      kind: "text",
      default: "ჯავშანს ტელეფონით და კოდით იპოვი",
    },
    {
      key: "courses.landing.member.accordion",
      label: "ლენდინგი - წევრის ფასების აკორდეონის სათაური",
      kind: "text",
      default: "კლუბის წევრი ხარ? ნახე შენი ფასი",
    },
    {
      key: "courses.landing.fields.microcopy",
      label: "ლენდინგი - მიკროტექსტი ველების ქვეშ",
      kind: "text",
      default:
        "ჯავშანს ტელეფონით და კოდით იპოვი · წევრის ფასდაკლება ამ ნომრით ჩაითვლება",
    },
    /* — განვადება: ორი გადახდის ვარიანტი (ციფრები JSX-ში ეწებება) — */
    {
      key: "courses.landing.plan.legend",
      label: "განვადება - არჩევანის სათაური ფორმაში",
      kind: "text",
      default: "გადახდის ვარიანტი",
    },
    {
      key: "courses.landing.plan.monthly",
      label: "განვადება - თვიური ვარიანტის დასახელება",
      kind: "text",
      default: "თვიურად",
    },
    {
      key: "courses.landing.plan.monthlyHint",
      label: "განვადება - თვიურის ქვეწარწერა",
      kind: "text",
      default: "პირველ თვეს ახლა იხდი",
    },
    {
      key: "courses.landing.plan.full",
      label: "განვადება - ერთიანი ვარიანტის დასახელება",
      kind: "text",
      default: "ერთიანად",
    },
    {
      key: "courses.landing.plan.fullHint",
      label: "განვადება - ერთიანის ქვეწარწერა",
      kind: "text",
      default: "ერთი გადახდა",
    },
    {
      key: "courses.landing.plan.totalNote",
      label: "განვადება - ჯამის ინფო-ხაზი (თანხა ავტომატურად ემატება)",
      kind: "text",
      default: "ჯამური გადასახდელი",
    },
    {
      key: "courses.landing.plan.saveNote",
      label: "განვადება - დაზოგვის მინიშნება (თანხა ავტომატურად ემატება)",
      kind: "text",
      default: "ერთიანად გადახდით ზოგავ",
    },
    {
      key: "courses.landing.plan.fullPrefix",
      label: "განვადება - ჰეროს/ბარათის მეორე ხაზი (ფასი ავტომატურად ემატება)",
      kind: "text",
      default: "ან ერთიანად",
    },
    {
      key: "courses.landing.plan.firstMonth",
      label: "განვადება - „პირველი თვე“ წარწერა ღილაკზე და ჩეკზე",
      kind: "text",
      default: "პირველი თვე",
    },
    {
      key: "courses.landing.plan.successNote",
      label: "განვადება - მინაწერი წარმატების ეკრანზე",
      kind: "text",
      default: "დანარჩენ თვეებზე SMS-ით შეგახსენებთ",
    },
    {
      key: "courses.landing.trust",
      label: "ლენდინგი - ნდობის ხაზი ღილაკის ქვეშ",
      kind: "text",
      default: "🔒 დაცული ჯავშანი · დადასტურება WhatsApp-ით",
    },
  ],
};
