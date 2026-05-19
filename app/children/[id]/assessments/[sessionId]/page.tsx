import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  ABLLS_DOMAINS,
  ABLLS_SCORE_LEVELS,
} from "@/lib/ablls-catalog";
import {
  getScoresForSession,
  summarizeByDomain,
  type SessionRow,
} from "@/lib/assessment";
import {
  generateReportForSession,
  getReportForSession,
  REPORT_FIELDS,
} from "@/lib/report";
import { aiModelName } from "@/lib/ai";

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}

export default async function AssessmentSessionPage({
  params,
  searchParams,
}: Props) {
  await requireRole("teacher", "admin");
  const { id, sessionId: sessionIdStr } = await params;
  const sp = await searchParams;
  const childId = parseInt(id);
  const sessionId = parseInt(sessionIdStr);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;
  if (!child) notFound();

  const session = db
    .prepare(
      "SELECT * FROM assessment_sessions WHERE id = ? AND child_id = ?"
    )
    .get(sessionId, childId) as SessionRow | undefined;
  if (!session) notFound();

  const scores = getScoresForSession(sessionId);
  const summary = summarizeByDomain(scores);
  const report = getReportForSession(sessionId);

  // 按领域分桶
  const scoresByDomain = new Map<string, typeof scores>();
  for (const s of scores) {
    const list = scoresByDomain.get(s.domain_code) ?? [];
    list.push(s);
    scoresByDomain.set(s.domain_code, list);
  }

  async function runGenerate() {
    "use server";
    await requireRole("teacher", "admin");
    try {
      await generateReportForSession(sessionId, childId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "未知错误,请稍后重试";
      redirect(
        `/children/${childId}/assessments/${sessionId}?err=${encodeURIComponent(
          msg
        )}`
      );
    }
    redirect(`/children/${childId}/assessments/${sessionId}?ok=generated`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href={`/children/${childId}/assessments`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← 返回评估历史
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            评估详情 — {child.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(session.created_at).toLocaleString("zh-CN")}
            {session.evaluator_name && ` · 评估师 ${session.evaluator_name}`}
            {" · "}共评 {scores.length} / 92 项
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {sp.err && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            AI 生成失败:{sp.err}
          </div>
        )}
        {sp.ok === "generated" && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            ✓ AI 报告草稿已生成。请审核后再发布给家长。
          </div>
        )}

        {/* 评估总体备注 */}
        {session.session_notes && (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              评估备注
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {session.session_notes}
            </p>
          </section>
        )}

        {/* AI 评估报告 */}
        <section className="rounded-lg border border-purple-200 bg-purple-50/30 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                AI 评估报告草稿
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                由 {aiModelName} 基于本次得分 + 家长问卷生成。
                <strong className="text-purple-800">老师必须人工审核后才能发布给家长</strong>;
                AI 不提供医学诊断与用药建议。
              </p>
            </div>
            <div className="flex gap-2">
              {report && (
                <Link
                  href={`/children/${childId}/assessments/${sessionId}/report/edit`}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  编辑
                </Link>
              )}
              <form action={runGenerate}>
                <button
                  type="submit"
                  className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {report ? "重新生成草稿" : "AI 生成报告草稿"}
                </button>
              </form>
            </div>
          </div>

          {!report ? (
            <p className="mt-2 text-sm text-gray-500">
              还没有生成报告。点击右上角"AI 生成报告草稿"按钮(大约需要 15-30 秒)。
            </p>
          ) : (
            <div className="space-y-4">
              {REPORT_FIELDS.map((f) => {
                const v = report[f.key];
                return (
                  <div
                    key={f.key}
                    className="rounded-md border border-purple-100 bg-white p-3"
                  >
                    <p className="text-xs font-semibold text-purple-900 mb-1">
                      {f.label}
                    </p>
                    {v ? (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {v}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">未填写</p>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 text-right">
                最后更新:
                {new Date(report.updated_at).toLocaleString("zh-CN")}
              </p>
            </div>
          )}
        </section>

        {/* 各领域均分汇总 */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            各领域得分汇总
          </h2>
          <div className="space-y-2">
            {summary.map((d) => (
              <div key={d.code} className="flex items-center gap-3">
                <span className="w-32 text-sm text-gray-700">
                  <span className="font-mono text-xs text-gray-400">
                    {d.code}
                  </span>{" "}
                  {d.label}
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  {d.average !== null && (
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(d.average / 4) * 100}%` }}
                    />
                  )}
                </div>
                <span className="w-24 text-right text-xs text-gray-600">
                  {d.average !== null
                    ? `${d.average} · ${d.level?.label}`
                    : "未评"}
                </span>
                <span className="w-12 text-right text-xs text-gray-400">
                  {d.scored_count}/{d.total_items}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 各领域题目得分明细 */}
        {ABLLS_DOMAINS.map((domain) => {
          const items = scoresByDomain.get(domain.code) ?? [];
          if (items.length === 0) return null;
          return (
            <section
              key={domain.code}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                领域 {domain.code} — {domain.label}
              </h2>
              <ul className="divide-y divide-gray-100">
                {items.map((s) => {
                  const levelLabel = ABLLS_SCORE_LEVELS.find(
                    (lv) => lv.value === s.score
                  )?.label;
                  return (
                    <li key={s.item_id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-mono text-xs text-gray-400">
                              {s.item_code}
                            </span>{" "}
                            <span className="font-medium text-gray-800">
                              {s.name}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {s.goal}
                          </p>
                          {s.notes && (
                            <p className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600 whitespace-pre-wrap">
                              {s.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-blue-600">
                            {s.score}
                          </span>
                          <p className="text-xs text-gray-500">{levelLabel}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {scores.length === 0 && (
          <section className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">本次评估没有评分项</p>
          </section>
        )}
      </main>
    </div>
  );
}
