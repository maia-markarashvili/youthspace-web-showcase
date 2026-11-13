import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/google-button";
import { FormMessage } from "@/components/ui/form-field";
import { Section } from "@/components/ui/section";
import { getAccount } from "@/lib/auth/account-session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "შესვლა",
  description: "შედი სივრცის ანგარიშში - კლუბები, შესვლები და კურსები ერთ კაბინეტში.",
};

/** Google-ის ნაკადიდან დაბრუნებული შეცდომები (route handler → ?error=…) */
const GOOGLE_ERRORS: Record<string, string> = {
  google: "Google-ით შესვლა ვერ მოხერხდა - სცადე ხელახლა ან შედი პაროლით.",
  google_cancelled: "Google-ით შესვლა შეწყდა.",
  google_link:
    "ამ ელფოსტით ანგარიში უკვე არსებობს - შედი პაროლით, მერე კი Google-საც დაუკავშირებ.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const account = await getAccount();
  if (account) redirect(account.status === "active" ? "/account" : "/verify");

  const { error } = await props.searchParams;
  const errorMessage = typeof error === "string" ? GOOGLE_ERRORS[error] : null;

  return (
    <Section tone="cream">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">ანგარიში</p>
        <h1 className="mt-3 text-h2 font-bold text-green-dark">შესვლა</h1>

        {errorMessage ? (
          <div className="mt-6">
            <FormMessage status="error">{errorMessage}</FormMessage>
          </div>
        ) : null}

        <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
          <GoogleButton label="Google-ით შესვლა" />
          <LoginForm />
        </div>

        <p className="mt-4 text-sm text-ink-muted">
          არ გაქვს ანგარიში?{" "}
          <Link
            href="/register"
            className="font-semibold text-green-dark underline"
          >
            რეგისტრაცია
          </Link>
        </p>
      </div>
    </Section>
  );
}
