import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  CalendarDays,
  Plus,
  Baby,
  LogOut,
  ArrowRight,
} from "lucide-react";
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

export default async function Home() {
  const currentUser = await requireRole("teacher", "admin");

  const children = db
    .prepare("SELECT * FROM children ORDER BY created_at DESC")
    .all() as Array<{
    id: number;
    name: string;
    child_gender: string | null;
    child_birth_date: string | null;
    diagnosis_notes: string | null;
    created_at: string;
  }>;

  const sessionCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM assessment_sessions")
      .get() as { count: number }
  ).count;

  async function logout() {
    "use server";
    await destroyCurrentSession();
    redirect("/login");
  }

  const headerAction = (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-[#6b7280]">
        {currentUser.username}{" "}
        <span className="text-xs text-[#9ca3af]">
          ({roleLabel[currentUser.role]})
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
      title="老师工作台"
      subtitle="管理学生、评估与教学计划"
      action={headerAction}
      showLogo
    >
      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#f1f8e9] p-2.5">
              <Baby className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-[#9ca3af]">学生总数</p>
              <p className="text-2xl font-semibold text-[#374151]">
                {children.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#fffde7] p-2.5">
              <CalendarDays className="h-5 w-5 text-[#f9a825]" />
            </div>
            <div>
              <p className="text-sm text-[#9ca3af]">本周课程</p>
              <p className="text-2xl font-semibold text-[#374151]">—</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#fce4ec] p-2.5">
              <Users className="h-5 w-5 text-[#ec407a]" />
            </div>
            <div>
              <p className="text-sm text-[#9ca3af]">评估次数</p>
              <p className="text-2xl font-semibold text-[#374151]">
                {sessionCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#374151]">学生列表</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/schedule"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            课表
          </Link>
          <Link
            href="/children/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            添加学生
          </Link>
        </div>
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="还没有添加学生"
          description="点击上方按钮添加第一个学生"
          action={{ label: "添加学生", href: "/children/new" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => {
            const age = ageLabel(child.child_birth_date);
            const meta =
              [child.child_gender, age].filter(Boolean).join(" · ") ||
              "基本信息未填写";
            return (
              <Link
                key={child.id}
                href={`/children/${child.id}`}
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
                {child.diagnosis_notes && (
                  <p className="mt-3 text-sm text-[#6b7280] line-clamp-2">
                    {child.diagnosis_notes}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
