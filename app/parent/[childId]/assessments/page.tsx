import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
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

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href={`/parent/${childId}`}
            className="text-sm text-brand hover:underline"
          >
            ← 返回
          </Link>
          <h1 className="text-lg font-bold text-[#374151]">
            评估历史
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6 pb-20">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-[#e8e8e0] bg-white p-12 text-center">
            <p className="text-[#9ca3af]">暂无评估记录</p>
          </div>
        ) : (
          sessions.map((session) => {
            const scores = getScoresForSession(session.id);
            const summary = summarizeByDomain(scores);
            return (
              <Link
                key={session.id}
                href={`/parent/${childId}/assessments/${session.id}`}
                className="block rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[#374151]">
                      {new Date(session.created_at).toLocaleString("zh-CN")}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#9ca3af]">
                      {session.evaluator_name &&
                        `评估师 ${session.evaluator_name} · `}
                      共评 {scores.length} / 92 项
                    </p>
                  </div>
                  <span className="text-[#d1d5db]">→</span>
                </div>

                <div className="space-y-1.5">
                  {summary.map((d) => (
                    <div key={d.code} className="flex items-center gap-2">
                      <span className="w-28 text-xs text-[#6b7280]">
                        <span className="font-mono text-[#d1d5db]">
                          {d.code}
                        </span>{" "}
                        {d.label}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8e8e0]">
                        {d.average !== null && (
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${(d.average / 4) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="w-20 text-right text-xs text-[#9ca3af]">
                        {d.average !== null ? d.average : "—"}
                      </span>
                      <span className="w-12 text-right text-xs text-[#d1d5db]">
                        {d.scored_count}/{d.total_items}
                      </span>
                    </div>
                  ))}
                </div>

                {session.session_notes && (
                  <p className="mt-3 whitespace-pre-wrap rounded bg-warm-bg p-2 text-xs text-[#6b7280]">
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
