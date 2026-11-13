import type { TextGroup } from "../types";

export const homeTexts: TextGroup = {
  slug: "home",
  title: "მთავარი გვერდი",
  entries: [
    /* ── კლუბების სექცია ─────────────────────────────────────────── */
    {
      key: "home.clubs.eyebrow",
      label: "კლუბების სექცია - ზედწარწერა",
      kind: "text",
      default: "ბირთვი",
    },
    {
      key: "home.clubs.title",
      label: "კლუბების სექცია - სათაური",
      kind: "text",
      default: "კლუბები",
    },
    {
      key: "home.clubs.description",
      label: "კლუბების სექცია - აღწერა",
      kind: "textarea",
      default:
        "ოთხი კლუბი - ერთი მიზანი: 15–23 წლის ახალგაზრდების მომზადება დამოუკიდებელი ცხოვრებისთვის. კვირაში ერთი შეხვედრა, 12-შეხვედრიანი ციკლი და ბოლოს - საჯარო ფინალი.",
    },
    {
      key: "home.clubs.action",
      label: "კლუბების სექცია - ღილაკის წარწერა",
      kind: "text",
      default: "ყველა კლუბი",
    },
    {
      key: "home.quiz.teaser",
      label: "კლუბების სექცია - ტესტის თიზერი",
      kind: "text",
      default: "არ იცი, რომელი კლუბი მოგერგება? გაიარე 2-წუთიანი ტესტი 🎯",
    },
    {
      key: "home.quiz.cta",
      label: "კლუბების სექცია - ტესტის ღილაკი",
      kind: "text",
      default: "გაიარე ტესტი →",
    },
    {
      key: "home.clubs.empty.title",
      label: "კლუბების სექცია - ცარიელი მდგომარეობის სათაური",
      kind: "text",
      default: "კლუბები მალე დაემატება",
    },
    {
      key: "home.clubs.empty.description",
      label: "კლუბების სექცია - ცარიელი მდგომარეობის ტექსტი",
      kind: "textarea",
      default:
        "ახალი სეზონის კლუბები ჯერ მზადდება - დატოვე ელფოსტა და პირველი შეიტყობ.",
    },

    /* ── კურსების სექცია ─────────────────────────────────────────── */
    {
      key: "home.courses.eyebrow",
      label: "კურსების სექცია - ზედწარწერა",
      kind: "text",
      default: "ე-კომერსი",
    },
    {
      key: "home.courses.title",
      label: "კურსების სექცია - სათაური",
      kind: "text",
      default: "კურსები",
    },
    {
      key: "home.courses.description",
      label: "კურსების სექცია - აღწერა",
      kind: "textarea",
      default:
        "მოკლე, პრაქტიკული კურსები მოწვეული ლექტორებისგან. კლუბის წევრებსა და აბონემენტის მფლობელებს - შეღავათიანი ფასი.",
    },
    {
      key: "home.courses.action",
      label: "კურსების სექცია - ღილაკის წარწერა",
      kind: "text",
      default: "ყველა კურსი",
    },
    {
      key: "home.courses.empty.title",
      label: "კურსების სექცია - ცარიელი მდგომარეობის სათაური",
      kind: "text",
      default: "კურსები მალე გამოქვეყნდება",
    },
    {
      key: "home.courses.empty.description",
      label: "კურსების სექცია - ცარიელი მდგომარეობის ტექსტი",
      kind: "textarea",
      default: "ახალი სეზონის განრიგზე ვმუშაობთ.",
    },

    /* ── წევრობის სექცია — ბარათები საზიაროა /membership-თან
          (PricingOffers, membership.* key-ები); აქ მხოლოდ სექციის თავია ── */
    {
      key: "home.membership.eyebrow",
      label: "წევრობის სექცია - ზედწარწერა",
      kind: "text",
      default: "წევრობა",
    },
    {
      key: "home.membership.title",
      label: "წევრობის სექცია - სათაური",
      kind: "text",
      default: "პაკეტები და ფასები",
    },
    {
      key: "home.membership.description",
      label: "წევრობის სექცია - აღწერა",
      kind: "textarea",
      default:
        "სამი მარტივი გზა: ერთჯერადი შესვლა, 4 შესვლის აბონემენტი ან კლუბის წევრობა - ბონუს-შესვლებით და კურსების ფასდაკლებით.",
    },
    {
      key: "home.membership.action",
      label: "წევრობის სექცია - ღილაკის წარწერა",
      kind: "text",
      default: "ყველა პაკეტი",
    },

    /* ── ისტორიების სექცია ───────────────────────────────────────── */
    {
      key: "home.stories.eyebrow",
      label: "ისტორიების სექცია - ზედწარწერა",
      kind: "text",
      default: "ნდობა",
    },
    {
      key: "home.stories.title",
      label: "ისტორიების სექცია - სათაური",
      kind: "text",
      default: "ისტორიები სივრციდან",
    },
    {
      key: "home.stories.description",
      label: "ისტორიების სექცია - აღწერა",
      kind: "textarea",
      default:
        "რეალური ფოტოები, წევრების ნამუშევრები და მშობლების გამოხმაურებები.",
    },
    {
      key: "home.stories.action",
      label: "ისტორიების სექცია - ღილაკის წარწერა",
      kind: "text",
      default: "მეტი ისტორია",
    },
    {
      key: "home.stories.empty.title",
      label: "ისტორიების სექცია - ცარიელი მდგომარეობის სათაური",
      kind: "text",
      default: "პირველი ისტორიები მალე",
    },
    {
      key: "home.stories.empty.description",
      label: "ისტორიების სექცია - ცარიელი მდგომარეობის ტექსტი",
      kind: "textarea",
      default:
        "სეზონის დაწყებისთანავე აქ გამოჩნდება ფოტოები და გამოხმაურებები.",
    },

    /* ── B2B ბენდი ───────────────────────────────────────────────── */
    {
      key: "home.b2b.eyebrow",
      label: "B2B ბენდი - ზედწარწერა",
      kind: "text",
      default: "ორგანიზაციებს",
    },
    {
      key: "home.b2b.title",
      label: "B2B ბენდი - სათაური",
      kind: "text",
      default: "გაქვს ივენთი, ტრენინგი ან გუნდური შეხვედრა?",
    },
    {
      key: "home.b2b.body",
      label: "B2B ბენდი - ტექსტი",
      kind: "textarea",
      default:
        "სივრცე ღონისძიებებისთვის მთლიანად ქირავდება. ნახე ხელმისაწვდომი დღეები და 4-საათიანი შუალედები და დაჯავშნე პირდაპირ საიტიდან.",
    },
    {
      key: "home.b2b.cta1",
      label: "B2B ბენდი - ღილაკი 1",
      kind: "text",
      default: "ღონისძიების დაჯავშნა",
    },
    {
      key: "home.b2b.cta2",
      label: "B2B ბენდი - ღილაკი 2",
      kind: "text",
      default: "კურსის პარტნიორობა",
    },

    /* ── ნიუსლეთერის ბლოკი ───────────────────────────────────────── */
    {
      key: "home.newsletter.eyebrow",
      label: "ნიუსლეთერის ბლოკი - ზედწარწერა",
      kind: "text",
      default: "დარჩი კავშირზე",
    },
    {
      key: "home.newsletter.title",
      label: "ნიუსლეთერის ბლოკი - სათაური",
      kind: "text",
      default: "მიიღე სიახლეები ახალი კლუბებისა და კურსების შესახებ",
    },
    {
      key: "home.newsletter.body",
      label: "ნიუსლეთერის ბლოკი - ტექსტი",
      kind: "textarea",
      default:
        "თვეში ერთი წერილი - რეგისტრაციის ვადები, ახალი კურსები და ღია ღონისძიებები. სპამის გარეშე.",
    },

    /* ── კონტაქტის ბარათი ────────────────────────────────────────── */
    {
      key: "home.contact.eyebrow",
      label: "კონტაქტის ბარათი - ზედწარწერა",
      kind: "text",
      default: "კონტაქტი",
    },
    {
      key: "home.contact.title",
      label: "კონტაქტის ბარათი - სათაური",
      kind: "text",
      default: "გაქვს შეკითხვა? მოგვწერე.",
    },
    {
      key: "home.contact.facebook",
      label: "კონტაქტის ბარათი - Facebook-ბმულის წარწერა",
      kind: "text",
      default: "Facebook: YouthSpace.ge",
    },
    {
      key: "home.contact.instagram",
      label: "კონტაქტის ბარათი - Instagram-ბმულის წარწერა",
      kind: "text",
      default: "Instagram: @youthspace.ge",
    },
    {
      key: "home.contact.cta",
      label: "კონტაქტის ბარათი - ღილაკის წარწერა",
      kind: "text",
      default: "კონტაქტის გვერდი",
    },
    {
      key: "home.contact.whatsapp",
      label: "კონტაქტის ბარათი - WhatsApp-მინაწერი",
      kind: "text",
      default: "ან მოგვწერე WhatsApp-ით - ღილაკი ეკრანის ქვედა კუთხეშია.",
    },
  ],
};
