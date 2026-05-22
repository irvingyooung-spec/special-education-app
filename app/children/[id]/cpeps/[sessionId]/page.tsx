import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import { getScoresForSession, summarizeByDomain } from "@/lib/cpep";
import { CPEP_DOMAINS, CPEP_SCORE_LEVELS, CPEP_EMOTION_LEVELS } from "@/lib/cpep-catalog";
import { Calendar, User, FileText, Target, Sparkles, Edit } from "lucide-react";
import { getCpepReportForSession, generateCpepReportForSession } from "@/lib/report";
import SubmitButton from "@/app/components/submit-button";

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function CpepSessionDetailPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id, sessionId } = await params;
  const childId = parseInt(id);
  const sessionIdNum = parseInt(sessionId);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const session = db
    .prepare("SELECT * FROM cpep_sessions WHERE id = ? AND child_id = ?")
    .get(sessionIdNum, childId) as
    | {
        id: number;
        evaluator_name: string | null;
        domain_code: string | null;
        session_notes: string | null;
        created_at: string;
      }
    | undefined;

  if (!session) notFound();

  const scores = getScoresForSession(sessionIdNum);
  const summary = summarizeByDomain(scores);

  // Group scores by domain
  const scoresByDomain = new Map<string, typeof scores>();
  for (const score of scores) {
    const list = scoresByDomain.get(score.domain_code) ?? [];
    list.push(score);
    scoresByDomain.set(score.domain_code, list);
  }

  const scoreLabelMap = new Map<string, string>();
  for (const l of CPEP_SCORE_LEVELS) scoreLabelMap.set(l.value, l.label);
  for (const l of CPEP_EMOTION_LEVELS) scoreLabelMap.set(l.value, l.label);

  const report = getCpepReportForSession(sessionIdNum);

  async function generateReport() {
    "use server";
    await requireRole("teacher", "admin");
    await generateCpepReportForSession(sessionIdNum, childId);
    redirect(`/children/${childId}/cpeps/${sessionIdNum}/report/edit`);
  }

  // Collect E items (intermediate response = training targets)
  const eItems = scores.filter((s) => s.score === "E");
  const eItemsByDomain = new Map<string, typeof eItems>();
  for (const item of eItems) {
    const list = eItemsByDomain.get(item.domain_code) ?? [];
    list.push(item);
    eItemsByDomain.set(item.domain_code, list);
  }

  return (
    <PageShell
      backHref={`/children/${childId}/cpeps`}
      backLabel="返回历史记录"
      title="评估详情"
      subtitle={`${child.name}`}
      maxWidth="lg"
      showLogo
    >
      <div className="space-y-6">
        {/* Session info */}
        <div className="rounded-xl bg-white border border-[#e8e8e0] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(session.created_at).toLocaleString("zh-CN")}</span>
              </div>
              {session.evaluator_name && (
                <div className="flex items-center gap-1 text-xs text-[#9ca3af] mt-0.5">
                  <User className="h-3 w-3" />
                  <span>评估师: {session.evaluator_name}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!report && (
                <form action={generateReport}>
                  <SubmitButton
                    label="生成AI报告"
                    loadingLabel="生成中..."
                    className="inline-flex items-center gap-1 rounded-lg bg-[#5c6bc0] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#3f51b5] transition-all"
                  />
                </form>
              )}
              <Link
                href={`/children/${childId}/cpeps/${sessionId}/report/edit`}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
              >
                <Edit className="h-3.5 w-3.5" />
                {report ? "编辑报告" : "手动填写"}
              </Link>
            </div>
          </div>
          {session.session_notes && (
            <p className="mt-2 text-sm text-[#6b7280] bg-[#f9fafb] rounded-lg p-2">
              {session.session_notes}
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-white border border-[#e8e8e0] p-4">
          <h2 className="font-medium text-[#374151] mb-3">领域汇总</h2>
          <div className="space-y-3">
            {summary.map((s) => (
              <div key={s.code} className="flex items-center gap-3">
                <span className="w-24 text-sm text-[#374151]">{s.label}</span>
                <div className="flex-1 h-2 bg-[#e8e8e0] rounded-full overflow-hidden">
                  {s.pass_rate !== null && (
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${s.pass_rate}%` }}
                    />
                  )}
                </div>
                <span className="w-20 text-right text-xs text-[#6b7280]">
                  {s.pass_rate !== null ? `${s.pass_rate}%` : "未评"}
                </span>
                <span className="w-16 text-right text-xs text-[#9ca3af]">
                  {s.p_count + s.e_count + s.f_count + s.x_count}/{s.total_items}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Training Goals from E items */}
        {eItems.length > 0 && (
          <div className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden">
            <div className="bg-[#fff8e1] px-4 py-3 border-b border-[#ffe082] flex items-center gap-2">
              <Target className="h-4 w-4 text-[#f9a825]" />
              <h2 className="font-medium text-[#374151]">
                建议训练目标（中间反应项）
              </h2>
              <span className="ml-auto text-xs text-[#f9a825] bg-[#fff8e1] px-2 py-0.5 rounded-full">
                共 {eItems.length} 项
              </span>
            </div>
            <div className="divide-y divide-[#f0f0eb]">
              {Array.from(eItemsByDomain.entries()).map(([domainCode, items]) => {
                const domainInfo = CPEP_DOMAINS.find((d) => d.code === domainCode);
                return (
                  <div key={domainCode} className="px-4 py-3">
                    <h3 className="text-sm font-medium text-[#374151] mb-2">
                      {domainInfo?.label || domainCode}
                    </h3>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li
                          key={item.item_id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f9a825] shrink-0" />
                          <div>
                            <p className="text-[#374151]">{item.name}</p>
                            <p className="text-xs text-[#9ca3af]">{item.goal}</p>
                            {item.method && (
                              <p className="text-xs text-[#6b7280] mt-1">
                                <span className="font-medium">建议训练:</span>{" "}
                                {item.method.slice(0, 100)}
                                {item.method.length > 100 && "..."}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Report */}
        {report && (
          <div className="space-y-4">
            <div className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden">
              <div className="bg-[#f3e5f5] px-4 py-3 border-b border-[#e1bee7] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#7b1fa2]" />
                <h2 className="font-medium text-[#374151]">AI 评估报告</h2>
              </div>
              <div className="divide-y divide-[#f0f0eb]">
                {report.domain_analysis && (
                  <div className="px-4 py-3">
                    <h3 className="text-sm font-medium text-[#374151] mb-1">发展能力分析</h3>
                    <p className="text-sm text-[#6b7280] whitespace-pre-wrap">{report.domain_analysis}</p>
                  </div>
                )}
                {report.emotion_analysis && (
                  <div className="px-4 py-3">
                    <h3 className="text-sm font-medium text-[#374151] mb-1">情绪行为分析</h3>
                    <p className="text-sm text-[#6b7280] whitespace-pre-wrap">{report.emotion_analysis}</p>
                  </div>
                )}
                {report.training_goals && (
                  <div className="px-4 py-3">
                    <h3 className="text-sm font-medium text-[#374151] mb-1">训练目标</h3>
                    <p className="text-sm text-[#6b7280] whitespace-pre-wrap">{report.training_goals}</p>
                  </div>
                )}
                {report.family_advice && (
                  <div className="px-4 py-3">
                    <h3 className="text-sm font-medium text-[#374151] mb-1">家长配合建议</h3>
                    <p className="text-sm text-[#6b7280] whitespace-pre-wrap">{report.family_advice}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Domain details */}
        {Array.from(scoresByDomain.entries()).map(([domainCode, domainScores]) => {
          const domainInfo = CPEP_DOMAINS.find((d) => d.code === domainCode);
          if (!domainInfo) return null;

          return (
            <div key={domainCode} className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden">
              <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e8e8e0]">
                <h2 className="font-medium text-[#374151]">{domainInfo.label}</h2>
              </div>
              <div className="divide-y divide-[#f0f0eb]">
                {domainScores.map((score) => (
                  <div key={score.item_id} className="px-4 py-3 flex items-start gap-3">
                    <span className="mt-0.5 text-xs text-[#d1d5db] font-mono shrink-0">
                      {score.order_in_domain}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#374151]">{score.name}</p>
                      <p className="text-xs text-[#9ca3af] mt-0.5">{score.goal}</p>
                    </div>
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-medium ${
                        score.score === "P" || score.score === "A"
                          ? "bg-green-100 text-green-700"
                          : score.score === "E" || score.score === "M"
                          ? "bg-yellow-100 text-yellow-700"
                          : score.score === "F" || score.score === "S"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {score.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
