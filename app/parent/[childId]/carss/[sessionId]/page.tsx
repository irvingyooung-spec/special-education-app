import { notFound } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import {
  getScoresForSession,
  summarizeByDomain,
} from "@/lib/cars";
import {
  CARS_DOMAINS,
  CARS_FUNCTION_LEVELS,
  CARS_PATHOLOGY_LEVELS,
  isPathologyDomain,
} from "@/lib/cars-catalog";
import { Calendar, User, Sparkles, Target } from "lucide-react";
import { getCarsReportForSession } from "@/lib/cars-report";

interface Props {
  params: Promise<{ childId: string; sessionId: string }>;
}

export default async function ParentCarsSessionDetailPage({ params }: Props) {
  await requireRole("parent");
  const { childId, sessionId } = await params;
  const childIdNum = parseInt(childId);
  const sessionIdNum = parseInt(sessionId);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childIdNum) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const session = db
    .prepare("SELECT * FROM cars_sessions WHERE id = ? AND child_id = ?")
    .get(sessionIdNum, childIdNum) as
    | {
        id: number;
        evaluator_name: string | null;
        session_notes: string | null;
        created_at: string;
      }
    | undefined;

  if (!session) notFound();

  const scores = getScoresForSession(sessionIdNum);
  const summary = summarizeByDomain(scores);
  const report = getCarsReportForSession(sessionIdNum);

  const scoresByDomain = new Map<string, typeof scores>();
  for (const score of scores) {
    const list = scoresByDomain.get(score.domain_code) ?? [];
    list.push(score);
    scoresByDomain.set(score.domain_code, list);
  }

  const scoreLabelMap = new Map<string, string>();
  for (const l of CARS_FUNCTION_LEVELS) scoreLabelMap.set(l.value, l.label);
  for (const l of CARS_PATHOLOGY_LEVELS) scoreLabelMap.set(l.value, l.label);

  const mItems = scores.filter((s) => s.score === "M");
  const lItems = scores.filter((s) => s.score === "L");
  const trainingItems = [...mItems, ...lItems];

  return (
    <PageShell
      backHref={`/parent/${childId}/carss`}
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

        {/* Summary */}
        <div className="rounded-xl bg-white border border-[#e8e8e0] p-4">
          <h2 className="font-medium text-[#374151] mb-3">发展能力领域</h2>
          <div className="space-y-3">
            {summary
              .filter((s) => !s.is_pathology)
              .map((s) => (
                <div key={s.code} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-[#374151]">
                    {s.label}
                  </span>
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
                </div>
              ))}
          </div>

          <h2 className="font-medium text-[#374151] mb-3 mt-6">
            病理学特征
          </h2>
          <div className="space-y-3">
            {summary
              .filter((s) => s.is_pathology)
              .map((s) => (
                <div key={s.code} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-[#374151] truncate">
                    {s.label}
                  </span>
                  <div className="flex-1 h-2 bg-[#e8e8e0] rounded-full overflow-hidden">
                    {s.pass_rate !== null && (
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${s.pass_rate}%` }}
                      />
                    )}
                  </div>
                  <span className="w-20 text-right text-xs text-[#6b7280]">
                    {s.pass_rate !== null ? `${s.pass_rate}%` : "未评"}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Training Goals */}
        {trainingItems.length > 0 && (
          <div className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden">
            <div className="bg-[#fff8e1] px-4 py-3 border-b border-[#ffe082] flex items-center gap-2">
              <Target className="h-4 w-4 text-[#f9a825]" />
              <h2 className="font-medium text-[#374151]">建议训练目标</h2>
              <span className="ml-auto text-xs text-[#f9a825] bg-[#fff8e1] px-2 py-0.5 rounded-full">
                共 {trainingItems.length} 项
              </span>
            </div>
            <div className="divide-y divide-[#f0f0eb]">
              {trainingItems.slice(0, 10).map((item) => (
                <div key={item.item_id} className="px-4 py-3 flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f9a825] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#374151]">{item.name}</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">{item.goal}</p>
                  </div>
                  <span className="text-xs font-medium text-[#f9a825]">
                    {item.score === "M" ? "中间反应" : "轻度异常"}
                  </span>
                </div>
              ))}
              {trainingItems.length > 10 && (
                <p className="px-4 py-2 text-xs text-[#9ca3af] text-center">
                  还有 {trainingItems.length - 10} 项...
                </p>
              )}
            </div>
          </div>
        )}

        {/* AI Report */}
        {report && (
          <div className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden">
            <div className="bg-[#f3e5f5] px-4 py-3 border-b border-[#e1bee7] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#7b1fa2]" />
              <h2 className="font-medium text-[#374151]">评估报告</h2>
            </div>
            <div className="divide-y divide-[#f0f0eb]">
              {report.summary && (
                <div className="px-4 py-3">
                  <h3 className="text-sm font-medium text-[#374151] mb-1">
                    评估总结
                  </h3>
                  <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
                    {report.summary}
                  </p>
                </div>
              )}
              {report.pathology_analysis && (
                <div className="px-4 py-3">
                  <h3 className="text-sm font-medium text-[#374151] mb-1">
                    病理学特征分析
                  </h3>
                  <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
                    {report.pathology_analysis}
                  </p>
                </div>
              )}
              {report.training_goals && (
                <div className="px-4 py-3">
                  <h3 className="text-sm font-medium text-[#374151] mb-1">
                    干预目标
                  </h3>
                  <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
                    {report.training_goals}
                  </p>
                </div>
              )}
              {report.family_advice && (
                <div className="px-4 py-3">
                  <h3 className="text-sm font-medium text-[#374151] mb-1">
                    家庭训练建议
                  </h3>
                  <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
                    {report.family_advice}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Domain details */}
        {Array.from(scoresByDomain.entries()).map(([domainCode, domainScores]) => {
          const domainInfo = CARS_DOMAINS.find((d) => d.code === domainCode);
          if (!domainInfo) return null;

          return (
            <div
              key={domainCode}
              className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden"
            >
              <div className="bg-[#f9fafb] px-4 py-3 border-b border-[#e8e8e0]">
                <h2 className="font-medium text-[#374151]">
                  {domainInfo.label}
                </h2>
              </div>
              <div className="divide-y divide-[#f0f0eb]">
                {domainScores.map((score) => (
                  <div
                    key={score.item_id}
                    className="px-4 py-3 flex items-start gap-3"
                  >
                    <span className="mt-0.5 text-xs text-[#d1d5db] font-mono shrink-0">
                      {score.item_code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#374151]">{score.name}</p>
                      <p className="text-xs text-[#9ca3af] mt-0.5">
                        {score.goal}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-medium ${
                        score.score === "P" || score.score === "N"
                          ? "bg-green-100 text-green-700"
                          : score.score === "M" || score.score === "L"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
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
