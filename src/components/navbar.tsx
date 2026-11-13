"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site-config";
import { LogoMark } from "./logo";
import { ButtonLink } from "./ui/button";

/**
 * ლეიბლები server-ლეიაუტიდან მოდის props-ით (client-კომპონენტი DB-ს ვერ
 * ეკითხება); ბმულების სტრუქტურა (site)/layout.tsx-ში ცხოვრობს.
 */
type NavbarProps = {
  b2c: { href: string; label: string; short: string }[];
  b2b: { href: string; label: string }[];
  /** კაბინეტის ბმული — ნავიგაციის რიგში კი არა, მარჯვენა კლასტერში */
  accountLabel: string;
  orgLabel: string;
  contactLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
};

/** მომხმარებლის მინიმალისტური SVG-იკონი (ლუპის იმავე სტილში) */
function AccountIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-5 shrink-0"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

/** ლუპის მინიმალისტური SVG-იკონი (icon-set პროექტში არ არსებობს) */
function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-5"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

export function Navbar({
  b2c,
  b2b,
  accountLabel,
  orgLabel,
  contactLabel,
  searchLabel,
  searchPlaceholder,
}: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /* ნავიგაციისას მობილური მენიუ იკეტება — render-დროინდელი state-სწორება,
     effect-ის გარეშე (react-hooks/set-state-in-effect) */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={`${siteConfig.name} - მთავარი`}
        >
          <LogoMark className="h-9 w-auto" />
          {/* ლოგოს wordmark-ის ფერი — მუქი ნაცრისფერი (ink), არა მწვანე */}
          <span className="text-xl font-bold text-ink">
            {siteConfig.name}
          </span>
        </Link>

        <nav
          aria-label="მთავარი ნავიგაცია"
          className="hidden items-center gap-1 lg:flex"
        >
          {b2c.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "rounded-pill px-3 py-2 text-sm font-medium whitespace-nowrap transition hover:bg-cream",
                isActive(link.href) ? "text-green-dark" : "text-ink-muted",
              )}
            >
              {link.short}
            </Link>
          ))}

          <span className="mx-2 h-6 w-px bg-line" aria-hidden />

          <div className="group relative">
            <button
              type="button"
              className="flex min-h-11 items-center gap-1 rounded-pill px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-cream"
              aria-haspopup="true"
            >
              {orgLabel}
              <span aria-hidden className="text-xs">
                ▾
              </span>
            </button>
            <div className="invisible absolute right-0 top-full w-60 rounded-card border border-line bg-white p-2 opacity-0 shadow-card transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              {b2b.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-card px-3 py-2.5 text-sm font-medium text-ink hover:bg-cream"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label={searchLabel}
            title={searchLabel}
            className="hidden size-11 items-center justify-center rounded-pill border border-line text-green-dark transition hover:bg-cream lg:flex"
          >
            <SearchIcon />
          </Link>

          {/* კაბინეტი — ჰედერის ერთადერთი CTA (კლუბების ღილაკი მფლობელის
              გადაწყვეტილებით მოიხსნა). იმავე პრინციპით ჩანს, რაც მას ჰქონდა:
              sm-იდან ზემოთ ღილაკად, მობილურზე კი ქვედა მენიუში */}
          <ButtonLink
            href="/account"
            aria-current={isActive("/account") ? "page" : undefined}
            className="hidden whitespace-nowrap sm:inline-flex"
          >
            <AccountIcon />
            {accountLabel}
          </ButtonLink>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="flex size-11 items-center justify-center rounded-pill border border-line text-green-dark lg:hidden"
          >
            <span className="sr-only">მენიუ</span>
            <span aria-hidden className="text-lg">
              {open ? "×" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-menu" className="border-t border-line bg-white lg:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {/* ძებნა — GET ფორმა; ნავიგაციაზე მენიუ თავად იკეტება */}
            <form action="/search" role="search" className="mb-2 flex gap-2">
              <input
                type="search"
                name="q"
                aria-label={searchLabel}
                placeholder={searchPlaceholder}
                className="min-h-11 w-full rounded-pill border border-line bg-white px-4 py-2 text-base text-ink placeholder:text-ink-muted/60 focus:border-green-mid"
              />
              <button
                type="submit"
                aria-label={searchLabel}
                className="flex size-11 shrink-0 items-center justify-center rounded-pill border border-line text-green-dark"
              >
                <SearchIcon />
              </button>
            </form>

            {b2c.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-card px-3 py-3 text-base font-medium",
                  isActive(link.href)
                    ? "bg-cream text-green-dark"
                    : "text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}

            <p className="mt-4 px-3 text-xs font-semibold tracking-widest text-green-mid uppercase">
              {orgLabel}
            </p>
            {b2b.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-card px-3 py-3 text-base font-medium text-ink"
              >
                {link.label}
              </Link>
            ))}

            {/* კაბინეტი მობილურზეც — desktop-ზე მარჯვენა კლასტერშია */}
            <Link
              href="/account"
              className={cn(
                "mt-4 flex items-center gap-2 rounded-card px-3 py-3 text-base font-medium",
                isActive("/account")
                  ? "bg-cream text-green-dark"
                  : "text-ink",
              )}
            >
              <AccountIcon />
              {accountLabel}
            </Link>

            <Link
              href="/contact"
              className="rounded-card px-3 py-3 text-base font-medium text-ink"
            >
              {contactLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
