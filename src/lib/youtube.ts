/**
 * YouTube ბმულიდან ვიდეოს ID-ის ამოღება — pure მოდული (admin action-იც და
 * კლიენტის ვიდეო-გრიდიც იყენებს). მხარდაჭერილი ფორმატები:
 *   https://www.youtube.com/watch?v=<id>
 *   https://youtu.be/<id>
 *   https://www.youtube.com/shorts/<id>
 *   https://www.youtube.com/embed/<id>
 *   https://www.youtube.com/live/<id>
 */

const ID_RE = /^[A-Za-z0-9_-]{6,15}$/;

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, "");
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = parsed.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] === "watch") {
      candidate = parsed.searchParams.get("v");
    } else if (["shorts", "embed", "live", "v"].includes(segments[0] ?? "")) {
      candidate = segments[1] ?? null;
    }
  }

  return candidate && ID_RE.test(candidate) ? candidate : null;
}

/** ვიდეოს thumbnail — hqdefault ყველა ვიდეოს აქვს (maxres-ისგან განსხვავებით) */
export function youtubeThumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** embed-ბმული (nocookie დომენი) */
export function youtubeEmbedUrl(id: string, options?: { autoplay?: boolean }): string {
  return `https://www.youtube-nocookie.com/embed/${id}${options?.autoplay ? "?autoplay=1" : ""}`;
}
