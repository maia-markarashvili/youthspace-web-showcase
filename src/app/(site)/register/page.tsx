import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/google-button";
import { Section } from "@/components/ui/section";
import { getAccount } from "@/lib/auth/account-session";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "რეგისტრაცია",
  description:
    "შექმენი სივრცის ანგარიში - კლუბები, შესვლები და კურსები ერთ კაბინეტში.",
};

export default async function RegisterPage() {
  const account = await getAccount();
  if (account) redirect(account.status === "active" ? "/account" : "/verify");

  return (
    <Section tone="cream">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">ანგარიში</p>
        <h1 className="mt-3 text-h2 font-bold text-green-dark">რეგისტრაცია</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          ერთ ანგარიშში ნახავ ყველა შენს კლუბს, შესვლასა და კურსს - შენს ან
          შვილ(ებ)ის სახელზე ნაყიდსაც.
        </p>

        <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
          <GoogleButton label="Google-ით გაგრძელება" />
          <RegisterForm />
        </div>

        <p className="mt-4 text-sm text-ink-muted">
          უკვე გაქვს ანგარიში?{" "}
          <Link href="/login" className="font-semibold text-green-dark underline">
            შესვლა
          </Link>
        </p>
      </div>
    </Section>
  );
}
