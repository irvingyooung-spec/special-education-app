import Link from "next/link";
import { redirect } from "next/navigation";
import db from "@/lib/db";
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

  // 只绑定了一个孩子就直接跳进去
  if (myChildren.length === 1) {
    redirect(`/parent/${myChildren[0].id}`);
  }

  async function logout() {
    "use server";
    await destroyCurrentSession();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-3xl items-start justify-between px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">特教助手</h1>
            <p className="mt-1 text-sm text-gray-500">家长工作台</p>
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

      <main className="mx-auto max-w-3xl px-4 py-8">
        {myChildren.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-700">您的账号尚未绑定孩子</p>
            <p className="mt-2 text-sm text-gray-500">
              请联系老师或管理员，确认账号设置无误后再登录。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">我的孩子</h2>
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
                    className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <h3 className="text-lg font-medium text-gray-900">
                      {child.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{meta}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
