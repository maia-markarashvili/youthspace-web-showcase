import { notFound } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";
import { ContentForm } from "../content-form";
import { BroadcastButton } from "@/components/admin/broadcast-button";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { clubs, contentPosts, subscribers } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditContentPostPage(
  props: PageProps<"/admin/content/[id]">,
) {
  const admin = await verifyOwner();
  const { id } = await props.params;
  /* არა-uuid → notFound, თორემ Postgres cast-შეცდომას ისვრის */
  if (!UUID_RE.test(id)) notFound();

  const [[post], clubsOptions, [subscriberCount]] = await Promise.all([
    db.select().from(contentPosts).where(eq(contentPosts.id, id)),
    db
      .select({ id: clubs.id, title: clubs.title })
      .from(clubs)
      .orderBy(asc(clubs.sortOrder)),
    db
      .select({ n: count() })
      .from(subscribers)
      .where(eq(subscribers.isActive, true)),
  ]);

  if (!post) notFound();

  return (
    <>
      <PageHeader title="ჩანაწერის რედაქტირება" description={post.title} />
      <ContentForm defaultValues={post} clubsOptions={clubsOptions} />
      <div className="mt-10 max-w-2xl border-t border-line pt-6">
        <h2 className="text-sm font-bold text-ink">სიახლის გაგზავნა</h2>
        <p className="mt-1 text-xs text-ink-muted">
          გაუგზავნე ეს გვერდი სიახლეების გამომწერებს - თითოეულს ცალკე
          წერილი მიდის, გამოწერის გაუქმების ბმულით.
        </p>
        <div className="mt-4">
          <BroadcastButton
            defaultTestEmail={admin.email}
            itemType="news"
            itemId={post.id}
            subscriberCount={subscriberCount.n}
          />
        </div>
      </div>
    </>
  );
}
