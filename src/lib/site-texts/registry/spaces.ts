import type { TextGroup } from "../types";

/**
 * ღონისძიების დაჯავშნის ერთიანი გვერდი (/spaces) — 2026-08-30 რედიზაინი:
 * სივრცე მხოლოდ მთლიანად ქირავდება, ფასი = სლოტის ფასი + ხალხის საფეხური.
 * ფასების რიცხვები ადმინის „ფასები" გვერდიდან მოდის — აქ მხოლოდ ტექსტებია.
 */
export const spacesTexts: TextGroup = {
  slug: "spaces",
  title: "ღონისძიების დაჯავშნა",
  entries: [
    {
      key: "spaces.seo.title",
      label: "SEO - გვერდის სათაური",
      kind: "text",
      default: "ღონისძიების დაჯავშნა",
    },
    {
      key: "spaces.seo.description",
      label: "SEO - გვერდის აღწერა",
      kind: "textarea",
      default:
        "დაჯავშნე მთელი სივრცე შენი ღონისძიებისთვის - აირჩიე დღე და დრო კალენდრიდან, ფასი დამოკიდებულია სლოტსა და დამსწრეთა რაოდენობაზე.",
    },
    {
      key: "spaces.hero.eyebrow",
      label: "სათავე - ზედსათაური",
      kind: "text",
      default: "ორგანიზაციებსა და კერძო ღონისძიებებს",
    },
    {
      key: "spaces.hero.title",
      label: "სათავე - H1 სათაური",
      kind: "text",
      default: "დაჯავშნე სივრცე შენი ღონისძიებისთვის",
    },
    {
      key: "spaces.hero.lead",
      label: "სათავე - შესავალი აბზაცი",
      kind: "textarea",
      default:
        "მთელი სივრცე ერთ ღონისძიებას ეთმობა. აირჩიე თავისუფალი დღე და დრო კალენდრიდან, მიუთითე დამსწრეთა რაოდენობა და გადაიხადე პირდაპირ საიტიდან.",
    },
    {
      key: "spaces.empty.title",
      label: "ცარიელი მდგომარეობა - სათაური",
      kind: "text",
      default: "სივრცის გვერდი მზადდება",
    },
    {
      key: "spaces.empty.description",
      label: "ცარიელი მდგომარეობა - აღწერა",
      kind: "text",
      default: "დაგვიკავშირდი და ინდივიდუალურად შევათანხმებთ პირობებს.",
    },
    {
      key: "spaces.empty.slots",
      label: "თავისუფალი დრო არ არის - შეტყობინება",
      kind: "textarea",
      default:
        "უახლოეს დღეებში თავისუფალი დრო არ არის. დატოვე მოთხოვნა და დაგიკავშირდებით, როგორც კი გამოთავისუფლდება.",
    },
    {
      key: "spaces.lead.hint",
      label: "მოთხოვნის ფორმა - შეტყობინების მინიშნება",
      kind: "text",
      default: "მიუთითე სასურველი დღე და 4-საათიანი შუალედი",
    },
    {
      key: "spaces.lead.submit",
      label: "მოთხოვნის ფორმა - ღილაკი",
      kind: "text",
      default: "გააგზავნე ჯავშნის მოთხოვნა",
    },
    {
      key: "spaces.steps.1.title",
      label: "ნაბიჯი 1 - სათაური",
      kind: "text",
      default: "1 · აირჩიე დრო",
    },
    {
      key: "spaces.steps.1.text",
      label: "ნაბიჯი 1 - ტექსტი",
      kind: "textarea",
      default:
        "აირჩიე თავისუფალი დღე და 4-საათიანი შუალედი კალენდრიდან. დაკავებული დრო ავტომატურად იბლოკება.",
    },
    {
      key: "spaces.steps.2.title",
      label: "ნაბიჯი 2 - სათაური",
      kind: "text",
      default: "2 · მიუთითე რაოდენობა",
    },
    {
      key: "spaces.steps.2.text",
      label: "ნაბიჯი 2 - ტექსტი",
      kind: "textarea",
      default:
        "ფასი დამოკიდებულია დროსა და დამსწრეთა რაოდენობაზე - ჯამი ფორმაშივე ჩანს, დამალული გადასახადების გარეშე.",
    },
    {
      key: "spaces.steps.3.title",
      label: "ნაბიჯი 3 - სათაური",
      kind: "text",
      default: "3 · გადაიხადე",
    },
    {
      key: "spaces.steps.3.text",
      label: "ნაბიჯი 3 - ტექსტი",
      kind: "textarea",
      default:
        "გადაიხადე ბარათით ან გადარიცხვით. გაუქმება შესაძლებელია ჯავშნის წინა დღის 10:00 საათამდე.",
    },
    {
      key: "spaces.banner.title",
      label: "ბანერი - სათაური",
      kind: "text",
      default: "გჭირდება არასტანდარტული ფორმატი?",
    },
    {
      key: "spaces.banner.text",
      label: "ბანერი - ტექსტი",
      kind: "textarea",
      default:
        "მრავალდღიანი ტრენინგი, ქეთერინგი ან სპეციალური განლაგება - მოგვწერე და ინდივიდუალურ პირობებს შევათანხმებთ.",
    },
    {
      key: "spaces.banner.cta",
      label: "ბანერი - CTA ღილაკი",
      kind: "text",
      default: "დაგვიკავშირდი",
    },
    {
      key: "spaces.inventory.eyebrow",
      label: "ინვენტარის ბლოკის ზედსათაური",
      kind: "text",
      default: "ინვენტარი",
    },
    {
      key: "spaces.tiers.row",
      label: "რაოდენობის წარწერა ({n} = რიცხვი) - ბეჯზეც და ფორმაშიც",
      kind: "text",
      default: "{n} ადამიანამდე",
    },
    {
      key: "spaces.cta.question",
      label: "შეკითხვის ღილაკი",
      kind: "text",
      default: "მაქვს დამატებითი შეკითხვა",
    },
    {
      key: "spaces.gallery.title",
      label: "გალერეის სათაური",
      kind: "text",
      default: "სივრცე ფოტოებში",
    },
    {
      key: "spaces.form.slot.legend",
      label: "ფორმა - დროის არჩევის წარწერა",
      kind: "text",
      default: "აირჩიე დღე და დრო",
    },
    {
      key: "spaces.form.tier.legend",
      label: "ფორმა - რაოდენობის არჩევის წარწერა",
      kind: "text",
      default: "რამდენი ადამიანი მოვა?",
    },
    {
      key: "spaces.form.note.label",
      label: "ფორმა - შენიშვნის ველის სახელი",
      kind: "text",
      default: "შენიშვნა",
    },
    {
      key: "spaces.form.note.hint",
      label: "ფორმა - შენიშვნის ველის მინიშნება",
      kind: "text",
      default: "არასავალდებულო - მაგ. სავარაუდო დამსწრეთა რაოდენობა",
    },
    {
      key: "spaces.form.total.label",
      label: "ფორმა - ჯამის წარწერა",
      kind: "text",
      default: "ჯამური ღირებულება",
    },
    {
      key: "spaces.form.name.label",
      label: "ფორმა - ველი „სახელი“",
      kind: "text",
      default: "სახელი",
    },
    {
      key: "spaces.form.phone.label",
      label: "ფორმა - ველი „ტელეფონი“",
      kind: "text",
      default: "ტელეფონი",
    },
    {
      key: "spaces.form.email.label",
      label: "ფორმა - ველი „ელფოსტა“",
      kind: "text",
      default: "ელფოსტა",
    },
    {
      key: "spaces.form.submit",
      label: "ფორმა - გაგზავნის ღილაკი",
      kind: "text",
      default: "დაჯავშნე სივრცე",
    },
    {
      key: "spaces.form.pending",
      label: "ფორმა - ღილაკი გაგზავნისას",
      kind: "text",
      default: "იგზავნება…",
    },
    /* ── წარმატების ეკრანი (ჯავშნის შემდეგ) ── */
    {
      key: "spaces.success.title",
      label: "წარმატება - სათაური",
      kind: "text",
      default: "შეკვეთა მიღებულია!",
    },
    {
      key: "spaces.success.code.label",
      label: "წარმატება - კოდის წარწერა",
      kind: "text",
      default: "შენი კოდი",
    },
    {
      key: "spaces.success.amount.label",
      label: "წარმატება - გადასახდელის წარწერა",
      kind: "text",
      default: "გადასახდელი:",
    },
    {
      key: "spaces.success.requisites.empty",
      label: "წარმატება - როცა რეკვიზიტები ფასების გვერდზე არ წერია",
      kind: "text",
      default: "ანგარიშის რეკვიზიტები გამოგზავნილია მეილზე.",
    },
    {
      key: "spaces.success.transfer.note",
      label: "წარმატება - გადარიცხვის მინაწერი",
      kind: "text",
      default: "გადარიცხვის შემდეგ ადმინი დაადასტურებს შეკვეთას.",
    },
    {
      key: "spaces.success.saveCode",
      label: "წარმატება - კოდის შენახვის მინაწერი",
      kind: "textarea",
      default:
        "შეინახე ეს კოდი. ჯავშანს ნებისმიერ დროს ნახავ შენს ანგარიშში - იმავე ელფოსტით დარეგისტრირდი და კოდის დამახსოვრება აღარ დაგჭირდება.",
    },
    {
      key: "spaces.success.account.link",
      label: "წარმატება - ბმული ანგარიშზე",
      kind: "text",
      default: "ჩემი ანგარიში →",
    },
  ],
};
