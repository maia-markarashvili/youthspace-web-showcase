import Link from "next/link";
import { desc } from "drizzle-orm";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import {
  AdminTable,
  EmptyRow,
  PageHeader,
  StatusDot,
} from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { adminAuditLog, adminUsers } from "@/lib/db/schema";
import { setAdminActive } from "./actions";
import { CreateAdminForm } from "./create-admin-form";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "ადმინი",
  reception: "რეგისტრატორი",
};

const TABS = [
  { key: "users", label: "ადმინები" },
  { key: "audit", label: "აუდიტის ჟურნალი" },
] as const;

async function UsersTab({ ownAdminId }: { ownAdminId: string }) {
  const rows = await db
    .select()
    .from(adminUsers)
    .orderBy(desc(adminUsers.createdAt));

  return (
    <>
      <div className="mb-6">
        <CreateAdminForm />
      </div>

      <AdminTable
        head={["ელფოსტა", "როლი", "სტატუსი", "შექმნის თარიღი", "მოქმედება"]}
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={5} text="ადმინები ჯერ არ არის" />
        ) : (
          rows.map((admin) => {
            const isSelf = admin.id === ownAdminId;
            return (
              <tr key={admin.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">
                  {admin.email}
                  {isSelf ? (
                    <span className="ml-2 text-xs text-ink-muted">(შენ)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                  {ROLE_LABEL[admin.role] ?? admin.role}
                </td>
                <td className="px-4 py-3">
                  <StatusDot active={admin.isActive} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                  {admin.createdAt.toLocaleDateString("ka-GE")}
                </td>
                <td className="px-4 py-3">
                  {isSelf ? (
                    <span className="px-2 text-ink-muted">-</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      <form
                        action={setAdminActive.bind(null, admin.id, !admin.isActive)}
                      >
                        {admin.isActive ? (
                          <ConfirmSubmit confirmText="დეაქტივირდეს ეს ანგარიში? ცოცხალი სესიაც გაუქმდება.">
                            გამორთვა
                          </ConfirmSubmit>
                        ) : (
                          <button
                            type="submit"
                            className="min-h-9 rounded-pill px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-green-dark hover:bg-green-light/30"
                          >
                            ჩართვა
                          </button>
                        )}
                      </form>
                      <ResetPasswordForm id={admin.id} />
                    </div>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>
    </>
  );
}

async function AuditTab() {
  const rows = await db
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(200);

  return (
    <AdminTable head={["თარიღი", "ადმინი", "მოქმედება", "სამიზნე", "დეტალი"]}>
      {rows.length === 0 ? (
        <EmptyRow colSpan={5} text="ჟურნალი ჯერ ცარიელია" />
      ) : (
        rows.map((row) => (
          <tr key={row.id} className="border-b border-line last:border-0">
            <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
              {row.createdAt.toLocaleString("ka-GE")}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-ink">
              {row.adminEmail}
            </td>
            <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-ink">
              {row.action}
            </td>
            <td className="px-4 py-3 text-ink-muted">
              {row.targetRef ?? row.targetType ?? "-"}
            </td>
            <td className="px-4 py-3 font-mono text-xs text-ink-muted">
              {row.detail ? JSON.stringify(row.detail) : "-"}
            </td>
          </tr>
        ))
      )}
    </AdminTable>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const session = await verifyOwner();

  const { tab } = await searchParams;
  const rawTab = Array.isArray(tab) ? tab[0] : tab;
  const activeTab = rawTab === "audit" ? "audit" : "users";

  return (
    <>
      <PageHeader
        title="ადმინები"
        description="ვისაც შეუძლია ადმინ-პანელში შესვლა - როლები და აქტივობის ჟურნალი."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/users?tab=${item.key}`}
            className={cn(
              "min-h-10 rounded-pill px-4 py-2 text-sm font-semibold transition-colors",
              item.key === activeTab
                ? "bg-green-dark text-white"
                : "border border-line bg-white text-ink hover:bg-cream",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {activeTab === "users" ? (
        <UsersTab ownAdminId={session.adminId} />
      ) : (
        <AuditTab />
      )}
    </>
  );
}
