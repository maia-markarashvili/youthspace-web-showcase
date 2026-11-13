import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/section";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ახალი პაროლი",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Section tone="cream">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">ანგარიში</p>
        <h1 className="mt-3 text-h2 font-bold text-green-dark">ახალი პაროლი</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          შეიყვანე ელფოსტა, მიღებული 6-ნიშნა კოდი და ახალი პაროლი.
        </p>

        <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
          <ResetForm />
        </div>

        <p className="mt-4 text-sm text-ink-muted">
          კოდი არ მოგსვლია?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-green-dark underline"
          >
            გამოითხოვე ხელახლა
          </Link>
        </p>
      </div>
    </Section>
  );
}
