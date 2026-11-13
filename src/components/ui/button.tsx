import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "inverted"
  | "invertedOutline";
type Size = "md" | "lg";

/** touch-target ≥44px (§9) */
const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

/**
 * cn() tailwind-merge-ის გარეშე კონფლიქტებს ვერ ხსნის, ამიტომ მუქ ფონზე
 * გამოსაყენებელი ღილაკები ცალკე ვარიანტებია და არა className-გადაფარვა —
 * primary+bg-white კომბინაციაში text-white იმარჯვებდა და წარწერა ქრებოდა.
 */
const variants: Record<Variant, string> = {
  primary: "bg-green-dark text-white hover:bg-green-mid",
  secondary:
    "border border-green-dark text-green-dark hover:bg-green-dark hover:text-white",
  ghost: "text-green-dark hover:bg-white",
  inverted: "bg-white text-green-dark hover:bg-green-light",
  invertedOutline:
    "border border-white text-white hover:bg-white hover:text-green-dark",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-7 py-3 text-base",
};

function classes(variant: Variant, size: Size, className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

/** ღილაკის კლასები raw <a>-სთვის (მაგ. PDF-ის გადმოწერა /uploads/ ბმულით) */
export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return classes(variant, size, className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "className"> & {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
