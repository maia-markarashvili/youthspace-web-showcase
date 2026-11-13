import { buttonClasses } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * Facebook-ზე გაზიარება — უბრალო sharer.php ბმული (JS SDK/cookie-ის გარეშე).
 * აბსოლუტური URL აუცილებელია, ამიტომ `siteConfig.url`-ს ვურთავთ path-ს.
 * raw <a> განზრახ — გარე დომენზე next/link არ გვინდა.
 */
export function FacebookShare({
  path,
  label = "გააზიარე Facebook-ზე",
}: {
  path: string;
  label?: string;
}) {
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    `${siteConfig.url}${path}`,
  )}`;

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses("secondary", "md")}
    >
      <span aria-hidden>f</span>
      {label}
    </a>
  );
}
