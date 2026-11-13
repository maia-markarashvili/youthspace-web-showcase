import type { TextGroup } from "../types";

/** ბარათით გადახდის ტექსტები (Flitt) */
export const paymentTexts: TextGroup = {
  slug: "payment",
  title: "გადახდა",
  entries: [
    {
      key: "payment.method.label",
      label: "ფორმა - გადახდის მეთოდის სათაური",
      kind: "text",
      default: "როგორ გადაიხდი?",
    },
    {
      key: "payment.method.card",
      label: "ფორმა - ბარათის ვარიანტი",
      kind: "text",
      default: "ბარათით ახლავე",
    },
    {
      key: "payment.method.transfer",
      label: "ფორმა - გადმორიცხვის ვარიანტი",
      kind: "text",
      default: "ბანკით გადმორიცხვა",
    },
    {
      key: "payment.consent.terms.pre",
      label: "ფორმა - თანხმობა წესებზე (ტექსტი ბმულამდე)",
      kind: "text",
      default: "ვეთანხმები",
    },
    {
      key: "payment.consent.terms.link",
      label: "ფორმა - თანხმობა წესებზე (ბმულის ტექსტი)",
      kind: "text",
      default: "წესებსა და პირობებს",
    },
    {
      key: "payment.consent.privacy.pre",
      label: "ფორმა - თანხმობა პერსონალურ მონაცემებზე (ტექსტი ბმულამდე)",
      kind: "text",
      default: "ვეთანხმები",
    },
    {
      key: "payment.consent.privacy.link",
      label: "ფორმა - თანხმობა პერსონალურ მონაცემებზე (ბმულის ტექსტი)",
      kind: "text",
      default: "პერსონალურ მონაცემთა დაცვის წესებს",
    },
    {
      key: "payment.redirect.notice",
      label: "გადამისამართების შეტყობინება",
      kind: "text",
      default: "გადამისამართდები გადახდის უსაფრთხო გვერდზე…",
    },
    {
      key: "payment.redirect.fallback",
      label: "გადამისამართების სათადარიგო ღილაკი",
      kind: "text",
      default: "გადადი გადახდაზე",
    },
    {
      key: "payment.status.seo.title",
      label: "სტატუსის გვერდი - SEO სათაური",
      kind: "text",
      default: "გადახდის სტატუსი",
    },
    {
      key: "payment.status.success.title",
      label: "წარმატება - სათაური",
      kind: "text",
      default: "გადახდა შესრულდა",
    },
    {
      key: "payment.status.success.body",
      label: "წარმატება - ტექსტი",
      kind: "textarea",
      default:
        "მადლობა! შეკვეთა დადასტურებულია და დეტალები SMS-ით/მეილით მიიღე. ჯავშანი შენს ანგარიშშიც ჩანს.",
    },
    {
      key: "payment.status.pending.title",
      label: "მუშავდება - სათაური",
      kind: "text",
      default: "გადახდა მუშავდება",
    },
    {
      key: "payment.status.pending.body",
      label: "მუშავდება - ტექსტი",
      kind: "textarea",
      default:
        "ბანკის პასუხს ველოდებით - ეს რამდენიმე წამს გრძელდება. გვერდი თავად განახლდება.",
    },
    {
      key: "payment.status.failed.title",
      label: "ვერ შედგა - სათაური",
      kind: "text",
      default: "გადახდა ვერ შედგა",
    },
    {
      key: "payment.status.failed.body",
      label: "ვერ შედგა - ტექსტი",
      kind: "textarea",
      default:
        "თანხა არ ჩამოგეჭრა. სცადე ხელახლა შენი ანგარიშის გვერდიდან, ან გადმორიცხე ბანკით.",
    },
    {
      key: "payment.status.notfound.title",
      label: "ვერ მოიძებნა - სათაური",
      kind: "text",
      default: "გადახდა ვერ მოიძებნა",
    },
    {
      key: "payment.status.notfound.body",
      label: "ვერ მოიძებნა - ტექსტი",
      kind: "textarea",
      default:
        "ბმული ვადაგასულია ან არასწორია. შენი შეკვეთა ანგარიშის გვერდზე ჩანს - შედი და ნახავ.",
    },
    {
      key: "payment.status.myOrders",
      label: "ღილაკი - ჩემი ანგარიში",
      kind: "text",
      default: "ჩემი ანგარიში",
    },
  ],
};
