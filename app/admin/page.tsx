import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Baby, Shield, ArrowRight, LogOut } from "lucide-react";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import Card from "@/app/components/card";
import {
  destroyCurrentSession,
  requireRole,
  roleLabel,
} from "@/lib/auth";

export default async function AdminHome() {
  const user = await requireRole("admin");

  const counts = {
    children: (
      db.prepare("SELECT COUNT(*) as c FROM children").get() as { c: number }
    ).c,
    teachers: (
      db
        .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'teacher'")
        .get() as { c: number }
    ).c,
    parents: (
      db
        .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'parent'")
        .get() as { c: number }
    ).c,
  };

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
      title="管理员工作台"
      subtitle="账号管理与数据概览"
      action={headerAction}
      showLogo
    >
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#f1f8e9] p-2.5">
              <Baby className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-[#9ca3af]">学生总数</p>
              <p className="text-2xl font-semibold text-[#374151]">
                {counts.children}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#fffde7] p-2.5">
              <Users className="h-5 w-5 text-[#f9a825]" />
            </div>
            <div>
              <p className="text-sm text-[#9ca3af]">老师账号</p>
              <p className="text-2xl font-semibold text-[#374151]">
                {counts.teachers}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#fce4ec] p-2.5">
              <Shield className="h-5 w-5 text-[#ec407a]" />
            </div>
            <div>
              <p className="text-sm text-[#9ca3af]">家长账号</p>
              <p className="text-2xl font-semibold text-[#374151]">
                {counts.parents}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="快捷入口" icon={ArrowRight}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/users"
            className="group rounded-lg border border-[#e8e8e0] px-4 py-3 text-sm text-[#374151] bg-white hover:border-brand-light hover:bg-[#f1f8e9] transition-all"
          >
            <p className="font-medium">账号管理</p>
            <p className="mt-0.5 text-xs text-[#9ca3af]">
              创建/重置/删除老师和家长账号
            </p>
          </Link>
          <Link
            href="/"
            className="group rounded-lg border border-[#e8e8e0] px-4 py-3 text-sm text-[#374151] bg-white hover:border-brand-light hover:bg-[#f1f8e9] transition-all"
          >
            <p className="font-medium">老师工作台</p>
            <p className="mt-0.5 text-xs text-[#9ca3af]">
              看学生列表、评估、治疗计划
            </p>
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
