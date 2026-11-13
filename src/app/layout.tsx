import type { Metadata } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { GoogleAnalytics } from "@/components/google-analytics";
import { getSiteTextsSafe } from "@/lib/db/queries/site-texts";
import { siteConfig } from "@/lib/site-config";
import { t, toggleOn } from "@/lib/site-texts";
import "./globals.css";

/**
 * ქართული grotesque sans (§9) — next/font self-host-ავს build-ზე.
 * მაქს. 2 შრიფტი; MVP-ში ერთი საკმარისია.
 */
const georgian = Noto_Sans_Georgian({
  subsets: ["latin", "georgian"],
  weight: ["400", "600", "700"],
  variable: "--font-georgian",
  display: "swap",
});

/**
 * საიტის metadata — ტექსტები ადმინიდან იმართება (ტექსტები → „Google და
 * გაზიარება"), default-ები კი რეესტრშია, ამიტომ ბაზის გარეშეც იგივე
 * გამოდის, რაც აქამდე იყო (getSiteTextsSafe).
 *
 * ⚠ `title.default` **მთავარი გვერდის სათაურია**: Next-ის `template` იმ
 * სეგმენტზე არ მოქმედებს, სადაც თვითონაა გამოცხადებული, ამიტომ მთავარი
 * გვერდი „| სივრცე"-ს არ იღებს. მთავარი გვერდის page.tsx-ში `title` განზრახ
 * არ იწერება — თუ ჩაიწერება, ტექსტს სუფიქსი მიეწერება (გამოსავალი იქ
 * `title: { absolute: … }` იქნებოდა).
 */
export async function generateMetadata(): Promise<Metadata> {
  const texts = await getSiteTextsSafe();

  return {
    metadataBase: new URL(siteConfig.url),
    /* Meta-ს (Facebook) დომენის ვერიფიკაცია — Business Manager → Domains;
       ტეგი ყველა გვერდზე ჯდება, FB მთავარს ამოწმებს */
    other: {
      "facebook-domain-verification": "w7l9g3461l1f45dvwhe031gc8ety46",
    },
    title: {
      default: t(texts, "seo.home.title"),
      template: `%s | ${siteConfig.name}`,
    },
    description: t(texts, "seo.default.description"),
    openGraph: {
      type: "website",
      locale: "ka_GE",
      siteName: siteConfig.name,
      title: t(texts, "seo.og.title"),
      description: t(texts, "seo.og.description"),
      /* საიტის default og:image — ამის გარეშე Facebook გვერდიდან თავად ირჩევს
         სურათს (და თუ ის მიუწვდომელია, გაზიარება უსურათოდ რჩება). ლენდინგები
         საკუთარით გადაფარავენ. JPG და არა webp — FB-სთვის ყველაზე საიმედო. */
      images: [
        {
          url: "/images/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "„სივრცის“ ცენტრი - ახალგაზრდები შეხვედრაზე",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

/**
 * Root layout მინიმალურია — საჯარო გარსი (Navbar/Footer/WhatsApp)
 * ცხოვრობს (site)/layout.tsx-ში, ადმინის გარსი — admin/(panel)/layout.tsx-ში.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* ბანერის toggle GA-საც სჭირდება; Safe-ვარიანტი build-ს DB-ის გარეშე
     უძლებს (ცარიელი map → default "on" → implicit გამორთული) */
  const bannerEnabled = toggleOn(
    await getSiteTextsSafe(),
    "shared.cookies.banner",
  );
  return (
    <html
      lang="ka"
      data-scroll-behavior="smooth"
      className={`${georgian.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        {/* ანალიტიკის ჰოსტებზე ადრეული კავშირი — React head-ში ჰოისტავს */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <GoogleAnalytics implicitConsent={!bannerEnabled} />
      </body>
    </html>
  );
}
