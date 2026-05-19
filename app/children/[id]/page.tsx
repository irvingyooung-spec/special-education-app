import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
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

  // 删除学生:只允许管理员。删 children 行会级联清掉问卷/治疗计划/评估/家长绑定/课表关联。
  async function deleteChild() {
    "use server";
    await requireRole("admin");
    db.prepare("DELETE FROM children WHERE id = ?").run(childId);
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← 返回首页
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {child.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {[child.child_gender, age, child.child_birth_date && `出生 ${child.child_birth_date}`]
              .filter(Boolean)
              .join(" · ") || "基本信息未填写"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* 基本信息 */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            基本信息
          </h2>
          <div className="grid gap-3 sm:grid-cols-3 mb-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">性别</p>
              <p className="text-gray-800">
                {child.child_gender ?? <span className="text-gray-400">未填写</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">出生日期</p>
              <p className="text-gray-800">
                {child.child_birth_date ?? <span className="text-gray-400">未填写</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">实足年龄</p>
              <p className="text-gray-800">
                {age ?? <span className="text-gray-400">需要先填出生日期</span>}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">诊断备注</p>
            {child.diagnosis_notes ? (
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {child.diagnosis_notes}
              </p>
            ) : (
              <p className="text-gray-400 text-sm">暂无</p>
            )}
          </div>
        </section>

        {/* 家长期望 */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">家长期望</h2>
            <Link
              href={`/children/${childId}/qrcode`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              家长问卷二维码
            </Link>
          </div>
          {child.parent_expectations ? (
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {child.parent_expectations}
            </p>
          ) : (
            <p className="text-gray-400 text-sm">家长尚未填写期望</p>
          )}
        </section>

        {/* 最新评估(ABLLS-R 领域均分) */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              最新评估
              {sessionCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (共 {sessionCount} 次)
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              {sessionCount > 0 && (
                <Link
                  href={`/children/${childId}/assessments`}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  历史记录
                </Link>
              )}
              <Link
                href={`/children/${childId}/assess`}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                {latestSession ? "新建评估" : "开始评估"}
              </Link>
            </div>
          </div>

          {latestSession && summary ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                评估于{" "}
                {new Date(latestSession.created_at).toLocaleString("zh-CN")}
                {latestSession.evaluator_name &&
                  ` · 评估师 ${latestSession.evaluator_name}`}
              </p>
              <div className="space-y-2">
                {summary.map((d) => (
                  <div key={d.code} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-gray-700">
                      <span className="font-mono text-xs text-gray-400">
                        {d.code}
                      </span>{" "}
                      {d.label}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      {d.average !== null && (
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(d.average / 4) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className="w-24 text-right text-xs text-gray-600">
                      {d.average !== null
                        ? `${d.average} · ${d.level?.label}`
                        : "未评"}
                    </span>
                    <span className="w-12 text-right text-xs text-gray-400">
                      {d.scored_count}/{d.total_items}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <Link
                  href={`/children/${childId}/assessments/${latestSession.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  查看本次评估全部细节 →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">尚未进行评估</p>
          )}
        </section>

        {/* 治疗计划 */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">治疗计划</h2>
            <Link
              href={`/children/${childId}/treatment`}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
            >
              {treatmentPlan ? "编辑计划" : "制定计划"}
            </Link>
          </div>

          {treatmentPlan ? (
            <div>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {treatmentPlan.content}
              </p>
              <p className="mt-3 text-xs text-gray-400">
                最后更新：
                {new Date(treatmentPlan.updated_at).toLocaleString("zh-CN")}
              </p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">尚未制定治疗计划</p>
          )}
        </section>

        {/* 家长 AI 对话历史 */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">家长 AI 对话</h2>
            <Link
              href={`/children/${childId}/chat`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              查看历史 →
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            查看家长与 AI 助手的全部对话记录
          </p>
        </section>

        {/* 危险区域:删除学生(仅管理员) */}
        {me.role === "admin" && (
          <section className="rounded-lg border-2 border-red-200 bg-red-50/40 p-6">
            <h2 className="text-base font-semibold text-red-800">危险操作</h2>
            <p className="mt-2 text-sm text-gray-700">
              删除学生会一并清掉:家长问卷、评估记录、治疗计划、家长账号绑定关系、课表关联,且无法恢复。
            </p>
            <form action={deleteChild} className="mt-3">
              <ConfirmButton
                label={`删除学生 ${child.name}`}
                confirmMessage={`确认要删除 ${child.name} 吗?\n\n这会一并清掉:\n· 家长问卷\n· 全部评估记录\n· 治疗计划\n· 家长账号绑定\n· 课表关联\n\n此操作不可恢复。`}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              />
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
