import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ButtonLink } from "./button";

/**
 * ერთი სექცია = ერთი მთავარი CTA (§9).
 * `tone` — მონაცვლეობით ფონი, რომ სექციები ვიზუალურად გაიმიჯნოს.
 */
export function Section({
  id,
  tone = "cream",
  className,
  children,
}: {
  id?: string;
  tone?: "cream" | "white" | "dark";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    cream: "bg-cream text-ink",
    white: "bg-white text-ink",
    dark: "bg-green-dark text-white",
  } as const;

  return (
    <section id={id} className={cn("py-12 sm:py-16", tones[tone], className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";

  return (
    <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className={cn("eyebrow", isDark && "text-green-light")}>
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "mt-2 text-h2 font-bold",
            isDark ? "text-white" : "text-green-dark",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-3 text-lead",
              isDark ? "text-white/80" : "text-ink-muted",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <ButtonLink
          href={action.href}
          variant={isDark ? "inverted" : "secondary"}
          className="shrink-0"
        >
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
