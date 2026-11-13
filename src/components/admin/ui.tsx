import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** ადმინის საერთო პრეზენტაციული კომპონენტები (server-safe) */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-h2 font-bold text-green-dark">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex min-h-10 items-center rounded-pill bg-green-dark px-5 py-2 text-sm font-semibold text-white hover:bg-green-mid"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function AdminTable({
  head,
  children,
  className,
}: {
  head: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-card border border-line bg-white shadow-card",
        className,
      )}
    >
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-cream/60">
            {head.map((label) => (
              <th
                key={label}
                scope="col"
                className="px-4 py-3 font-bold whitespace-nowrap text-ink"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-ink-muted">
        {text}
      </td>
    </tr>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-semibold",
        active ? "bg-green-light/40 text-green-dark" : "bg-line text-ink-muted",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-green-dark" : "bg-ink-muted",
        )}
      />
      {active ? "აქტიური" : "გამორთული"}
    </span>
  );
}
