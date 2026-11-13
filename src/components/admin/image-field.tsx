"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { uploadImage } from "@/app/admin/upload-actions";
import { runUpload } from "@/components/admin/upload-client";
import { cn } from "@/lib/cn";

/**
 * ერთი ფოტოს ველი admin-ფორმებისთვის — ატვირთვა server action-ით,
 * მნიშვნელობა (URL) hidden input-ით იგზავნება ფორმასთან ერთად.
 */
export function ImageField({
  name,
  label,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
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
      const result = await runUpload(uploadImage, file, 5 * 1024 * 1024, "5MB");
      if (result.status === "success") setUrl(result.url);
      else setError(result.message);
    });
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className="relative aspect-16/9 w-full max-w-xs overflow-hidden rounded-card border border-line bg-cream">
          <Image src={url} alt={label} fill unoptimized className="object-cover" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => onPick(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="min-h-9 rounded-pill border border-line bg-white px-4 py-1.5 text-sm font-semibold text-ink hover:border-green-mid disabled:opacity-60"
        >
          {pending ? "იტვირთება…" : url ? "შეცვლა" : "ატვირთვა"}
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

      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

/** მრავალი ფოტოს ველი — მნიშვნელობა ერთი hidden input-ით, JSON მასივად */
export function GalleryField({
  name,
  label,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string[];
  className?: string;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const result = await runUpload(uploadImage, file, 5 * 1024 * 1024, "5MB");
      if (result.status === "success") setUrls((prev) => [...prev, result.url]);
      else setError(result.message);
    });
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      {urls.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <li key={`${url}-${index}`} className="relative">
              <div className="relative h-20 w-28 overflow-hidden rounded-card border border-line bg-cream">
                <Image
                  src={url}
                  alt={`${label} ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                aria-label="ფოტოს წაშლა"
                onClick={() =>
                  setUrls((prev) => prev.filter((_, i) => i !== index))
                }
                className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-pill bg-red-700 text-xs text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => onPick(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="min-h-9 rounded-pill border border-line bg-white px-4 py-1.5 text-sm font-semibold text-ink hover:border-green-mid disabled:opacity-60"
        >
          {pending ? "იტვირთება…" : "+ ფოტოს დამატება"}
        </button>
      </div>

      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
