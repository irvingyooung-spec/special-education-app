import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Baby,
  Heart,
  ClipboardList,
  FileText,
  MessageCircle,
  History,
  Plus,
  Sprout,
  Trash2,
} from "lucide-react";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import Card from "@/app/components/card";
import { requireRole } from "@/lib/auth";
import { ageLabel } from "@/lib/age";
import { ConfirmButton } from "@/app/admin/users/_components/confirm-button";
import {
  getLatestSessionForChild,
  getScoresForSession,
  summarizeByDomain,
} from "@/lib/assessment";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChildDetailPage({ params }: Props) {
  const me = await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT * FROM children WHERE id = ?")
    .get(childId) as
    | {
        id: number;
        name: string;
        child_gender: string | null;
        child_birth_date: string | null;
        diagnosis_notes: string | null;
        parent_expectations: string | null;
        created_at: string;
      }
    | undefined;

  if (!child) {
    notFound();
  }

  const age = ageLabel(child.child_birth_date);
  const subtitleMeta =
    [child.child_gender, age, child.child_birth_date && `出生 ${child.child_birth_date}`]
      .filter(Boolean)
      .join(" · ") || "基本信息未填写";

  const latestSession = getLatestSessionForChild(childId);
  const summary = latestSession
    ? summarizeByDomain(getScoresForSession(latestSession.id))
    : null;

  const treatmentPlan = db
    .prepare(
      "SELECT * FROM treatment_plans WHERE child_id = ? ORDER BY updated_at DESC LIMIT 1"
    )
    .get(childId) as
    | { id: number; content: string; updated_at: string }
    | undefined;

  const sessionCount = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM assessment_sessions WHERE child_id = ?"
      )
      .get(childId) as { count: number }
  ).count;

  async function deleteChild() {
    "use server";
    await requireRole("admin");
    db.prepare("DELETE FROM children WHERE id = ?").run(childId);
    redirect("/");
  }

  return (
    <PageShell
      backHref="/"
      backLabel="返回首页"
      title={child.name}
      subtitle={subtitleMeta}
      maxWidth="md"
      showLogo
    >
      <div className="space-y-6">
        {/* 基本信息 */}
        <Card title="基本信息" icon={Baby}>
          <div className="grid gap-3 sm:grid-cols-3 mb-4 text-sm">
            <div>
              <p className="text-xs text-[#9ca3af]">性别</p>
              <p className="text-[#374151]">
                {child.child_gender ?? (
                  <span className="text-[#d1d5db]">未填写</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9ca3af]">出生日期</p>
              <p className="text-[#374151]">
                {child.child_birth_date ?? (
                  <span className="text-[#d1d5db]">未填写</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9ca3af]">实足年龄</p>
              <p className="text-[#374151]">
                {age ?? (
                  <span className="text-[#d1d5db]">需要先填出生日期</span>
                )}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-[#9ca3af] mb-1">诊断备注</p>
            {child.diagnosis_notes ? (
              <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-wrap">
                {child.diagnosis_notes}
              </p>
            ) : (
              <p className="text-[#d1d5db] text-sm">暂无</p>
            )}
          </div>
        </Card>

        {/* 家长期望 */}
        <Card
          title="家长期望"
          icon={Heart}
          action={
            <Link
              href={`/children/${childId}/qrcode`}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
            >
              家长问卷二维码
            </Link>
          }
        >
          {child.parent_expectations ? (
            <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-wrap">
              {child.parent_expectations}
            </p>
          ) : (
            <p className="text-[#d1d5db] text-sm">家长尚未填写期望</p>
          )}
        </Card>

        {/* 最新评估 */}
        <Card
          title={`最新评估${sessionCount > 0 ? ` (共 ${sessionCount} 次)` : ""}`}
          icon={ClipboardList}
          action={
            <div className="flex gap-2">
              {sessionCount > 0 && (
                <Link
                  href={`/children/${childId}/assessments`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
                >
                  <History className="h-3.5 w-3.5" />
                  历史记录
                </Link>
              )}
              <Link
                href={`/children/${childId}/assess`}
                className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
              >
                <Plus className="h-3.5 w-3.5" />
                {latestSession ? "新建评估" : "开始评估"}
              </Link>
            </div>
          }
        >
          {latestSession && summary ? (
            <div className="space-y-3">
              <p className="text-xs text-[#9ca3af]">
                评估于{" "}
                {new Date(latestSession.created_at).toLocaleString("zh-CN")}
                {latestSession.evaluator_name &&
                  ` · 评估师 ${latestSession.evaluator_name}`}
              </p>
              <div className="space-y-2">
                {summary.map((d) => (
                  <div key={d.code} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-[#374151]">
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
                    <span className="w-12 text-right text-xs text-[#9ca3af]">
                      {d.scored_count}/{d.total_items}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <Link
                  href={`/children/${childId}/assessments/${latestSession.id}`}
                  className="text-xs text-brand hover:text-brand-dark transition-colors"
                >
                  查看本次评估全部细节 →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-[#d1d5db] text-sm">尚未进行评估</p>
          )}
        </Card>

        {/* 治疗计划 */}
        <Card
          title="治疗计划"
          icon={FileText}
          action={
            <Link
              href={`/children/${childId}/treatment`}
              className="inline-flex items-center gap-1 rounded-lg bg-[#66bb6a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#43a047] transition-all duration-200 active:scale-[0.98]"
            >
              {treatmentPlan ? "编辑计划" : "制定计划"}
            </Link>
          }
        >
          {treatmentPlan ? (
            <div>
              <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-wrap">
                {treatmentPlan.content}
              </p>
              <p className="mt-3 text-xs text-[#9ca3af]">
                最后更新：
                {new Date(treatmentPlan.updated_at).toLocaleString("zh-CN")}
              </p>
            </div>
          ) : (
            <p className="text-[#d1d5db] text-sm">尚未制定治疗计划</p>
          )}
        </Card>

        {/* 家长与芽宝的聊天记录 */}
        <Card
          title="家长与芽宝的聊天记录"
          icon={Sprout}
          action={
            <Link
              href={`/children/${childId}/chat`}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              查看历史 →
            </Link>
          }
          variant="brand"
        >
          <p className="text-sm text-[#6b7280]">
            查看家长与芽宝的全部对话记录
          </p>
        </Card>

        {/* 危险区域 */}
        {me.role === "admin" && (
          <Card variant="danger" title="危险操作" icon={Trash2}>
            <p className="text-sm text-[#374151]">
              删除学生会一并清掉：家长问卷、评估记录、治疗计划、家长账号绑定关系、课表关联，且无法恢复。
            </p>
            <form action={deleteChild} className="mt-4">
              <ConfirmButton
                label={`删除学生 ${child.name}`}
                confirmMessage={`确认要删除 ${child.name} 吗？\n\n这会一并清掉：\n· 家长问卷\n· 全部评估记录\n· 治疗计划\n· 家长账号绑定\n· 课表关联\n\n此操作不可恢复。`}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-all duration-200 active:scale-[0.98]"
              />
            </form>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
