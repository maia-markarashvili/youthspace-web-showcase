import Link from "next/link";
import { inArray } from "drizzle-orm";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import {
  formatLegalDate,
  listLegalVersions,
  type LegalKind,
} from "@/lib/db/queries/legal";
import { siteTexts } from "@/lib/db/schema";
import { TEXT_GROUPS } from "@/lib/site-texts";
import { deleteLegalVersion } from "./legal-actions";
import { LegalVersionForm } from "./legal-version-form";
import { TextsForm } from "./texts-form";

export const dynamic = "force-dynamic";

export default async function TextsAdminPage(props: PageProps<"/admin/texts">) {
  await verifyOwner();

  const searchParams = await props.searchParams;
  const rawGroup = searchParams.group;
  const activeSlug =
    typeof rawGroup === "string" ? rawGroup : TEXT_GROUPS[0].slug;
  const group =
    TEXT_GROUPS.find((item) => item.slug === activeSlug) ?? TEXT_GROUPS[0];

  /* მხოლოდ ამ ჯგუფის override-ები — რიგის არარსებობა default-ს ნიშნავს */
  const keys = group.entries.map((entry) => entry.key);
  const overrides =
    keys.length > 0
      ? await db.select().from(siteTexts).where(inArray(siteTexts.key, keys))
      : [];
  const overrideMap = new Map(overrides.map((row) => [row.key, row.value]));

  const entries = group.entries.map((entry) => ({
    key: entry.key,
    label: entry.label,
    kind: entry.kind,
    default: entry.default,
    disablable: entry.disablable ?? false,
    override: overrideMap.get(entry.key) ?? null,
  }));

  return (
    <>
      <PageHeader
        title="ტექსტები"
        description="საიტის ტექსტების რედაქტირება ჯგუფების მიხედვით - შეცვლილი მნიშვნელობა ბაზაში ინახება, ცარიელი ველი კი ჩანაწერს შლის და საიტზე ისევ საწყისი (default) ტექსტი ბრუნდება."
      />

      <nav
        aria-label="ტექსტების ჯგუფები"
        className="mb-6 flex flex-wrap gap-2"
      >
        {TEXT_GROUPS.map((tab) => (
          <Link
            key={tab.slug}
            href={`/admin/texts?group=${tab.slug}`}
            aria-current={group.slug === tab.slug ? "page" : undefined}
            className={cn(
              "min-h-9 rounded-pill border px-4 py-1.5 text-sm font-semibold transition",
              group.slug === tab.slug
                ? "border-green-dark bg-green-dark text-white"
                : "border-line bg-white text-ink-muted hover:border-green-mid",
            )}
          >
            {tab.title}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <p className="text-sm text-ink-muted">
          ამ ჯგუფში ტექსტები ჯერ არ არის.
        </p>
      ) : (
        <TextsForm key={group.slug} group={group.slug} entries={entries} />
      )}

      {group.slug === "terms" || group.slug === "privacy" ? (
        <LegalVersionsBlock kind={group.slug} />
      ) : null}
    </>
  );
}

/* ── PDF-ვერსიები (მხოლოდ წესები/კონფიდენციალურობა) ─────────────────
   ტექსტის ქვემოთ საჯაროდ ჩანს „მოქმედია {თარიღი}-დან" სიად; აქ იმართება:
   დამატება (PDF + თარიღი) და წაშლა. ფაილი /uploads/-იდან არ იშლება. */
async function LegalVersionsBlock({ kind }: { kind: LegalKind }) {
  const versions = await listLegalVersions(kind);

  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="text-h3 font-bold text-green-dark">
        მოქმედი ვერსიები (PDF)
      </h2>
      <p className="mt-1 mb-4 max-w-3xl text-sm text-ink-muted">
        საჯარო გვერდზე ტექსტის ქვემოთ ჩანს ყველა ვერსია მოქმედების დაწყების
        თარიღით. ატვირთე საბოლოო PDF და მიუთითე, რომელი დღიდან მოქმედებს.
      </p>

      {versions.length > 0 ? (
        <ul className="mb-5 flex max-w-3xl flex-col gap-2">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-4 py-2.5 text-sm"
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
                PDF-ის ნახვა
              </a>
              <form
                action={deleteLegalVersion.bind(null, version.id)}
                className="ml-auto"
              >
                <ConfirmSubmit confirmText="ნამდვილად წავშალოთ ეს ვერსია სიიდან? (ატვირთული ფაილი არ იშლება)">
                  წაშლა
                </ConfirmSubmit>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-5 text-sm text-ink-muted">
          ვერსია ჯერ არ არის ატვირთული.
        </p>
      )}

      {/* key={length} — წარმატებული დამატების მერე ფორმა ცარიელი ბრუნდება */}
      <LegalVersionForm key={versions.length} kind={kind} />
    </section>
  );
}
