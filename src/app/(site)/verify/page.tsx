import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Section } from "@/components/ui/section";
import { getAccount } from "@/lib/auth/account-session";
import { maskEmail } from "@/lib/mask";
import { VerifyForm } from "./verify-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ანგარიშის დადასტურება",
  robots: { index: false, follow: false },
};

export default async function VerifyPage() {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (account.status === "active") redirect("/account");

  return (
    <Section tone="cream">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">ანგარიში</p>
        <h1 className="mt-3 text-h2 font-bold text-green-dark">
          დაადასტურე ანგარიში
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          6-ნიშნა კოდი გავაგზავნეთ მეილზე {maskEmail(account.email)}. ვერ
          ხედავ? შეამოწმე სპამის საქაღალდე ან სცადე ხელახლა გაგზავნა.
        </p>

        <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
          <VerifyForm />
        </div>
      </div>
    </Section>
  );
}
