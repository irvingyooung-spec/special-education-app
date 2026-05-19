import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import {
  destroyCurrentSession,
  requireRole,
  roleLabel,
} from "@/lib/auth";
import {
  getScoresForSession,
  getSessionsForChild,
  summarizeByDomain,
} from "@/lib/assessment";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function ParentAssessmentsHistoryPage({ params }: Props) {
  const user = await requireRole("parent");
  const { childId: childIdStr } = await params;
  const childId = parseInt(childIdStr);

  const binding = db
    .prepare(
      "SELECT 1 FROM parent_child WHERE parent_user_id = ? AND child_id = ?"
    )
    .get(user.id, childId);
  if (!binding) {
    redirect("/parent");
  }

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;
  if (!child) notFound();

  const sessions = getSessionsForChild(childId);

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
            <Link
              href={`/parent/${childId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← 返回{child.name}的主页
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              评估历史 — {child.name}
            </h1>
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

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">暂无评估记录</p>
          </div>
        ) : (
          sessions.map((session) => {
            const scores = getScoresForSession(session.id);
            const summary = summarizeByDomain(scores);
            return (
              <Link
                key={session.id}
                href={`/parent/${childId}/assessments/${session.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {new Date(session.created_at).toLocaleString("zh-CN")}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {session.evaluator_name &&
                        `评估师 ${session.evaluator_name} · `}
                      共评 {scores.length} / 92 项
                    </p>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>

                <div className="space-y-1.5">
                  {summary.map((d) => (
                    <div key={d.code} className="flex items-center gap-2">
                      <span className="w-28 text-xs text-gray-600">
                        <span className="font-mono text-gray-400">
                          {d.code}
                        </span>{" "}
                        {d.label}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                        {d.average !== null && (
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${(d.average / 4) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="w-20 text-right text-xs text-gray-500">
                        {d.average !== null ? d.average : "—"}
                      </span>
                      <span className="w-12 text-right text-xs text-gray-400">
                        {d.scored_count}/{d.total_items}
                      </span>
                    </div>
                  ))}
                </div>

                {session.session_notes && (
                  <p className="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-600">
                    {session.session_notes}
                  </p>
                )}
              </Link>
            );
          })
        )}
      </main>
    </div>
  );
}
