import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole, verifyPassword } from "@/lib/auth";
import { ConfirmButton } from "./_components/confirm-button";

interface Props {
  searchParams: Promise<{ ok?: string; err?: string }>;
}

const MESSAGES: Record<string, { kind: "ok" | "err"; text: string }> = {
  created_teacher: { kind: "ok", text: "✓ 老师账号已创建" },
  created_parent: { kind: "ok", text: "✓ 家长账号已创建并绑定孩子" },
  pwd_reset: { kind: "ok", text: "✓ 密码已重置，对应用户会被强制下线" },
  pwd_changed: { kind: "ok", text: "✓ 密码已修改，请重新登录" },
  deleted: { kind: "ok", text: "✓ 账号已删除" },

  username_taken: { kind: "err", text: "用户名已被占用" },
  username_invalid: {
    kind: "err",
    text: "用户名格式不对（3-30 位，仅字母/数字/下划线）",
  },
  password_short: { kind: "err", text: "密码至少 6 位" },
  password_mismatch: { kind: "err", text: "两次密码不一致" },
  old_password_wrong: { kind: "err", text: "旧密码错误" },
  no_child: { kind: "err", text: "请先选择一个孩子" },
  cannot_delete_self: { kind: "err", text: "不能删除自己的账号" },
};

function validUsername(s: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(s);
}

type UserRow = { id: number; username: string; created_at: string };

export default async function AdminUsersPage({ searchParams }: Props) {
  const me = await requireRole("admin");
  const sp = await searchParams;
  const flash = sp.ok ? MESSAGES[sp.ok] : sp.err ? MESSAGES[sp.err] : null;

  const teachers = db
    .prepare(
      "SELECT id, username, created_at FROM users WHERE role = 'teacher' ORDER BY created_at DESC"
    )
    .all() as UserRow[];

  const parents = db
    .prepare(
      "SELECT id, username, created_at FROM users WHERE role = 'parent' ORDER BY created_at DESC"
    )
    .all() as UserRow[];

  const allChildren = db
    .prepare("SELECT id, name FROM children ORDER BY name")
    .all() as Array<{ id: number; name: string }>;

  const parentChildRows = db
    .prepare(
      `SELECT pc.parent_user_id, c.id AS child_id, c.name AS child_name
       FROM parent_child pc
       JOIN children c ON c.id = pc.child_id`
    )
    .all() as Array<{
    parent_user_id: number;
    child_id: number;
    child_name: string;
  }>;

  const childrenByParent = new Map<
    number,
    Array<{ id: number; name: string }>
  >();
  for (const row of parentChildRows) {
    const list = childrenByParent.get(row.parent_user_id) ?? [];
    list.push({ id: row.child_id, name: row.child_name });
    childrenByParent.set(row.parent_user_id, list);
  }

  // ---------- Server Actions ----------

  async function changeMyPassword(formData: FormData) {
    "use server";
    const oldPwd = (formData.get("old_password") as string) ?? "";
    const newPwd = (formData.get("new_password") as string) ?? "";
    const confirmPwd = (formData.get("confirm_password") as string) ?? "";

    const row = db
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .get(me.id) as { password_hash: string } | undefined;

    if (!row || !(await verifyPassword(oldPwd, row.password_hash))) {
      redirect("/admin/users?err=old_password_wrong");
    }
    if (newPwd.length < 6) redirect("/admin/users?err=password_short");
    if (newPwd !== confirmPwd) redirect("/admin/users?err=password_mismatch");

    const hash = bcrypt.hashSync(newPwd, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hash,
      me.id
    );
    // 改密码后，把当前用户所有 session 都干掉，强制重新登录
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(me.id);
    redirect("/login?error=empty"); // 顺势让他重新登录
  }

  async function createTeacher(formData: FormData) {
    "use server";
    const username = ((formData.get("username") as string) ?? "").trim();
    const password = (formData.get("password") as string) ?? "";

    if (!validUsername(username)) redirect("/admin/users?err=username_invalid");
    if (password.length < 6) redirect("/admin/users?err=password_short");

    const exists = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (exists) redirect("/admin/users?err=username_taken");

    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'teacher')"
    ).run(username, hash);
    redirect("/admin/users?ok=created_teacher");
  }

  async function createParent(formData: FormData) {
    "use server";
    const username = ((formData.get("username") as string) ?? "").trim();
    const password = (formData.get("password") as string) ?? "";
    const childIdStr = (formData.get("child_id") as string) ?? "";

    if (!validUsername(username)) redirect("/admin/users?err=username_invalid");
    if (password.length < 6) redirect("/admin/users?err=password_short");

    const childId = parseInt(childIdStr);
    if (!childId || Number.isNaN(childId))
      redirect("/admin/users?err=no_child");

    const exists = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (exists) redirect("/admin/users?err=username_taken");

    const hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'parent')"
      )
      .run(username, hash);
    db.prepare(
      "INSERT INTO parent_child (parent_user_id, child_id) VALUES (?, ?)"
    ).run(result.lastInsertRowid, childId);
    redirect("/admin/users?ok=created_parent");
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const userId = parseInt((formData.get("user_id") as string) ?? "");
    const newPwd = (formData.get("new_password") as string) ?? "";

    if (!userId) return;
    if (newPwd.length < 6) redirect("/admin/users?err=password_short");

    const hash = bcrypt.hashSync(newPwd, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hash,
      userId
    );
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    redirect("/admin/users?ok=pwd_reset");
  }

  async function deleteUser(formData: FormData) {
    "use server";
    const userId = parseInt((formData.get("user_id") as string) ?? "");
    if (!userId) return;
    if (userId === me.id) redirect("/admin/users?err=cannot_delete_self");

    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    // FK CASCADE 会自动清掉对应的 sessions / parent_child
    redirect("/admin/users?ok=deleted");
  }

  // ---------- Render ----------

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href="/admin"
            className="text-sm text-blue-600 hover:underline"
          >
            ← 返回管理员首页
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">账号管理</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {flash && (
          <div
            className={
              flash.kind === "ok"
                ? "rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                : "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            }
          >
            {flash.text}
          </div>
        )}

        {/* My password */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            修改我的密码
          </h2>
          <form
            action={changeMyPassword}
            className="grid gap-3 sm:grid-cols-3"
          >
            <input
              type="password"
              name="old_password"
              placeholder="旧密码"
              required
              autoComplete="current-password"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="password"
              name="new_password"
              placeholder="新密码（至少 6 位）"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="password"
              name="confirm_password"
              placeholder="再输入一次"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                修改密码
              </button>
              <span className="ml-3 text-xs text-gray-500">
                提交后会强制下线，需要重新登录
              </span>
            </div>
          </form>
        </section>

        {/* Teachers */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            老师账号
          </h2>

          {teachers.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">暂无老师账号</p>
          ) : (
            <ul className="mb-4 divide-y divide-gray-100 rounded-md border border-gray-200">
              {teachers.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-gray-800">
                      {t.username}
                    </span>
                    <span className="ml-3 text-xs text-gray-500">
                      创建于{" "}
                      {new Date(t.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <form
                      action={resetPassword}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="user_id" value={t.id} />
                      <input
                        type="password"
                        name="new_password"
                        placeholder="新密码"
                        required
                        minLength={6}
                        className="w-32 rounded border border-gray-300 px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        重置密码
                      </button>
                    </form>
                    <form action={deleteUser}>
                      <input type="hidden" name="user_id" value={t.id} />
                      <ConfirmButton
                        label="删除"
                        confirmMessage={`确认删除老师账号 "${t.username}"？该账号的登录态会立即失效。`}
                        className="text-xs text-red-600 hover:underline"
                      />
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="text-sm font-medium text-gray-700 mb-2">
            新建老师账号
          </h3>
          <form
            action={createTeacher}
            className="grid gap-3 sm:grid-cols-3"
          >
            <input
              type="text"
              name="username"
              placeholder="用户名"
              required
              pattern="[a-zA-Z0-9_]{3,30}"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="password"
              name="password"
              placeholder="密码（至少 6 位）"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              创建老师账号
            </button>
          </form>
        </section>

        {/* Parents */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            家长账号
          </h2>

          {parents.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">暂无家长账号</p>
          ) : (
            <ul className="mb-4 divide-y divide-gray-100 rounded-md border border-gray-200">
              {parents.map((p) => {
                const kids = childrenByParent.get(p.id) ?? [];
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-800">
                        {p.username}
                      </span>
                      <span className="ml-3 text-xs text-gray-500">
                        孩子：
                        {kids.length === 0
                          ? "未绑定"
                          : kids.map((k) => k.name).join("、")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <form
                        action={resetPassword}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="user_id" value={p.id} />
                        <input
                          type="password"
                          name="new_password"
                          placeholder="新密码"
                          required
                          minLength={6}
                          className="w-32 rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          重置密码
                        </button>
                      </form>
                      <form action={deleteUser}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <ConfirmButton
                          label="删除"
                          confirmMessage={`确认删除家长账号 "${p.username}"？`}
                          className="text-xs text-red-600 hover:underline"
                        />
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="text-sm font-medium text-gray-700 mb-2">
            新建家长账号
          </h3>
          {allChildren.length === 0 ? (
            <p className="text-sm text-gray-400">
              还没有学生，
              <Link
                href="/children/new"
                className="text-blue-600 hover:underline"
              >
                先去添加学生
              </Link>
              。
            </p>
          ) : (
            <form action={createParent} className="grid gap-3 sm:grid-cols-4">
              <input
                type="text"
                name="username"
                placeholder="用户名"
                required
                pattern="[a-zA-Z0-9_]{3,30}"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="password"
                name="password"
                placeholder="密码（至少 6 位）"
                required
                minLength={6}
                autoComplete="new-password"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                name="child_id"
                required
                defaultValue=""
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>
                  绑定孩子
                </option>
                {allChildren.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                创建家长账号
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
