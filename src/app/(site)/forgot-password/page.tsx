import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/section";
import { ForgotForm } from "./forgot-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "პაროლის აღდგენა",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Section tone="cream">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">ანგარიში</p>
        <h1 className="mt-3 text-h2 font-bold text-green-dark">
          პაროლის აღდგენა
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          მიუთითე ანგარიშის ელფოსტა - აღდგენის კოდი ელფოსტაზე მოგივა.
        </p>

        <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
          <ForgotForm />
        </div>

        <p className="mt-4 text-sm text-ink-muted">
          გაგახსენდა პაროლი?{" "}
          <Link href="/login" className="font-semibold text-green-dark underline">
            შესვლა
          </Link>
        </p>
      </div>
    </Section>
  );
}
