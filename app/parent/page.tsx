import Link from "next/link";
import { redirect } from "next/navigation";
import { Baby, ArrowRight, LogOut } from "lucide-react";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import Card from "@/app/components/card";
import EmptyState from "@/app/components/empty-state";
import {
  destroyCurrentSession,
  requireRole,
  roleLabel,
} from "@/lib/auth";
import { ageLabel } from "@/lib/age";

export default async function ParentHome() {
  const user = await requireRole("parent");

  const myChildren = db
    .prepare(
      `SELECT c.id, c.name, c.child_gender, c.child_birth_date
       FROM children c
       JOIN parent_child pc ON pc.child_id = c.id
       WHERE pc.parent_user_id = ?
       ORDER BY c.name`
    )
    .all(user.id) as Array<{
    id: number;
    name: string;
    child_gender: string | null;
    child_birth_date: string | null;
  }>;

  if (myChildren.length === 1) {
    redirect(`/parent/${myChildren[0].id}`);
  }

  async function logout() {
    "use server";
    await destroyCurrentSession();
    redirect("/login");
  }

  const headerAction = (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-[#6b7280]">
        {user.username}{" "}
        <span className="text-xs text-[#9ca3af]">
          ({roleLabel[user.role]})
        </span>
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-[#6b7280] hover:text-brand transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          退出
        </button>
      </form>
    </div>
  );

  return (
    <PageShell
      title={`${user.username} 家长，您好`}
      subtitle="欢迎来到新芽儿童乐园"
      action={headerAction}
      showLogo
    >
      {myChildren.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="您的账号尚未绑定孩子"
          description="请联系老师或管理员，确认账号设置无误后再登录。"
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#374151]">我的孩子</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {myChildren.map((child) => {
              const age = ageLabel(child.child_birth_date);
              const meta =
                [child.child_gender, age].filter(Boolean).join(" · ") ||
                "基本信息未填写";
              return (
                <Link
                  key={child.id}
                  href={`/parent/${child.id}`}
                  className="group rounded-xl border border-[#e8e8e0] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand-light"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-[#f1f8e9] p-2.5">
                        <Baby className="h-5 w-5 text-brand" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-[#374151]">
                          {child.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-[#9ca3af]">{meta}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#d1d5db] group-hover:text-brand transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
