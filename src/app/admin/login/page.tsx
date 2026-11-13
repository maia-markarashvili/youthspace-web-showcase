import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { getSession } from "@/lib/auth/session";
import { homeForRole, safeAdminPath } from "@/lib/auth/roles";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ადმინი - შესვლა",
  robots: { index: false, follow: false },
};

/**
 * „უკვე შესულია" გადამისამართება განზრახ **აქ**, DB-დადასტურებული
 * getSession()-ით ხდება და არა proxy.ts-ში JWT-ის ზედაპირული როლით -
 * თორემ ორივე შრეს, რომლებსაც სხვადასხვა წყარო სჯერა (proxy - მხოლოდ
 * ტოკენი, აქაური - ბაზა), შეეძლო ერთმანეთთან დაპირისპირება: ვადაგასული
 * token_version-ის cookie-ს proxy „ვალიდურად" თვლიდა და login-იდან
 * აგდებდა, დანიშნულების გვერდი კი ბაზასთან შედარებით ისევ login-ზე
 * აბრუნებდა - login↔desk უსასრულო რედირექტი (ERR_TOO_MANY_REDIRECTS).
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next: rawNext } = await searchParams;
  /* მხოლოდ შიდა /admin-გზა (safeAdminPath) — open redirect-ის საწინააღმდეგოდ */
  const next = safeAdminPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  const session = await getSession();
  if (session) redirect(next ?? homeForRole(session.role));

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-8 shadow-card">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-auto" />
          <div className="leading-tight">
            <p className="text-lg font-bold text-ink">სივრცე</p>
            <p className="text-xs font-semibold tracking-widest text-green-mid uppercase">
              ადმინ-პანელი
            </p>
          </div>
        </div>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
