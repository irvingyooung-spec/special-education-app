import Link from "next/link";
import { redirect } from "next/navigation";
import db from "@/lib/db";
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
            <p className="mt-1 text-sm text-gray-500">老师工作台</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-700">
              {currentUser.username}{" "}
              <span className="text-xs text-gray-500">
                ({roleLabel[currentUser.role]})
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

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">学生列表</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/schedule"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              课表
            </Link>
            <Link
              href="/children/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 添加学生
            </Link>
          </div>
        </div>

        {children.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">还没有添加学生</p>
            <p className="mt-2 text-sm text-gray-400">点击上方按钮添加第一个学生</p>
          </div>
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
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {child.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{meta}</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                  {child.diagnosis_notes && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                      {child.diagnosis_notes}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
