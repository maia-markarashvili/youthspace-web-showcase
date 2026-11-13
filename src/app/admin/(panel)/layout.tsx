import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/admin/auth-actions";
import { LogoMark } from "@/components/logo";
import type { AdminRole } from "@/lib/auth/roles";
import { verifyStaff } from "@/lib/auth/session";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { t } from "@/lib/site-texts";

export const metadata: Metadata = {
  title: { default: "ადმინ-პანელი", template: "%s | ადმინი" },
  robots: { index: false, follow: false },
};

/** roles - ვის ეჩვენება ეს ბმული ნავიგაციაში (§3.1 - OWNER_ONLY_PREFIXES-ის
 *  იგივე დაყოფა, აქ კი UI-ის დონეზე). labelKey = სახელი საიტის მენიუს
 *  ტექსტს მიჰყვება (მფლობელი მენიუს რომ არქმევს, ადმინშიც ის ჩანს). */
const NAV: {
  href: string;
  label: string;
  labelKey?: string;
  roles: AdminRole[];
}[] = [
  { href: "/admin", label: "მთავარი", roles: ["admin"] },
  { href: "/admin/desk", label: "მისაღები", roles: ["admin", "reception"] },
  { href: "/admin/visits", label: "ვიზიტები", roles: ["admin"] },
  { href: "/admin/leads", label: "განაცხადები", roles: ["admin"] },
  { href: "/admin/orders", label: "შეკვეთები", roles: ["admin"] },
  { href: "/admin/cancellations", label: "გაუქმებები", roles: ["admin"] },
  {
    href: "/admin/clubs",
    label: "კლუბები",
    labelKey: "menu.nav.clubs.label",
    roles: ["admin"],
  },
  {
    href: "/admin/courses",
    label: "კურსები",
    labelKey: "menu.nav.courses.label",
    roles: ["admin"],
  },
  {
    href: "/admin/spaces",
    label: "სივრცეები",
    labelKey: "menu.nav.spaces.label",
    roles: ["admin"],
  },
  {
    href: "/admin/dropin",
    label: "ერთჯერადი შესვლა",
    labelKey: "menu.nav.dropin.label",
    roles: ["admin"],
  },
  { href: "/admin/calendar", label: "კალენდარი", roles: ["admin"] },
  { href: "/admin/pricing", label: "ფასები", roles: ["admin"] },
  { href: "/admin/hero", label: "ჰერო", roles: ["admin"] },
  { href: "/admin/texts", label: "ტექსტები", roles: ["admin"] },
  {
    href: "/admin/content",
    label: "კონტენტი",
    labelKey: "menu.nav.stories.label",
    roles: ["admin"],
  },
  { href: "/admin/subscribers", label: "გამომწერები", roles: ["admin"] },
  { href: "/admin/users", label: "ადმინები", roles: ["admin"] },
];

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, texts] = await Promise.all([verifyStaff(), getSiteTexts()]);
  const nav = NAV.filter((item) => item.roles.includes(session.role)).map(
    (item) => ({
      ...item,
      label: item.labelKey ? t(texts, item.labelKey) : item.label,
    }),
  );

  return (
    <div className="flex min-h-screen flex-1 bg-cream">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-5 py-5">
          <LogoMark className="h-7 w-auto" />
          <span className="font-bold text-ink">
            სივრცე{" "}
            <span className="text-xs font-semibold tracking-widest text-green-mid uppercase">
              ადმინი
            </span>
          </span>
        </Link>
        <nav aria-label="ადმინის ნავიგაცია" className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-card px-3 py-2 text-sm font-medium text-ink hover:bg-cream"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-xs text-ink-muted">{session.email}</p>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              გასვლა
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* მობილური ზედა ზოლი */}
        <header className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-3 lg:hidden">
          <LogoMark className="h-6 w-auto" />
          <nav className="flex flex-wrap gap-1 text-sm" aria-label="ადმინის ნავიგაცია">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-pill px-2.5 py-1 font-medium text-ink hover:bg-cream"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction} className="ml-auto">
            <button type="submit" className="text-sm font-semibold text-red-700">
              გასვლა
            </button>
          </form>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
