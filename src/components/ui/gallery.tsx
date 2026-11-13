"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * ავთენტური ფოტოების გალერეა lightbox-ით (§9).
 * URL-ები admin-ის ატვირთვიდან მოდის — განზომილება წინასწარ უცნობია,
 * ამიტომ `fill` + `unoptimized` (ოპტიმიზატორის ჩართვის ცდა 2026-08-ში
 * დარევერტდა — ხელახლა ცდისას production-ზე დაუყოვნებლივი შემოწმება სჭირდება).
 */
export function Gallery({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const move = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null
          ? null
          : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex, close, move]);

  if (images.length === 0) return null;

  return (
    <>
      <ul
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
          className,
        )}
      >
        {images.map((src, index) => (
          <li key={`${src}-${index}`}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="relative block aspect-4/3 w-full overflow-hidden rounded-card border border-line bg-cream"
              aria-label={`${alt} - ფოტო ${index + 1}, გასადიდებლად დააჭირე`}
            >
              <Image
                src={src}
                alt={`${alt} - ფოტო ${index + 1}`}
                fill
                unoptimized
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition duration-300 hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={close}
        >
          <div
            className="relative h-[80vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={images[openIndex]}
              alt={`${alt} - ფოტო ${openIndex + 1}`}
              fill
              unoptimized
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-pill bg-white/15 text-2xl text-white hover:bg-white/25"
            aria-label="დახურვა"
          >
            ×
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  move(-1);
                }}
                className="absolute left-4 flex size-11 items-center justify-center rounded-pill bg-white/15 text-2xl text-white hover:bg-white/25"
                aria-label="წინა ფოტო"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  move(1);
                }}
                className="absolute right-4 flex size-11 items-center justify-center rounded-pill bg-white/15 text-2xl text-white hover:bg-white/25"
                aria-label="შემდეგი ფოტო"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** ერთი cover ფოტო ბარათებისთვის; ფოტოს არარსებობისას — მწვანე gradient */
export function CoverImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-16/9 w-full overflow-hidden rounded-card bg-linear-to-br from-green-mid to-green-dark",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      ) : null}
    </div>
  );
}
