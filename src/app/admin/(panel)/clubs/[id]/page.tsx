import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { BroadcastButton } from "@/components/admin/broadcast-button";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listContentPosts } from "@/lib/db/queries/content";
import { clubs, subscribers, WORK_TYPES } from "@/lib/db/schema";
import { resolveClubLanding } from "@/lib/landing";
import { ClubForm } from "../club-form";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditClubPage(
  props: PageProps<"/admin/clubs/[id]">,
) {
  const admin = await verifyOwner();

  const { id } = await props.params;
  /* არა-uuid → notFound, თორემ Postgres cast-შეცდომას ისვრის */
  if (!UUID_RE.test(id)) notFound();

  const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
  if (!club) notFound();

  /* placeholder-ებში ეფექტური (ავტო ან შენახული) მნიშვნელობები ჩანს */
  const resolved = resolveClubLanding(club);
  const [stories, [subscriberCount]] = await Promise.all([
    listContentPosts({ types: WORK_TYPES }),
    db
      .select({ n: count() })
      .from(subscribers)
      .where(eq(subscribers.isActive, true)),
  ]);

  return (
    <>
      <PageHeader title={club.title} description="კლუბის რედაქტირება" />
      <ClubForm
        defaultValues={club}
        placeholders={resolved.facts}
        storyOptions={stories.map((story) => ({
          id: story.id,
          title: story.title,
        }))}
      />
      <div className="mt-10 max-w-2xl border-t border-line pt-6">
        <h2 className="text-sm font-bold text-ink">სიახლის გაგზავნა</h2>
        <p className="mt-1 text-xs text-ink-muted">
          გაუგზავნე ეს გვერდი სიახლეების გამომწერებს - თითოეულს ცალკე
          წერილი მიდის, გამოწერის გაუქმების ბმულით.
        </p>
        <div className="mt-4">
          <BroadcastButton
            defaultTestEmail={admin.email}
            itemType="club"
            itemId={club.id}
            subscriberCount={subscriberCount.n}
          />
        </div>
      </div>
    </>
  );
}
