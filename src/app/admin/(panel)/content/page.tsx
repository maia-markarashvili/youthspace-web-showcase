import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { deleteContentPost, toggleContentActive } from "./actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import {
  AdminTable,
  EmptyRow,
  PageHeader,
  StatusDot,
} from "@/components/admin/ui";
import { cn } from "@/lib/cn";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CONTENT_TYPES, contentPosts, type ContentType } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  news: "სიახლე",
  work_text: "ტექსტი",
  work_video: "ვიდეო",
  work_research: "კვლევა",
};

export default async function AdminContentPage(
  props: PageProps<"/admin/content">,
) {
  await verifyOwner();

  const { type: rawType } = await props.searchParams;
  const activeType = CONTENT_TYPES.find((value) => value === rawType);

  const posts = await db
    .select()
    .from(contentPosts)
    .where(activeType ? eq(contentPosts.type, activeType) : undefined)
    .orderBy(
      sql`${contentPosts.publishedAt} desc nulls last`,
      desc(contentPosts.createdAt),
    );

  const filters: { key: ContentType | null; label: string }[] = [
    { key: null, label: "ყველა" },
    ...CONTENT_TYPES.map((value) => ({
      key: value as ContentType,
      label: TYPE_LABEL[value] ?? value,
    })),
  ];

  return (
    <>
      <PageHeader
        title="კონტენტი"
        description="ამბები და ნამუშევრები (ტექსტები, ვიდეოები, კვლევები)."
        action={{ href: "/admin/content/new", label: "+ ახალი ჩანაწერი" }}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = filter.key === (activeType ?? null);
          return (
            <Link
              key={filter.key ?? "all"}
              href={
                filter.key
                  ? `/admin/content?type=${filter.key}`
                  : "/admin/content"
              }
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "min-h-9 rounded-pill border px-4 py-1.5 text-sm font-medium transition",
                isActive
                  ? "border-green-dark bg-green-dark text-white"
                  : "border-line bg-white text-ink-muted hover:border-green-mid",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <AdminTable
        head={[
          "ტიპი",
          "სათაური",
          "Slug",
          "მთავარზე",
          "თარიღი",
          "სტატუსი",
          "მოქმედებები",
        ]}
      >
        {posts.length === 0 ? (
          <EmptyRow colSpan={7} text="ჩანაწერები ჯერ არ არის" />
        ) : (
          posts.map((post) => (
            <tr key={post.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {TYPE_LABEL[post.type] ?? post.type}
              </td>
              <td className="px-4 py-3 font-medium text-ink">{post.title}</td>
              <td className="px-4 py-3 text-ink-muted">{post.slug ?? "-"}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {post.isFeatured ? (
                  <span className="rounded-pill bg-green-light/40 px-2.5 py-0.5 text-xs font-semibold text-green-dark">
                    მთავარზე
                  </span>
                ) : (
                  <span className="text-ink-muted">-</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                {post.publishedAt
                  ? post.publishedAt.toLocaleDateString("ka-GE")
                  : "-"}
              </td>
              <td className="px-4 py-3">
                <StatusDot active={post.isActive} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/content/${post.id}`}
                    className="inline-flex min-h-9 items-center rounded-pill px-3 py-1.5 text-sm font-semibold text-green-dark hover:bg-green-light/40"
                  >
                    რედაქტირება
                  </Link>
                  <form action={toggleContentActive.bind(null, post.id)}>
                    <button
                      type="submit"
                      className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-cream"
                    >
                      {post.isActive ? "გამორთვა" : "ჩართვა"}
                    </button>
                  </form>
                  <form action={deleteContentPost.bind(null, post.id)}>
                    <ConfirmSubmit>წაშლა</ConfirmSubmit>
                  </form>
                </div>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </>
  );
}
