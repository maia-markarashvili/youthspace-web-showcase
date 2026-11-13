import { getSiteTexts } from "@/lib/db/queries/site-texts";
import { whatsappLink } from "@/lib/site-config";
import { t } from "@/lib/site-texts";

/** WhatsApp click-to-chat (§3, §5.8) — შეტყობინების შაბლონი რეესტრიდან */
export async function WhatsAppFab() {
  const texts = await getSiteTexts();
  const href = whatsappLink(t(texts, "shared.whatsapp.prefill"));
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 bottom-4 z-30 flex min-h-14 items-center gap-2 rounded-pill bg-green-dark px-5 text-sm font-semibold text-white shadow-card-hover transition hover:bg-green-mid"
      aria-label="დაგვიკავშირდით WhatsApp-ით"
    >
      <span aria-hidden className="text-lg">
        ✆
      </span>
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
