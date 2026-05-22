import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  getSessionsForChild,
  questionnaireLabel,
  respondentRoleLabel,
} from "@/lib/conners";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function ParentConnersHistoryPage({ params }: Props) {
  const me = await requireRole("parent");
  const { childId } = await params;
  const childIdNum = parseInt(childId);

  // 验证绑定关系
  const binding = db
    .prepare(
      "SELECT 1 FROM parent_child WHERE parent_user_id = ? AND child_id = ?"
    )
    .get(me.id, childIdNum);
  if (!binding) {
    notFound();
  }

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childIdNum) as { id: number; name: string } | undefined;

  if (!child) {
    notFound();
  }

  const sessions = getSessionsForChild(childIdNum);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-medium text-[#374151]">
        Conners 评估记录
      </h1>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-[#e8e8e0] bg-white p-8 text-center">
          <Activity className="h-8 w-8 text-[#d1d5db] mx-auto mb-3" />
          <p className="text-sm text-[#9ca3af]">暂无 Conners 评估记录</p>
        </div>
      ) : (
        sessions.map((session) => (
          <Link
            key={session.id}
            href={`/parent/${childIdNum}/connerss/${session.id}`}
            className="block rounded-xl border border-[#e8e8e0] bg-white p-5 hover:border-[#d1d5db] transition-colors"
          >
            <div className="flex items-center justify-between">
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
                </p>
              </div>
              <span className="text-xs text-[#9ca3af]">→</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
