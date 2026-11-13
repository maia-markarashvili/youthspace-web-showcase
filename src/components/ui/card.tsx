import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-card border border-line bg-white p-6 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** ბარათი, რომელიც მთლიანად ბმულია (კლუბი/კურსი/სივრცე/სთორი) */
export function LinkCard({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-card border border-line bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-green-mid hover:shadow-card-hover",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "outline";
}) {
  const tones = {
    neutral: "bg-cream text-ink-muted",
    accent: "bg-green-light/40 text-green-dark",
    outline: "border border-line text-ink-muted",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** ცარიელი მდგომარეობა — DB-ში ჯერ არაფერია (admin შეავსებს) */
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <p className="text-h3 font-semibold text-green-dark">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}
