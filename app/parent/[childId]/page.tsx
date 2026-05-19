import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-3xl items-start justify-between px-4 py-6">
          <div>
            <Link
              href="/parent"
              className="text-sm text-blue-600 hover:underline"
            >
              ← 返回家长首页
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
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-700">
              {user.username}{" "}
              <span className="text-xs text-gray-500">
                ({roleLabel[user.role]})
              </span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-blue-600 hover:underline"
              >
                退出
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
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
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {child.diagnosis_notes}
              </p>
            ) : (
              <p className="text-sm text-gray-400">暂无</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            家长期望
          </h2>
          {child.parent_expectations ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {child.parent_expectations}
            </p>
          ) : (
            <p className="text-sm text-gray-400">尚未填写</p>
          )}
        </section>

        {/* 最新评估(ABLLS-R) */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              最新评估
              {sessionCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (共 {sessionCount} 次)
                </span>
              )}
            </h2>
            {sessionCount > 0 && (
              <Link
                href={`/parent/${childId}/assessments`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                历史记录
              </Link>
            )}
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
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
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
                  href={`/parent/${childId}/assessments/${latestSession.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  查看本次评估全部细节 →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">尚未进行评估</p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            治疗计划
          </h2>
          {treatmentPlan ? (
            <div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {treatmentPlan.content}
              </p>
              <p className="mt-3 text-xs text-gray-400">
                最后更新：
                {new Date(treatmentPlan.updated_at).toLocaleString("zh-CN")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">尚未制定治疗计划</p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">课表</h2>
            <Link
              href={`/parent/${childId}/schedule`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              查看课表 →
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-500">按周查看孩子的课程安排</p>
        </section>

        {/* 芽宝 */}
        <section className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-purple-900">
                🌱 芽宝
              </h2>
              <p className="mt-1 text-sm text-purple-700">
                有问题随时问芽宝,它会结合孩子的档案给你个性化建议
              </p>
            </div>
            <Link
              href={`/parent/${childId}/chat`}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              开始对话 →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
