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

  const isDraft = session.status === "draft";

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
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href={`/children/${childId}/assessments`}
            className="text-sm text-brand hover:underline"
          >
            ← 返回评估历史
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#374151]">
            评估详情 — {child.name}
          </h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {new Date(session.created_at).toLocaleString("zh-CN")}
            {session.evaluator_name && ` · 评估师 ${session.evaluator_name}`}
            {" · "}共评 {scores.length} / 92 项
            {isDraft && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                草稿
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {sp.err && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            芽宝生成失败:{sp.err}
          </div>
        )}
        {sp.ok === "generated" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            ✓ 芽宝生成的报告草稿已就绪。请审核后再发布给家长。
          </div>
        )}

        {/* 评估总体备注 */}
        {session.session_notes && (
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-[#374151]">
              评估备注
            </h2>
            <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
              {session.session_notes}
            </p>
          </section>
        )}

        {/* 芽宝评估报告 — draft 不显示 */}
        {isDraft ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-[#374151]">
                  草稿状态
                </h2>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  本次评估尚未提交。提交后才能生成 AI 评估报告。
                </p>
              </div>
              <Link
                href={`/children/${childId}/assess`}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
              >
                继续编辑 →
              </Link>
            </div>
            <p className="text-sm text-[#6b7280]">
              已评 {scores.length} / 92 项。点击&ldquo;继续编辑&rdquo;回到评估页完善评分。
            </p>
          </section>
        ) : (
          <section className="rounded-xl border border-[#c5e1a5] bg-[#f1f8e9]/50 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-[#374151]">
                  芽宝评估报告草稿
                </h2>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  由 {aiModelName} 基于本次得分 + 家长问卷生成。
                  <strong className="text-brand-dark">老师必须人工审核后才能发布给家长</strong>;
                  芽宝不提供医学诊断与用药建议。
                </p>
              </div>
              <div className="flex gap-2">
                {report && (
                  <Link
                    href={`/children/${childId}/assessments/${sessionId}/report/edit`}
                    className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#6b7280] bg-white hover:bg-[#f9fafb]"
                  >
                    编辑
                  </Link>
                )}
                <form action={runGenerate}>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
                  >
                    {report ? "重新生成草稿" : "让芽宝生成报告草稿"}
                  </button>
                </form>
              </div>
            </div>

            {!report ? (
              <p className="mt-2 text-sm text-[#9ca3af]">
                还没有生成报告。点击右上角&ldquo;让芽宝生成报告草稿&rdquo;按钮(大约需要 15-30 秒)。
              </p>
            ) : (
              <div className="space-y-4">
                {REPORT_FIELDS.map((f) => {
                  const v = report[f.key];
                  return (
                    <div
                      key={f.key}
                      className="rounded-lg border border-[#dcedc8] bg-white p-3"
                    >
                      <p className="text-xs font-semibold text-brand-dark mb-1">
                        {f.label}
                      </p>
                      {v ? (
                        <p className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">
                          {v}
                        </p>
                      ) : (
                        <p className="text-sm text-[#d1d5db]">未填写</p>
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-[#d1d5db] text-right">
                  最后更新:
                  {new Date(report.updated_at).toLocaleString("zh-CN")}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 各领域均分汇总 */}
        <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#374151]">
            各领域得分汇总
          </h2>
          <div className="space-y-2">
            {summary.map((d) => (
              <div key={d.code} className="flex items-center gap-3">
                <span className="w-32 text-sm text-[#6b7280]">
                  <span className="font-mono text-xs text-[#d1d5db]">
                    {d.code}
                  </span>{" "}
                  {d.label}
                </span>
                <div className="flex-1 h-2 bg-[#e8e8e0] rounded-full overflow-hidden">
                  {d.average !== null && (
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(d.average / 4) * 100}%` }}
                    />
                  )}
                </div>
                <span className="w-24 text-right text-xs text-[#6b7280]">
                  {d.average !== null
                    ? `${d.average} · ${d.level?.label}`
                    : "未评"}
                </span>
                <span className="w-12 text-right text-xs text-[#d1d5db]">
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
              className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-semibold text-[#374151]">
                领域 {domain.code} — {domain.label}
              </h2>
              <ul className="divide-y divide-[#f3f4f6]">
                {items.map((s) => {
                  const levelLabel = ABLLS_SCORE_LEVELS.find(
                    (lv) => lv.value === s.score
                  )?.label;
                  return (
                    <li key={s.item_id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-mono text-xs text-[#d1d5db]">
                              {s.item_code}
                            </span>{" "}
                            <span className="font-medium text-[#374151]">
                              {s.name}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-[#9ca3af]">
                            {s.goal}
                          </p>
                          {s.notes && (
                            <p className="mt-1 rounded bg-warm-bg p-2 text-xs text-[#6b7280] whitespace-pre-wrap">
                              {s.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-brand">
                            {s.score}
                          </span>
                          <p className="text-xs text-[#9ca3af]">{levelLabel}</p>
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
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-12 text-center shadow-sm">
            <p className="text-[#9ca3af]">本次评估没有评分项</p>
          </section>
        )}
      </main>
    </div>
  );
}
