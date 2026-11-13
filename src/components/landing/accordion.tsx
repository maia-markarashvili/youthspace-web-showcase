import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * ლენდინგის აკორდეონი — ნატიური <details>/<summary>, JS არ სჭირდება.
 * მწვანე +/− ინდიკატორი group-open:-ით; ნაგულისხმევად დახურული.
 * "use client" არ აქვს — server გვერდებიდანაც და client ფორმებიდანაც იმპორტდება.
 */

export function AccordionItem({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={cn(
        "group rounded-card border border-line bg-white",
        className,
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span
          aria-hidden
          className="shrink-0 text-xl leading-none text-green-dark"
        >
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="px-5 pb-5 text-sm leading-6 text-ink-muted">
        {children}
      </div>
    </details>
  );
}

export function Accordion({
  items,
  className,
}: {
  items: { title: string; body: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item, index) => (
        <AccordionItem key={index} title={item.title}>
          {item.body}
        </AccordionItem>
      ))}
    </div>
  );
}
