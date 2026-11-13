import type { TextGroup } from "../types";

/** საერთო ელემენტები: ბარათების ლეიბლები, 404, WhatsApp-ღილაკი და ა.შ. */
export const sharedTexts: TextGroup = {
  slug: "shared",
  title: "საერთო ელემენტები",
  entries: [
    /* — WhatsApp მცურავი ღილაკი — */
    {
      key: "shared.whatsapp.prefill",
      label: "WhatsApp-ღილაკი - შეტყობინების შაბლონი",
      kind: "text",
      default: "გამარჯობა! მაინტერესებს „სივრცე“.",
    },
    /* — 404 გვერდი — */
    {
      key: "shared.notfound.eyebrow",
      label: "404 - ზედა წარწერა",
      kind: "text",
      default: "404",
    },
    {
      key: "shared.notfound.title",
      label: "404 - სათაური",
      kind: "text",
      default: "ეს გვერდი ვერ მოიძებნა",
    },
    {
      key: "shared.notfound.body",
      label: "404 - ტექსტი",
      kind: "textarea",
      default:
        "შესაძლოა ბმული შეიცვალა ან გვერდი აღარ არსებობს. დაბრუნდი მთავარზე ან გაეცანი კლუბებს.",
    },
    {
      key: "shared.notfound.cta-home",
      label: "404 - მთავარის ღილაკი",
      kind: "text",
      default: "მთავარი გვერდი",
    },
    {
      key: "shared.notfound.cta-clubs",
      label: "404 - კლუბების ღილაკი",
      kind: "text",
      default: "კლუბები",
    },
    /* — ბარათების ლეიბლები — */
    {
      key: "shared.cards.club.link",
      label: "კლუბის ბარათი - ბმულის ლეიბლი",
      kind: "text",
      default: "გაიცანი კლუბი →",
    },
    {
      key: "shared.cards.course.link",
      label: "კურსის ბარათი - ბმულის ლეიბლი",
      kind: "text",
      default: "კურსის დეტალები →",
    },
    {
      key: "shared.cards.sale",
      label: "ბარათი - „აქცია“ ბეჯი",
      kind: "text",
      default: "აქცია",
    },
    {
      key: "shared.cards.permonth",
      label: "კლუბის ბარათი - „თვეში“ მინაწერი ფასთან",
      kind: "text",
      default: "თვეში",
    },
    {
      key: "shared.cards.fullPrice",
      label: "კურსის ბარათი - განვადებისას მეორე ხაზი (ფასი ავტომატურად ემატება)",
      kind: "text",
      default: "ან ერთიანად",
    },
    {
      key: "shared.cards.soldout",
      label: "კლუბის ბარათი - ამოწურული ადგილების ბეჯი",
      kind: "text",
      default: "ადგილები ამოიწურა",
    },
    {
      key: "shared.cards.ended",
      label: "კურსის ბარათი - დასრულებულის ბეჯი",
      kind: "text",
      default: "დასრულებული",
    },
    {
      key: "shared.cards.closed",
      label: "კლუბი/კურსი - დახურული მიღების ბეჯი (ბარათები და ჰერო)",
      kind: "text",
      default: "მიღება დასრულებულია",
    },
    /* — ისტორიების ტიპების ლეიბლები — */
    {
      key: "shared.contenttype.news",
      label: "ისტორიის ტიპი - სიახლე",
      kind: "text",
      default: "სიახლე",
    },
    {
      key: "shared.contenttype.work-text",
      label: "ისტორიის ტიპი - ნამუშევარი (ტექსტი)",
      kind: "text",
      default: "ტექსტი",
    },
    {
      key: "shared.contenttype.work-video",
      label: "ისტორიის ტიპი - ნამუშევარი (ვიდეო)",
      kind: "text",
      default: "ვიდეო",
    },
    {
      key: "shared.contenttype.work-research",
      label: "ისტორიის ტიპი - ნამუშევარი (კვლევა)",
      kind: "text",
      default: "კვლევა",
    },
    /* — Cookie-თანხმობის ბანერი (2026-09-04) —
       მოხსნილი toggle = ბანერი იმალება და ანალიტიკა (Pixel/GA) ცხადი
       თანხმობის გარეშეც ირთვება (implicit) - მფლობელის გადაწყვეტილება
       რეკლამის პერიოდებისთვის. შენახული „არა"-cookie მაინც სრულდება. */
    {
      key: "shared.cookies.banner",
      label:
        "Cookie-თანხმობის ბანერი (მოხსნილი = ბანერი იმალება და ანალიტიკა ავტომატურად ირთვება; ვიზიტორის შენახული უარი მაინც სრულდება)",
      kind: "toggle",
      default: "on",
      disablable: true,
    },
  ],
};
