import {
  formatLegalDate,
  listLegalVersions,
  type LegalKind,
} from "@/lib/db/queries/legal";

/**
 * იურიდიული დოკუმენტის PDF-ვერსიები — /terms და /privacy გვერდების ბოლოში
 * „მოქმედია {თარიღი}-დან" სია (ყველა ვერსია, უახლესი ზემოთ). ვერსია რომ
 * არ არის, ბლოკი საერთოდ არ ჩანს. server-კომპონენტია (ბაზას კითხულობს).
 */
export async function LegalVersionsList({ kind }: { kind: LegalKind }) {
  const versions = await listLegalVersions(kind);
  if (versions.length === 0) return null;

  return (
    <section className="border-t border-line pt-8">
      <h2 className="text-h3 font-bold text-green-dark">დოკუმენტის ვერსიები</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {versions.map((version) => (
          <li
            key={version.id}
            className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-4 py-3 text-sm"
          >
            <span className="font-semibold text-ink">
              მოქმედია {formatLegalDate(version.effectiveFrom)}-დან
            </span>
            {/* raw <a> განზრახ — /uploads/ route-handler-ის URL-ზე next/link არ გვინდა */}
            <a
              href={version.fileUrl}
              download
              className="font-semibold text-green-dark underline"
            >
              ჩამოტვირთე PDF
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
