import type { TextGroup } from "../types";

export const aboutTexts: TextGroup = {
  slug: "about",
  title: "ჩვენ შესახებ",
  entries: [
    // SEO
    {
      key: "about.seo.title",
      label: "SEO - სათაური",
      kind: "text",
      default: "ჩვენ შესახებ",
    },
    {
      key: "about.seo.description",
      label: "SEO - აღწერა",
      kind: "textarea",
      default:
        "„სივრცის“ მისია და ისტორია - ახალგაზრდული საგანმანათლებლო სივრცე გლდანში. აზროვნება · იდეები · მოქმედება.",
    },
    // შესავალი ბლოკი
    {
      key: "about.hero.eyebrow",
      label: "შესავალი - ზედა წარწერა",
      kind: "text",
      default: "ჩვენი ისტორია",
    },
    {
      key: "about.hero.title",
      label: "შესავალი - მთავარი სათაური",
      kind: "text",
      default: "რატომ შევქმენით „სივრცე“",
    },
    {
      key: "about.hero.p1",
      label: "შესავალი - აბზაცი 1",
      kind: "textarea",
      default:
        "თბილისში ბევრი კარგი წრე და კურსი არსებობს, მაგრამ ცოტაა ადგილი, სადაც ახალგაზრდას შეუძლია უბრალოდ იყოს: მოვიდეს, იმუშაოს, ისაუბროს, სცადოს ახალი რამ და შეცდომის უფლებაც ჰქონდეს.",
    },
    {
      key: "about.hero.p2",
      label: "შესავალი - აბზაცი 2",
      kind: "textarea",
      default:
        "„სივრცე“ - ახალგაზრდული საგანმანათლებლო სივრცე გლდანში - 2026 წლის იანვარში გაიხსნა, ილია ვეკუას ქუჩა 16ა-ში. ჩვენი მისიაა, გავხდეთ ახალგაზრდების შესაძლებლობების განვითარების ჰაბი: აზროვნება · იდეები · მოქმედება.",
    },
    {
      key: "about.hero.p3",
      label: "შესავალი - აბზაცი 3",
      kind: "textarea",
      default:
        "პირველი 100 დღის განმავლობაში ჩატარდა ბიზნესლაბორატორიის ორი კურსი, ლიტერატურული კონკურსი და დებატების ჩემპიონატი, კრიტიკული და მოქნილი აზროვნების კურსი, ლიტერატურული და პიროვნული განვითარების საღამოები და შეხვედრები მშობლებთან.",
    },
    // ფოტო
    {
      key: "about.image",
      label: "შესავალი - ფოტო",
      kind: "image",
      default: "/images/about-brand.jpg",
    },
    {
      key: "about.image.alt",
      label: "შესავალი - ფოტოს აღწერა (alt)",
      kind: "text",
      default: "„სივრცის“ დარბაზი - ლოგო-კედელი",
    },
    // პირველი 100 დღის სტატისტიკა
    {
      key: "about.stats.1.value",
      label: "სტატისტიკა 1 - რიცხვი",
      kind: "text",
      default: "226",
    },
    {
      key: "about.stats.1.label",
      label: "სტატისტიკა 1 - წარწერა",
      kind: "text",
      default: "ახალგაზრდა",
    },
    {
      key: "about.stats.2.value",
      label: "სტატისტიკა 2 - რიცხვი",
      kind: "text",
      default: "29",
    },
    {
      key: "about.stats.2.label",
      label: "სტატისტიკა 2 - წარწერა",
      kind: "text",
      default: "მშობელი",
    },
    {
      key: "about.stats.3.value",
      label: "სტატისტიკა 3 - რიცხვი",
      kind: "text",
      default: "17",
    },
    {
      key: "about.stats.3.label",
      label: "სტატისტიკა 3 - წარწერა",
      kind: "text",
      default: "პროფესიონალი",
    },
    {
      key: "about.stats.4.value",
      label: "სტატისტიკა 4 - რიცხვი",
      kind: "text",
      default: "6",
    },
    {
      key: "about.stats.4.label",
      label: "სტატისტიკა 4 - წარწერა",
      kind: "text",
      default: "განსხვავებული ფორმატი",
    },
    {
      key: "about.stats.caption",
      label: "სტატისტიკა - ქვედა მინაწერი",
      kind: "text",
      default: "პირველი ეტაპის შედეგები - სივრცის ინიციატივებში ჩართულები",
    },
    // აუდიტორია
    {
      key: "about.audiences.eyebrow",
      label: "აუდიტორია - ზედა წარწერა",
      kind: "text",
      default: "აუდიტორია",
    },
    {
      key: "about.audiences.title",
      label: "აუდიტორია - სათაური",
      kind: "text",
      default: "ვისთვის არის სივრცე?",
    },
    {
      key: "about.audiences.lead",
      label: "აუდიტორია - შესავალი ტექსტი",
      kind: "textarea",
      default:
        "პრაქტიკული გამოცდილება, რეალური ჩართულობა და კრიტიკული აზროვნება - სამი აუდიტორიისთვის.",
    },
    {
      key: "about.audiences.1.title",
      label: "აუდიტორია 1 - სათაური",
      kind: "text",
      default: "მოზარდები (13–18 წელი)",
    },
    {
      key: "about.audiences.1.text",
      label: "აუდიტორია 1 - ტექსტი",
      kind: "textarea",
      default:
        "მოზარდებისთვის, რომლებიც პირველ დამოუკიდებელ ნაბიჯებს დგამენ და საჭიროებენ უსაფრთხო, სტრუქტურირებულ გარემოს ფიქრის, ურთიერთობისა და არჩევანის გასააზრებლად.",
    },
    {
      key: "about.audiences.2.title",
      label: "აუდიტორია 2 - სათაური",
      kind: "text",
      default: "ახალგაზრდები (18 წლიდან)",
    },
    {
      key: "about.audiences.2.text",
      label: "აუდიტორია 2 - ტექსტი",
      kind: "textarea",
      default:
        "ახალგაზრდებისთვის, რომლებიც საკუთარი გზის ძიების ეტაპზე არიან და მუშაობენ პასუხისმგებლობის, გადაწყვეტილებებისა და რეალური გამოცდილების დაგროვებაზე.",
    },
    {
      key: "about.audiences.3.title",
      label: "აუდიტორია 3 - სათაური",
      kind: "text",
      default: "მშობლები",
    },
    {
      key: "about.audiences.3.text",
      label: "აუდიტორია 3 - ტექსტი",
      kind: "textarea",
      default:
        "მშობლებისთვის, რომლებიც ეძებენ გააზრებულ, უსაფრთხო სივრცეს, სადაც მათი შვილი ვითარდება ჩარჩოებსა და პასუხისმგებლობაზე დაფუძნებულ გარემოში.",
    },
    // ღირებულებები
    {
      key: "about.values.title",
      label: "ღირებულებები - სექციის სათაური",
      kind: "text",
      default: "სამი პრინციპი, რომლითაც ვმუშაობთ",
    },
    {
      key: "about.values.1.title",
      label: "ღირებულება 1 - სათაური",
      kind: "text",
      default: "გართობა",
    },
    {
      key: "about.values.1.text",
      label: "ღირებულება 1 - ტექსტი",
      kind: "textarea",
      default:
        "დაძაბულობისა და ბარიერების მოსახსნელად - სწავლა აქ თამაშს ჰგავს: დებატი, ფესტივალი, გამოფენა.",
    },
    {
      key: "about.values.2.title",
      label: "ღირებულება 2 - სათაური",
      kind: "text",
      default: "ურთიერთობა",
    },
    {
      key: "about.values.2.text",
      label: "ღირებულება 2 - ტექსტი",
      kind: "textarea",
      default:
        "არგუმენტირებული მსჯელობისა და ემოციური ინტელექტისთვის - კლუბი პირველ რიგში წრეა, თანატოლებით და საერთო საქმით.",
    },
    {
      key: "about.values.3.title",
      label: "ღირებულება 3 - სათაური",
      kind: "text",
      default: "განვითარება",
    },
    {
      key: "about.values.3.text",
      label: "ღირებულება 3 - ტექსტი",
      kind: "textarea",
      default:
        "გააზრებული გადაწყვეტილებისა და რეალური იმედებისთვის - ყოველი ციკლი ხელშესახები შედეგით სრულდება.",
    },
    // დასკვნითი ბლოკი
    {
      key: "about.closing.title",
      label: "დასკვნითი ბლოკი - სათაური",
      kind: "text",
      default: "მოდი და ნახე შენი თვალით",
    },
    {
      key: "about.closing.text",
      label: "დასკვნითი ბლოკი - ტექსტი",
      kind: "textarea",
      default:
        "საუკეთესო გზა გასაცნობად - ერთი დღით შემოსვლა ან კლუბების გაცნობა. კითხვები გაქვს? მოგვწერე.",
    },
    {
      key: "about.closing.cta.clubs",
      label: "დასკვნითი ბლოკი - ღილაკი „კლუბები“",
      kind: "text",
      default: "გაიცანი კლუბები",
    },
    {
      key: "about.closing.cta.contact",
      label: "დასკვნითი ბლოკი - ღილაკი „კონტაქტი“",
      kind: "text",
      default: "კონტაქტი",
    },
  ],
};
