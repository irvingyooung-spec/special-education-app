import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Edit3,
  FileText,
  Sprout,
} from "lucide-react";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import Card from "@/app/components/card";
import { requireRole } from "@/lib/auth";
import {
  getSessionById,
  getScoresForSession,
  questionnaireLabel,
  respondentRoleLabel,
  calculateResults,
} from "@/lib/conners";
import { getConnersReportForSession } from "@/lib/report";
import { SEVERITY_LABELS } from "@/lib/conners-catalog";

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}

export default async function ConnersSessionPage({
  params,
  searchParams,
}: Props) {
  const me = await requireRole("teacher", "admin");
  const { id, sessionId } = await params;
  const childId = parseInt(id);
  const sessionIdNum = parseInt(sessionId);
  const { ok, err } = await searchParams;

  const session = getSessionById(sessionIdNum, childId);
  if (!session) {
    notFound();
  }

  const child = db
    .prepare(
      "SELECT id, name, child_gender, child_birth_date FROM children WHERE id = ?"
    )
    .get(childId) as
    | { id: number; name: string; child_gender: string | null; child_birth_date: string | null }
    | undefined;

  const scores = getScoresForSession(sessionIdNum);
  const results = calculateResults(
    sessionIdNum,
    child?.child_birth_date ?? null,
    child?.child_gender ?? null
  );
  const report = getConnersReportForSession(sessionIdNum);

  // Server Action: 生成 AI 报告
  async function runGenerate() {
    "use server";
    try {
      const { generateConnersReportForSession } = await import("@/lib/report");
      await generateConnersReportForSession(sessionIdNum, childId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "生成失败";
      redirect(
        `/children/${childId}/connerss/${sessionIdNum}?err=${encodeURIComponent(msg)}`
      );
    }
    redirect(
      `/children/${childId}/connerss/${sessionIdNum}?ok=generated`
    );
  }

  const severityInfo = results
    ? SEVERITY_LABELS[results.severity]
    : SEVERITY_LABELS.normal;

  const severityColors = {
    normal: "bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]",
    mild: "bg-[#fff3e0] text-[#e65100] border-[#ffcc80]",
    moderate: "bg-[#fce4ec] text-[#c62828] border-[#f48fb1]",
    severe: "bg-[#ffebee] text-[#b71c1c] border-[#ef9a9a]",
  };

  return (
    <PageShell
      backHref={`/children/${childId}/connerss`}
      backLabel="返回历史记录"
      title={`${questionnaireLabel(session.questionnaire_type)}详情`}
      subtitle={child?.name}
      maxWidth="md"
      showLogo
    >
      <div className="space-y-6">
        {/* 状态提示 */}
        {ok && (
          <div className="rounded-lg bg-[#e8f5e9] border border-[#a5d6a7] px-4 py-3 text-sm text-[#2e7d32]">
            {ok === "generated" ? "AI 报告已生成" : "操作成功"}
          </div>
        )}
        {err && (
          <div className="rounded-lg bg-[#ffebee] border border-[#ef9a9a] px-4 py-3 text-sm text-[#b71c1c]">
            {err}
          </div>
        )}

        {/* 基本信息 */}
        <Card title="评估信息" icon={FileText}>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-[#9ca3af]">问卷类型</p>
              <p className="text-[#374151]">
                {questionnaireLabel(session.questionnaire_type)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9ca3af]">评估时间</p>
              <p className="text-[#374151]">
                {new Date(session.created_at).toLocaleString("zh-CN")}
              </p>
            </div>
            {session.evaluator_name && (
              <div>
                <p className="text-xs text-[#9ca3af]">评估师</p>
                <p className="text-[#374151]">{session.evaluator_name}</p>
              </div>
            )}
            {session.respondent_role && (
              <div>
                <p className="text-xs text-[#9ca3af]">填写人</p>
                <p className="text-[#374151]">
                  {respondentRoleLabel(session.respondent_role)}
                  {session.respondent_name
                    ? ` · ${session.respondent_name}`
                    : ""}
                </p>
              </div>
            )}
            {session.session_notes && (
              <div className="sm:col-span-2">
                <p className="text-xs text-[#9ca3af]">备注</p>
                <p className="text-[#374151] whitespace-pre-wrap">
                  {session.session_notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 严重程度 */}
        {results && (
          <div
            className={`rounded-xl border p-5 ${severityColors[results.severity]}`}
          >
            <div className="flex items-center gap-2">
              {results.severity === "normal" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <span className="font-medium">{severityInfo.label}</span>
            </div>
            <p className="mt-2 text-sm opacity-90">{severityInfo.desc}</p>
          </div>
        )}

        {/* 因子得分分析 */}
        {results && results.factors.length > 0 && (
          <Card title="因子得分分析" icon={Activity}>
            <div className="space-y-4">
              {results.factors.map((f) => (
                <div key={f.code}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-[#374151]">
                      {f.label}
                      <span className="text-xs text-[#9ca3af] ml-1">
                        ({f.item_count}项)
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#374151]">
                        {f.average}分
                      </span>
                      {f.is_abnormal && (
                        <span className="text-xs bg-[#ffebee] text-[#c62828] px-2 py-0.5 rounded-full">
                          超标
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-[#e8e8e0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        f.is_abnormal ? "bg-[#e53935]" : "bg-[#66bb6a]"
                      }`}
                      style={{ width: `${Math.min((f.average / 3) * 100, 100)}%` }}
                    />
                  </div>
                  {f.norm_mean !== null && f.norm_sd !== null && (
                    <p className="mt-1 text-xs text-[#9ca3af]">
                      常模 {f.norm_mean}±{f.norm_sd} · 上限{" "}
                      {Math.round((f.norm_mean + 2 * f.norm_sd) * 100) / 100}
                    </p>
                  )}
                </div>
              ))}

              {/* 多动指数 */}
              {results.hyperactivity_index && (
                <div className="pt-3 border-t border-[#e8e8e0]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[#374151]">
                      {results.hyperactivity_index.label}
                      <span className="text-xs text-[#9ca3af] ml-1 font-normal">
                        ({results.hyperactivity_index.item_count}项)
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#374151]">
                        {results.hyperactivity_index.average}分
                      </span>
                      {results.hyperactivity_index.is_abnormal && (
                        <span className="text-xs bg-[#ffebee] text-[#c62828] px-2 py-0.5 rounded-full font-medium">
                          超标
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2.5 bg-[#e8e8e0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        results.hyperactivity_index.is_abnormal
                          ? "bg-[#e53935]"
                          : "bg-[#66bb6a]"
                      }`}
                      style={{
                        width: `${Math.min(
                          (results.hyperactivity_index.average / 3) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  {results.hyperactivity_index.norm_mean !== null &&
                    results.hyperactivity_index.norm_sd !== null && (
                      <p className="mt-1 text-xs text-[#9ca3af]">
                        常模 {results.hyperactivity_index.norm_mean}±
                        {results.hyperactivity_index.norm_sd} · 上限{" "}
                        {Math.round(
                          (results.hyperactivity_index.norm_mean +
                            2 * results.hyperactivity_index.norm_sd) *
                            100
                        ) / 100}
                      </p>
                    )}
                  <p className="mt-2 text-xs text-[#6b7280]">
                    多动指数 ≥1.5 分提示可能存在 ADHD 倾向，建议结合临床表现进一步评估。
                  </p>
                </div>
              )}

              {/* 总分 */}
              <div className="pt-3 border-t border-[#e8e8e0] flex items-center justify-between">
                <span className="text-sm text-[#374151]">
                  总分
                  <span className="text-xs text-[#9ca3af] ml-1">
                    ({results.scored_count}/{results.total_items}项)
                  </span>
                </span>
                <span className="text-sm font-medium text-[#374151]">
                  {results.total_score}分 · 均分 {results.average}分
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* 简明问卷总分 */}
        {results &&
          results.questionnaire_type === "brief" &&
          results.scored_count > 0 && (
            <Card title="简明问卷得分" icon={Activity}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#374151]">
                  总分 ({results.scored_count}项)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#374151]">
                    {results.average}分
                  </span>
                  {results.average >= 1.5 && (
                    <span className="text-xs bg-[#ffebee] text-[#c62828] px-2 py-0.5 rounded-full">
                      异常
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-[#6b7280]">
                简明问卷均分 ≥1.5 分提示可能存在 ADHD 倾向。
              </p>
            </Card>
          )}

        {/* AI 报告 */}
        <Card
          title="芽宝评估报告草稿"
          icon={Sprout}
          action={
            <div className="flex gap-2">
              {report && (
                <Link
                  href={`/children/${childId}/connerss/${sessionIdNum}/report/edit`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  编辑
                </Link>
              )}
              <form action={runGenerate}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
                >
                  <Sprout className="h-3.5 w-3.5" />
                  {report ? "重新生成" : "让芽宝生成报告"}
                </button>
              </form>
            </div>
          }
        >
          {report ? (
            <div className="space-y-5">
              {report.factor_analysis && (
                <div>
                  <h3 className="text-sm font-medium text-[#374151] mb-2">
                    因子分析
                  </h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed whitespace-pre-wrap">
                    {report.factor_analysis}
                  </p>
                </div>
              )}
              {report.interpretation && (
                <div>
                  <h3 className="text-sm font-medium text-[#374151] mb-2">
                    结果解读
                  </h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed whitespace-pre-wrap">
                    {report.interpretation}
                  </p>
                </div>
              )}
              {report.intervention_suggestions && (
                <div>
                  <h3 className="text-sm font-medium text-[#374151] mb-2">
                    干预建议
                  </h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed whitespace-pre-wrap">
                    {report.intervention_suggestions}
                  </p>
                </div>
              )}
              {report.family_advice && (
                <div>
                  <h3 className="text-sm font-medium text-[#374151] mb-2">
                    家长配合建议
                  </h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed whitespace-pre-wrap">
                    {report.family_advice}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Sprout className="h-8 w-8 text-[#d1d5db] mx-auto mb-2" />
              <p className="text-sm text-[#9ca3af]">
                还没有生成报告。点击右上角按钮让芽宝生成（约需 15-30 秒）。
              </p>
            </div>
          )}
        </Card>

        {/* 得分明细 */}
        <Card title="得分明细" icon={FileText}>
          <div className="space-y-1">
            {scores.map((s) => {
              const levelColor =
                s.score >= 2
                  ? "text-[#e53935] bg-[#ffebee]"
                  : s.score >= 1
                    ? "text-[#e65100] bg-[#fff3e0]"
                    : "text-[#66bb6a] bg-[#e8f5e9]";
              return (
                <div
                  key={s.item_id}
                  className="flex items-center justify-between py-2 border-b border-[#f3f4f6] last:border-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xs font-mono text-[#d1d5db] w-6 text-right shrink-0 mt-0.5">
                      {s.item_number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-[#374151]">{s.name}</p>
                      {s.notes && (
                        <p className="text-xs text-[#9ca3af] mt-0.5">
                          {s.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${levelColor}`}
                  >
                    {s.score}分
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
