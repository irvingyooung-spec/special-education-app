import { redirect } from "next/navigation";
import db from "@/lib/db";
import {
  createSession,
  getCurrentUser,
  roleHomePath,
  verifyPassword,
  type Role,
} from "@/lib/auth";

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
}

function safeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export default async function LoginPage({ searchParams }: Props) {
  const search = await searchParams;
  const errorMsg = search.error;
  const next = safeNext(search.next);

  // 已登录就直接送到角色首页（带 next 优先 next）
  const user = await getCurrentUser();
  if (user) {
    redirect(next ?? roleHomePath(user.role));
  }

  async function login(formData: FormData) {
    "use server";

    const username = ((formData.get("username") as string) ?? "").trim();
    const password = (formData.get("password") as string) ?? "";
    const nextFromForm = safeNext(
      (formData.get("next") as string) ?? undefined
    );

    if (!username || !password) {
      redirect(buildLoginRedirect("empty", nextFromForm));
    }

    const row = db
      .prepare(
        "SELECT id, password_hash, role FROM users WHERE username = ?"
      )
      .get(username) as
      | { id: number; password_hash: string; role: Role }
      | undefined;

    if (!row || !(await verifyPassword(password, row.password_hash))) {
      redirect(buildLoginRedirect("invalid", nextFromForm));
    }

    await createSession(row.id);
    redirect(nextFromForm ?? roleHomePath(row.role));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          登录
        </h1>

        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg === "invalid"
              ? "用户名或密码错误"
              : "请填写用户名和密码"}
          </div>
        )}

        <form
          action={login}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              用户名
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              autoComplete="username"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              密码
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            登录
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          首次使用？默认管理员：
          <code className="font-mono">admin / changeme123</code>
        </p>
      </div>
    </div>
  );
}

function buildLoginRedirect(error: string, next: string | null): string {
  const params = new URLSearchParams({ error });
  if (next) params.set("next", next);
  return `/login?${params.toString()}`;
}
