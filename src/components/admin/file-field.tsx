"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocument } from "@/app/admin/upload-actions";
import { runUpload } from "@/components/admin/upload-client";
import { cn } from "@/lib/cn";

/**
 * PDF ფაილის ველი admin-ფორმებისთვის (კვლევები) — ImageField-ის კონვენციით:
 * ატვირთვა server action-ით, მნიშვნელობა (URL) hidden input-ით იგზავნება.
 */
export function FileField({
  name,
  label,
  defaultValue,
  hint,
  error: fieldError,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
  error?: string;
  className?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const result = await runUpload(
        uploadDocument,
        file,
        15 * 1024 * 1024,
        "15MB",
      );
      if (result.status === "success") setUrl(result.url);
      else setError(result.message);
    });
  }

  const shownError = error ?? fieldError;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input type="hidden" name={name} value={url} />

      {url ? (
        <p className="flex items-center gap-2 text-sm text-ink">
          <span aria-hidden>📄</span>
          <span className="break-all">{url.split("/").pop()}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-green-dark underline"
          >
            ნახვა
          </a>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => onPick(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="min-h-9 rounded-pill border border-line bg-white px-4 py-1.5 text-sm font-semibold text-ink hover:border-green-mid disabled:opacity-60"
        >
          {pending ? "იტვირთება…" : url ? "შეცვლა" : "PDF-ის ატვირთვა"}
        </button>
        {url ? (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            წაშლა
          </button>
        ) : null}
      </div>

      {hint && !shownError ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
      {shownError ? (
        <p className="text-xs font-semibold text-red-700">{shownError}</p>
      ) : null}
    </div>
  );
}
