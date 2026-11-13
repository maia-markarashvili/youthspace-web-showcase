import type { TextGroup } from "../types";

/** navbar-ისა და ფუტერის ლეიბლები — hrefs/სტრუქტურა კოდში რჩება */
export const menuTexts: TextGroup = {
  slug: "menu",
  title: "მენიუ და ფუტერი",
  entries: [
    /* — ჰედერის ნავიგაცია — */
    {
      key: "menu.nav.clubs.label",
      label: "ნავიგაცია - კლუბები (სრული)",
      kind: "text",
      default: "კლუბები",
    },
    {
      key: "menu.nav.clubs.short",
      label: "ნავიგაცია - კლუბები (მოკლე)",
      kind: "text",
      default: "კლუბები",
    },
    {
      key: "menu.nav.courses.label",
      label: "ნავიგაცია - კურსები (სრული)",
      kind: "text",
      default: "კურსები",
    },
    {
      key: "menu.nav.courses.short",
      label: "ნავიგაცია - კურსები (მოკლე)",
      kind: "text",
      default: "კურსები",
    },
    {
      key: "menu.nav.membership.label",
      label: "ნავიგაცია - პაკეტები (სრული)",
      kind: "text",
      default: "პაკეტები",
    },
    {
      key: "menu.nav.membership.short",
      label: "ნავიგაცია - პაკეტები (მოკლე)",
      kind: "text",
      default: "პაკეტები",
    },
    {
      key: "menu.nav.dropin.label",
      label: "ნავიგაცია - ერთჯერადი შესვლა (სრული)",
      kind: "text",
      default: "ერთჯერადი შესვლა",
    },
    {
      key: "menu.nav.dropin.short",
      label: "ნავიგაცია - ერთჯერადი შესვლა (მოკლე)",
      kind: "text",
      default: "ერთჯერადი",
    },
    {
      key: "menu.nav.my.short",
      label: "ჰედერის ღილაკი - ჩემი ანგარიში",
      kind: "text",
      default: "ჩემი ანგარიში",
    },
    {
      key: "menu.nav.stories.label",
      label: "ნავიგაცია - ისტორიები (სრული)",
      kind: "text",
      default: "ისტორიები",
    },
    {
      key: "menu.nav.stories.short",
      label: "ნავიგაცია - ისტორიები (მოკლე)",
      kind: "text",
      default: "ისტორიები",
    },
    {
      key: "menu.nav.spaces.label",
      label: "ნავიგაცია - ღონისძიების დაჯავშნა",
      kind: "text",
      default: "ღონისძიების დაჯავშნა",
    },
    {
      key: "menu.nav.partner.label",
      label: "ნავიგაცია - კურსის პარტნიორობა",
      kind: "text",
      default: "კურსის პარტნიორობა",
    },
    {
      key: "menu.nav.org",
      label: "ნავიგაცია - „ორგანიზაციებს“ ჯგუფის სათაური",
      kind: "text",
      default: "ორგანიზაციებს",
    },
    {
      key: "menu.nav.contact",
      label: "მობილური მენიუ - კონტაქტის ბმული",
      kind: "text",
      default: "კონტაქტი",
    },
    {
      key: "menu.nav.search",
      label: "ჰედერი - ძებნის ღილაკის ლეიბლი",
      kind: "text",
      default: "ძებნა",
    },
    /* — ფუტერის სვეტები — */
    {
      key: "menu.footer.col1.title",
      label: "ფუტერი - 1-ლი სვეტის სათაური",
      kind: "text",
      default: "ახალგაზრდებს",
    },
    {
      key: "menu.footer.col2.title",
      label: "ფუტერი - მე-2 სვეტის სათაური",
      kind: "text",
      default: "ორგანიზაციებს",
    },
    {
      key: "menu.footer.col3.title",
      label: "ფუტერი - მე-3 სვეტის სათაური",
      kind: "text",
      default: "ცენტრი",
    },
    /* — ფუტერის ბმულები — */
    {
      key: "menu.footer.link.clubs",
      label: "ფუტერი - ბმული „კლუბები“",
      kind: "text",
      default: "კლუბები",
    },
    {
      key: "menu.footer.link.courses",
      label: "ფუტერი - ბმული „კურსები“",
      kind: "text",
      default: "კურსები",
    },
    {
      key: "menu.footer.link.membership",
      label: "ფუტერი - ბმული „პაკეტები“",
      kind: "text",
      default: "პაკეტები",
    },
    {
      key: "menu.footer.link.dropin",
      label: "ფუტერი - ბმული „ერთჯერადი შესვლა“",
      kind: "text",
      default: "ერთჯერადი შესვლა",
    },
    {
      key: "menu.footer.link.tests",
      label: "ფუტერი - ბმული „ტესტები“",
      kind: "text",
      default: "ტესტები",
    },
    {
      key: "menu.footer.link.spaces",
      label: "ფუტერი - ბმული „ღონისძიების დაჯავშნა“",
      kind: "text",
      default: "ღონისძიების დაჯავშნა",
    },
    {
      key: "menu.footer.link.partner",
      label: "ფუტერი - ბმული „კურსის პარტნიორობა“",
      kind: "text",
      default: "კურსის პარტნიორობა",
    },
    {
      key: "menu.footer.link.about",
      label: "ფუტერი - ბმული „ჩვენ შესახებ“",
      kind: "text",
      default: "ჩვენ შესახებ",
    },
    {
      key: "menu.footer.link.stories",
      label: "ფუტერი - ბმული „ისტორიები“",
      kind: "text",
      default: "ისტორიები",
    },
    {
      key: "menu.footer.link.my",
      label: "ფუტერი - ბმული „ჩემი ანგარიში“",
      kind: "text",
      default: "ჩემი ანგარიში",
    },
    {
      key: "menu.footer.link.contact",
      label: "ფუტერი - ბმული „კონტაქტი“",
      kind: "text",
      default: "კონტაქტი",
    },
    {
      key: "menu.footer.link.terms",
      label: "ფუტერი - ბმული „წესები და პირობები“",
      kind: "text",
      default: "წესები და პირობები",
    },
    {
      key: "menu.footer.link.privacy",
      label: "ფუტერი - ბმული „პერსონალურ მონაცემთა დაცვა“",
      kind: "text",
      default: "პერსონალურ მონაცემთა დაცვის წესები",
    },
    /* — ფუტერის დანარჩენი — */
    {
      key: "menu.footer.newsletter.title",
      label: "ფუტერი - სიახლეების ბლოკის სათაური",
      kind: "text",
      default: "მიიღე სიახლეები ჩვენი ცენტრიდან",
    },
    {
      key: "menu.footer.whatsapp.prefill",
      label: "ფუტერი - WhatsApp-შეტყობინების შაბლონი",
      kind: "text",
      default: "გამარჯობა! მაინტერესებს „სივრცე“.",
    },
  ],
};
