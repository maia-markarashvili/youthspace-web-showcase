import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlClass =
  "min-h-11 w-full rounded-card border border-line bg-white px-4 py-2.5 text-base text-ink placeholder:text-ink-muted/60 focus:border-green-mid";

function Wrapper({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-green-mid"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className,
  id,
  name,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  hint?: string;
  error?: string;
  name: string;
}) {
  const fieldId = id ?? name;
  return (
    <Wrapper
      label={label}
      htmlFor={fieldId}
      required={props.required}
      hint={hint}
      error={error}
    >
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(controlClass, error && "border-red-600", className)}
        {...props}
      />
    </Wrapper>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  id,
  name,
  ...props
}: ComponentProps<"textarea"> & {
  label: string;
  hint?: string;
  error?: string;
  name: string;
}) {
  const fieldId = id ?? name;
  return (
    <Wrapper
      label={label}
      htmlFor={fieldId}
      required={props.required}
      hint={hint}
      error={error}
    >
      <textarea
        id={fieldId}
        name={name}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={cn(controlClass, "min-h-32", error && "border-red-600", className)}
        {...props}
      />
    </Wrapper>
  );
}

/** ბოტების მარტივი ფილტრი — ვიზუალურად და screen reader-ისთვის დამალული */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="company_website">არ შეავსოთ</label>
      <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function FormMessage({
  status,
  children,
}: {
  status: "success" | "error";
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-card px-4 py-3 text-sm font-semibold",
        status === "success"
          ? "bg-green-light/40 text-green-dark"
          : "bg-red-50 text-red-700",
      )}
    >
      {children}
    </p>
  );
}
