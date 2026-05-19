import { redirect } from "next/navigation";
import { User, Lock } from "lucide-react";
import db from "@/lib/db";
import Logo from "@/app/components/logo";
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
    <div className="min-h-screen bg-warm-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg === "invalid"
              ? "用户名或密码错误"
              : "请填写用户名和密码"}
          </div>
        )}

        <form
          action={login}
          className="space-y-4 rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm"
        >
          {next && <input type="hidden" name="next" value={next} />}

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[#374151]"
            >
              用户名
            </label>
            <div className="mt-1 relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
              <input
                type="text"
                id="username"
                name="username"
                required
                autoComplete="username"
                placeholder="请输入用户名"
                className="block w-full rounded-lg border border-[#d1d5db] pl-10 pr-3 py-2.5 text-sm text-[#374151] placeholder:text-[#9ca3af] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#374151]"
            >
              密码
            </label>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
              <input
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="请输入密码"
                className="block w-full rounded-lg border border-[#d1d5db] pl-10 pr-3 py-2.5 text-sm text-[#374151] placeholder:text-[#9ca3af] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 text-sm text-[#6b7280] cursor-pointer">
              <input
                type="checkbox"
                name="remember"
                className="h-4 w-4 rounded border-[#d1d5db] text-brand focus:ring-brand"
              />
              记住我
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
          >
            登录
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[#9ca3af]">
          首次使用？默认管理员：
          <code className="font-mono text-[#6b7280]">admin / changeme123</code>
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
