import Link from "next/link";
import { redirect } from "next/navigation";
import db from "@/lib/db";
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-4xl items-start justify-between px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">特教助手</h1>
            <p className="mt-1 text-sm text-gray-500">管理员工作台</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-700">
              {user.username}{" "}
              <span className="text-xs text-gray-500">
                ({roleLabel[user.role]})
              </span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-blue-600 hover:underline"
              >
                退出
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">学生总数</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {counts.children}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">老师账号</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {counts.teachers}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">家长账号</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {counts.parents}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">快捷入口</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/users"
              className="rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-800 hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="font-medium">账号管理</p>
              <p className="mt-0.5 text-xs text-gray-500">
                创建/重置/删除老师和家长账号
              </p>
            </Link>
            <Link
              href="/"
              className="rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-800 hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="font-medium">老师工作台</p>
              <p className="mt-0.5 text-xs text-gray-500">
                看学生列表、评估、治疗计划
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
