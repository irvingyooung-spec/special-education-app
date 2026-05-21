import { notFound } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import { getScoresForSession, summarizeByDomain } from "@/lib/cpep";
import { CPEP_DOMAINS, CPEP_SCORE_LEVELS, CPEP_EMOTION_LEVELS } from "@/lib/cpep-catalog";
import { Calendar, User, Sparkles } from "lucide-react";
import { getCpepReportForSession } from "@/lib/report";

interface Props {
  params: Promise<{ childId: string; sessionId: string }>;
}

export default async function ParentCpepSessionDetailPage({ params }: Props) {
  await requireRole("parent");
  const { childId, sessionId } = await params;
  const childIdNum = parseInt(childId);
  const sessionIdNum = parseInt(sessionId);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childIdNum) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const session = db
    .prepare("SELECT * FROM cpep_sessions WHERE id = ? AND child_id = ?")
    .get(sessionIdNum, childIdNum) as
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
  const report = getCpepReportForSession(sessionIdNum);

  const scoresByDomain = new Map<string, typeof scores>();
  for (const score of scores) {
    const list = scoresByDomain.get(score.domain_code) ?? [];
    list.push(score);
    scoresByDomain.set(score.domain_code, list);
  }

  return (
    <PageShell
      backHref={`/parent/${childId}/cpeps`}
      backLabel="返回"
      title="评估详情"
      subtitle={child.name}
      maxWidth="lg"
      showLogo
    >
      <div className="space-y-6">
        {/* Session info */}
        <div className="rounded-xl bg-white border border-[#e8e8e0] p-4">
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

        {/* AI Report (parent view) */}
        {report && (
          <div className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden">
            <div className="bg-[#f3e5f5] px-4 py-3 border-b border-[#e1bee7] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#7b1fa2]" />
              <h2 className="font-medium text-[#374151]">评估报告</h2>
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
        )}

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
                <span className="w-16 text-right text-xs text-[#6b7280]">
                  {s.pass_rate !== null ? `${s.pass_rate}%` : "未评"}
                </span>
              </div>
            ))}
          </div>
        </div>

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
