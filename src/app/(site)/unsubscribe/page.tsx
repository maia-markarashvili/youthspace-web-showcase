import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Section } from "@/components/ui/section";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { maskEmail } from "@/lib/mask";
import { verifyUnsubscribeToken } from "@/lib/newsletter-token";
import { UnsubscribeForm } from "./unsubscribe-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "გამოწერის გაუქმება",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const id = t ? await verifyUnsubscribeToken(t) : null;
  const [row] = id
    ? await db
        .select({ email: subscribers.email, isActive: subscribers.isActive })
        .from(subscribers)
        .where(eq(subscribers.id, id))
    : [];

  return (
    <Section tone="cream">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">სიახლეები</p>
        <h1 className="mt-3 text-h2 font-bold text-green-dark">
          გამოწერის გაუქმება
        </h1>

        {!row ? (
          <>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              ბმული არასწორია ან მოძველდა. მოგვწერე{" "}
              <a
                href="mailto:info@youthspace.ge"
                className="font-semibold text-green-dark underline"
              >
                info@youthspace.ge
              </a>{" "}
              და ხელით წაგშლით სიიდან.
            </p>
            <p className="mt-4 text-sm">
              <Link
                href="/"
                className="font-semibold text-green-dark underline"
              >
                მთავარ გვერდზე →
              </Link>
            </p>
          </>
        ) : !row.isActive ? (
          <>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {maskEmail(row.email)} სიახლეებზე გამოწერილი აღარ არის - სხვა
              ქმედება არ სჭირდება.
            </p>
            <p className="mt-4 text-sm">
              <Link
                href="/"
                className="font-semibold text-green-dark underline"
              >
                მთავარ გვერდზე →
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {maskEmail(row.email)} სივრცის სიახლეებს აღარ მიიღებს. ჯავშნებისა
              და ყიდვების წერილები უცვლელად დაგრჩება.
            </p>
            <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
              <UnsubscribeForm token={t ?? ""} />
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
