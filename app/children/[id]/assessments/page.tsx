import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  getScoresForSession,
  getSessionsForChild,
  summarizeByDomain,
} from "@/lib/assessment";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssessmentsHistoryPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const sessions = getSessionsForChild(childId);

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href={`/children/${childId}`}
            className="text-sm text-brand hover:underline"
          >
            ← 返回{child.name}的详情
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#374151]">
            评估历史 — {child.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-[#e8e8e0] bg-white p-12 text-center">
            <p className="text-[#9ca3af]">暂无评估记录</p>
            <Link
              href={`/children/${childId}/assess`}
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
            >
              开始第一次评估
            </Link>
          </div>
        ) : (
          sessions.map((session) => {
            const scores = getScoresForSession(session.id);
            const summary = summarizeByDomain(scores);
            const totalScored = scores.length;
            return (
              <Link
                key={session.id}
                href={`/children/${childId}/assessments/${session.id}`}
                className="block rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[#374151]">
                      {new Date(session.created_at).toLocaleString("zh-CN")}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#9ca3af]">
                      {session.evaluator_name
                        ? `评估师 ${session.evaluator_name}`
                        : "评估师未填"}
                      {" · "}
                      共评 {totalScored} / 92 项
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
                      <div className="flex-1 h-1.5 bg-[#e8e8e0] rounded-full overflow-hidden">
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
                  <p className="mt-3 rounded bg-warm-bg p-2 text-xs text-[#6b7280] whitespace-pre-wrap">
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
