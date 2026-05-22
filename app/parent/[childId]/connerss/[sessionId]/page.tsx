import { notFound } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  FileText,
  Sprout,
} from "lucide-react";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import Card from "@/app/components/card";
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
  params: Promise<{ childId: string; sessionId: string }>;
}

export default async function ParentConnersDetailPage({ params }: Props) {
  const me = await requireRole("parent");
  const { childId, sessionId } = await params;
  const childIdNum = parseInt(childId);
  const sessionIdNum = parseInt(sessionId);

  // 验证绑定关系
  const binding = db
    .prepare(
      "SELECT 1 FROM parent_child WHERE parent_user_id = ? AND child_id = ?"
    )
    .get(me.id, childIdNum);
  if (!binding) {
    notFound();
  }

  const session = getSessionById(sessionIdNum, childIdNum);
  if (!session) {
    notFound();
  }

  const child = db
    .prepare(
      "SELECT id, name, child_gender, child_birth_date FROM children WHERE id = ?"
    )
    .get(childIdNum) as
    | {
        id: number;
        name: string;
        child_gender: string | null;
        child_birth_date: string | null;
      }
    | undefined;

  const scores = getScoresForSession(sessionIdNum);
  const results = calculateResults(
    sessionIdNum,
    child?.child_birth_date ?? null,
    child?.child_gender ?? null
  );
  const report = getConnersReportForSession(sessionIdNum);

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
    <div className="space-y-6">
      <h1 className="text-lg font-medium text-[#374151]">
        {questionnaireLabel(session.questionnaire_type)}
      </h1>

      {/* 评估信息 */}
      <Card title="评估信息" icon={FileText}>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-[#9ca3af]">评估时间</p>
            <p className="text-[#374151]">
              {new Date(session.created_at).toLocaleString("zh-CN")}
            </p>
          </div>
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

      {/* 因子得分 */}
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
                    className={`h-full rounded-full ${
                      f.is_abnormal ? "bg-[#e53935]" : "bg-[#66bb6a]"
                    }`}
                    style={{
                      width: `${Math.min((f.average / 3) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {results.hyperactivity_index && (
              <div className="pt-3 border-t border-[#e8e8e0]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[#374151]">
                    {results.hyperactivity_index.label}
                  </span>
                  <span className="text-sm font-bold text-[#374151]">
                    {results.hyperactivity_index.average}分
                  </span>
                </div>
                <div className="h-2.5 bg-[#e8e8e0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
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
              </div>
            )}
          </div>
        </Card>
      )}

      {/* AI 报告 */}
      {report && (
        <Card title="评估报告" icon={Sprout}>
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
        </Card>
      )}

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
  );
}
