import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { t } from "@/lib/site-texts";

/**
 * Საიტის საერთო გარსი — skip-link + Navbar + main + Footer + WhatsApp FAB.
 * Იზიარებს (site) და (landing) layout-ები, რომ ნავიგაცია ყველგან
 * იდენტური იყოს და ერთ ადგილას იცვლებოდეს.
 */
export async function SiteShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const texts = await getSiteTexts();

  /**
   * ორი ცალკე ნავიგაციის ტოტი (§3, patterns §1):
   * B2C დომინანტი, B2B — დისკრეტული „ორგანიზაციებს“ ჯგუფი.
   * hrefs/სტრუქტურა კოდში რჩება, ლეიბლები — ტექსტების რეესტრიდან.
   * `short` — დესკტოპის ჰედერისთვის, რომ მენიუ ერთ ხაზზე ეტეოდეს;
   * მობილურის ვერტიკალურ მენიუში სრული `label` რჩება.
   */
  /* „ჩვენ შესახებ“ განზრახ არ არის ჰედერში — ბმული ფუტერშია და hero-ს CTA-ში */
  const b2c = [
    {
      href: "/clubs",
      label: t(texts, "menu.nav.clubs.label"),
      short: t(texts, "menu.nav.clubs.short"),
    },
    {
      href: "/courses",
      label: t(texts, "menu.nav.courses.label"),
      short: t(texts, "menu.nav.courses.short"),
    },
    /* ერთჯერადი პაკეტებზე წინ — მოსინჯვა ჯერ, აბონემენტი მერე */
    {
      href: "/drop-in",
      label: t(texts, "menu.nav.dropin.label"),
      short: t(texts, "menu.nav.dropin.short"),
    },
    {
      href: "/membership",
      label: t(texts, "menu.nav.membership.label"),
      short: t(texts, "menu.nav.membership.short"),
    },
    {
      href: "/stories",
      label: t(texts, "menu.nav.stories.label"),
      short: t(texts, "menu.nav.stories.short"),
    },
  ];

  const b2b = [
    { href: "/spaces", label: t(texts, "menu.nav.spaces.label") },
    { href: "/partner", label: t(texts, "menu.nav.partner.label") },
  ];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-pill focus:bg-green-dark focus:px-5 focus:py-3 focus:text-white"
      >
        გადადი მთავარ შიგთავსზე
      </a>
      <Navbar
        b2c={b2c}
        b2b={b2b}
        /* კაბინეტი ნავიგაციის რიგში დამაბნეველი იყო — მარჯვენა კლასტერშია,
           ძებნის გვერდით, და სწორედ ის არის ჰედერის მწვანე ღილაკი. შესვლის
           გარეშე /account თავად აგდებს /login-ზე, ამიტომ ლეიაუტს cookie-ს
           კითხვა (და გლობალური dynamic rendering) არ სჭირდება. */
        accountLabel={t(texts, "menu.nav.my.short")}
        orgLabel={t(texts, "menu.nav.org")}
        contactLabel={t(texts, "menu.nav.contact")}
        searchLabel={t(texts, "menu.nav.search")}
        searchPlaceholder={t(texts, "search.input.placeholder")}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
