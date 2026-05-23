import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import db from "./db";

const SESSION_COOKIE = "sid";
const SESSION_DAYS = 7;

export type Role = "admin" | "teacher" | "parent";

export type User = {
  id: number;
  username: string;
  role: Role;
};

/**
 * 读取当前登录用户。
 * 在 Server Component / Server Action / Route Handler 中调用。
 * 没有有效 session 返回 null。
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?
         AND datetime(s.expires_at) > datetime('now')`
    )
    .get(sid) as User | undefined;

  return row ?? null;
}

/**
 * 校验明文密码与数据库里的哈希是否匹配。
 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * 给指定用户创建新 session，并把 session id 写入 cookie。
 * 只能在 Server Action / Route Handler 中调用（cookies().set 的限制）。
 */
export async function createSession(userId: number): Promise<string> {
  const sid = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  );

  db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(sid, userId, expiresAt.toISOString());

  const cookieStore = await cookies();
  const isDev = process.env.NODE_ENV !== "production";
  cookieStore.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: !isDev,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return sid;
}

/**
 * 注销当前 session：从数据库删除并清掉 cookie。
 */
export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SESSION_COOKIE)?.value;
  if (sid) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
    cookieStore.delete(SESSION_COOKIE);
  }
}

export const roleLabel: Record<Role, string> = {
  admin: "管理员",
  teacher: "老师",
  parent: "家长",
};

/**
 * 每种角色登录后默认进入的"工作台"首页。
 */
export function roleHomePath(role: Role): string {
  return { admin: "/admin", teacher: "/", parent: "/parent" }[role];
}

/**
 * 在受保护页面顶部调用。如果未登录 → 跳 /login。
 * 如果角色不在允许列表 → 跳到该角色自己的工作台。
 * 通过则返回当前 User（保证非 null）。
 */
export async function requireRole(...allowedRoles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!allowedRoles.includes(user.role)) {
    redirect(roleHomePath(user.role));
  }
  return user;
}
