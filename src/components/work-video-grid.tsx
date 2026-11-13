"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/youtube";

/**
 * ვიდეო-ნამუშევრების YouTube-სტილის ბადე: thumbnail-ები img.youtube.com-იდან,
 * კლიკზე ვიდეო საიტზევე იხსნება lightbox-ში (youtube-nocookie embed) —
 * ატვირთვა არ სჭირდება, ადმინი მხოლოდ ბმულს სვამს.
 */

export type WorkVideo = {
  key: string;
  title: string;
  youtubeId: string;
  description: string | null;
  dateLabel: string | null;
};

export function WorkVideoGrid({
  videos,
  className,
}: {
  videos: WorkVideo[];
  className?: string;
}) {
  const [open, setOpen] = useState<WorkVideo | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (videos.length === 0) return null;

  return (
    <>
      <ul className={cn("grid gap-6 sm:grid-cols-2 xl:grid-cols-3", className)}>
        {videos.map((video) => (
          <li key={video.key}>
            <button
              type="button"
              onClick={() => setOpen(video)}
              className="group block w-full text-left"
              aria-label={`${video.title} - ვიდეოს ჩართვა`}
            >
              <span className="relative block aspect-video w-full overflow-hidden rounded-card border border-line bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element -- გარე thumbnail, unoptimized ისედაც */}
                <img
                  src={youtubeThumbnail(video.youtubeId)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="flex size-14 items-center justify-center rounded-pill bg-ink/70 text-2xl text-white transition group-hover:bg-green-dark">
                    ▶
                  </span>
                </span>
              </span>
              <span className="mt-3 block font-bold text-green-dark group-hover:underline">
                {video.title}
              </span>
              {video.description ? (
                <span className="mt-1 block text-sm leading-6 text-ink-muted line-clamp-2">
                  {video.description}
                </span>
              ) : null}
              {video.dateLabel ? (
                <span className="mt-1 block text-sm text-ink-muted">
                  {video.dateLabel}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <iframe
              src={youtubeEmbedUrl(open.youtubeId, { autoplay: true })}
              title={open.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full rounded-card border-0"
            />
            <p className="mt-3 text-center text-sm font-semibold text-white">
              {open.title}
            </p>
            {open.description ? (
              <p className="mx-auto mt-2 max-h-40 max-w-2xl overflow-y-auto text-center text-sm text-white/80">
                {open.description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-pill bg-white/15 text-2xl text-white hover:bg-white/25"
            aria-label="დახურვა"
          >
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
