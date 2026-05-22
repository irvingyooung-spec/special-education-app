import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowRight } from "lucide-react";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import { requireRole } from "@/lib/auth";
import {
  getSessionsForChild,
  questionnaireLabel,
  respondentRoleLabel,
} from "@/lib/conners";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConnersHistoryPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT * FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) {
    notFound();
  }

  const sessions = getSessionsForChild(childId);

  return (
    <PageShell
      backHref={`/children/${childId}`}
      backLabel="返回学生详情"
      title="Conners 评估历史"
      subtitle={child.name}
      maxWidth="md"
      showLogo
    >
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-[#e8e8e0] bg-white p-8 text-center">
            <Activity className="h-8 w-8 text-[#d1d5db] mx-auto mb-3" />
            <p className="text-sm text-[#9ca3af]">暂无 Conners 评估记录</p>
            <Link
              href={`/children/${childId}/conners`}
              className="mt-2 inline-block text-sm text-brand hover:text-brand-dark transition-colors"
            >
              开始第一次评估 →
            </Link>
          </div>
        ) : (
          sessions.map((session) => (
            <Link
              key={session.id}
              href={`/children/${childId}/connerss/${session.id}`}
              className="block rounded-xl border border-[#e8e8e0] bg-white p-5 hover:border-[#d1d5db] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#374151]">
                      {questionnaireLabel(session.questionnaire_type)}
                    </span>
                    {session.respondent_role && (
                      <span className="text-xs text-[#6b7280] bg-[#f3f4f6] px-2 py-0.5 rounded-full">
                        {respondentRoleLabel(session.respondent_role)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    {new Date(session.created_at).toLocaleString("zh-CN")}
                    {session.evaluator_name && ` · 评估师 ${session.evaluator_name}`}
                  </p>
                  {session.session_notes && (
                    <p className="mt-2 text-xs text-[#6b7280] line-clamp-2">
                      {session.session_notes}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-[#d1d5db] shrink-0 mt-1" />
              </div>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  );
}
