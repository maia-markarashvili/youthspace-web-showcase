import Link from "next/link";
import { asc } from "drizzle-orm";
import { deleteHeroSlide, moveHeroSlide, toggleHeroSlide } from "./actions";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import {
  AdminTable,
  EmptyRow,
  PageHeader,
  StatusDot,
} from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { heroSlides } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  await verifyOwner();

  const slides = await db
    .select()
    .from(heroSlides)
    .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt));

  return (
    <>
      <PageHeader
        title="ჰერო-სლაიდერი"
        description="მთავარი გვერდის ბანერები - ტექსტები, ფოტოები, ღილაკები და რიგითობა."
        action={{ href: "/admin/hero/new", label: "+ ახალი სლაიდი" }}
      />

      <AdminTable head={["რიგი", "სათაური", "სტატუსი", "მოქმედებები"]}>
        {slides.length === 0 ? (
          <EmptyRow colSpan={4} text="სლაიდები ჯერ არ არის" />
        ) : (
          slides.map((slide, index) => (
            <tr key={slide.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <form action={moveHeroSlide.bind(null, slide.id, "up")}>
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label="ზემოთ აწევა"
                      className="flex size-8 items-center justify-center rounded-pill text-ink-muted hover:bg-cream disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveHeroSlide.bind(null, slide.id, "down")}>
                    <button
                      type="submit"
                      disabled={index === slides.length - 1}
                      aria-label="ქვემოთ ჩამოწევა"
                      className="flex size-8 items-center justify-center rounded-pill text-ink-muted hover:bg-cream disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      ↓
                    </button>
                  </form>
                </div>
              </td>
              <td className="px-4 py-3 font-medium text-ink">{slide.title}</td>
              <td className="px-4 py-3">
                <StatusDot active={slide.isActive} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/hero/${slide.id}`}
                    className="inline-flex min-h-9 items-center rounded-pill px-3 py-1.5 text-sm font-semibold text-green-dark hover:bg-green-light/40"
                  >
                    რედაქტირება
                  </Link>
                  <form action={toggleHeroSlide.bind(null, slide.id)}>
                    <button
                      type="submit"
                      className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-cream"
                    >
                      {slide.isActive ? "გამორთვა" : "ჩართვა"}
                    </button>
                  </form>
                  <form action={deleteHeroSlide.bind(null, slide.id)}>
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
