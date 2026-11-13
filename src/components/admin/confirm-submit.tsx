"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** დესტრუქციული submit ღილაკი confirm-დიალოგით — ფორმის შიგნით გამოიყენება */
export function ConfirmSubmit({
  children,
  confirmText = "დარწმუნებული ხარ? მოქმედება შეუქცევადია.",
  className,
}: {
  children: ReactNode;
  confirmText?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
      className={cn(
        "min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
