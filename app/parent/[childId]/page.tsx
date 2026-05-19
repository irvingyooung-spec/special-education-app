import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Baby,
  Heart,
  ClipboardList,
  FileText,
  CalendarDays,
  Sprout,
  History,
  LogOut,
} from "lucide-react";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import Card from "@/app/components/card";
import {
  destroyCurrentSession,
  requireRole,
  roleLabel,
} from "@/lib/auth";
import { ageLabel } from "@/lib/age";
import {
  getLatestSessionForChild,
  getScoresForSession,
  summarizeByDomain,
} from "@/lib/assessment";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function ParentChildPage({ params }: Props) {
  const user = await requireRole("parent");
  const { childId: childIdStr } = await params;
  const childId = parseInt(childIdStr);

  const binding = db
    .prepare(
      "SELECT 1 FROM parent_child WHERE parent_user_id = ? AND child_id = ?"
    )
    .get(user.id, childId);
  if (!binding) {
    redirect("/parent");
  }

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

  if (!child) notFound();

  const age = ageLabel(child.child_birth_date);

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

  async function logout() {
    "use server";
    await destroyCurrentSession();
    redirect("/login");
  }

  const headerAction = (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-[#6b7280]">
        {user.username}{" "}
        <span className="text-xs text-[#9ca3af]">
          ({roleLabel[user.role]})
        </span>
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-[#6b7280] hover:text-brand transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          退出
        </button>
      </form>
    </div>
  );

  const subtitleMeta =
    [child.child_gender, age, child.child_birth_date && `出生 ${child.child_birth_date}`]
      .filter(Boolean)
      .join(" · ") || "基本信息未填写";

  return (
    <PageShell
      backHref="/parent"
      backLabel="返回家长首页"
      title={child.name}
      subtitle={subtitleMeta}
      maxWidth="md"
      action={headerAction}
      showLogo={false}
    >
      <div className="space-y-6 pb-20">
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

        <Card title="家长期望" icon={Heart}>
          {child.parent_expectations ? (
            <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-wrap">
              {child.parent_expectations}
            </p>
          ) : (
            <p className="text-[#d1d5db] text-sm">尚未填写</p>
          )}
        </Card>

        <Card
          title={`最新评估${sessionCount > 0 ? ` (共 ${sessionCount} 次)` : ""}`}
          icon={ClipboardList}
          action={
            sessionCount > 0 && (
              <Link
                href={`/parent/${childId}/assessments`}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                历史记录
              </Link>
            )
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
                  href={`/parent/${childId}/assessments/${latestSession.id}`}
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

        <Card title="治疗计划" icon={FileText}>
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

        <Card title="课表" icon={CalendarDays}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6b7280]">
              按周查看孩子的课程安排
            </p>
            <Link
              href={`/parent/${childId}/schedule`}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
            >
              查看课表 →
            </Link>
          </div>
        </Card>

        <Card
          title="芽宝"
          icon={Sprout}
          action={
            <Link
              href={`/parent/${childId}/chat`}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
            >
              开始对话 →
            </Link>
          }
          variant="brand"
        >
          <p className="text-sm text-[#6b7280]">
            有问题随时问芽宝，它会结合孩子的档案给你个性化建议
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
