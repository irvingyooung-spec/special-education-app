import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  ABLLS_DOMAINS,
  ABLLS_SCORE_LEVELS,
  type AbllsItem,
} from "@/lib/ablls-catalog";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssessPage({ params }: Props) {
  const me = await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) notFound();

  // 家长问卷参考(评估时帮老师对照)
  const questionnaire = db
    .prepare("SELECT * FROM parent_questionnaires WHERE child_id = ?")
    .get(childId) as
    | {
        parent_name: string | null;
        relation: string | null;
        contact: string | null;
        child_gender: string | null;
        child_birth_date: string | null;
        diagnosis: string | null;
        diagnosis_hospital: string | null;
        diagnosis_date: string | null;
        current_training: string | null;
        medication: string | null;
        allergies: string | null;
        prior_training: string | null;
        prior_assessment: string | null;
        daily_behavior: string | null;
        main_reinforcers: string | null;
        top_concerns: string | null;
        parent_expectations: string | null;
        submitted_at: string | null;
      }
    | undefined;

  function ageFromDob(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return `${years} 岁`;
  }

  // 92 项目录,按领域分组
  const allItems = db
    .prepare(
      "SELECT id, domain_code, item_code, name, goal, materials, procedure, order_in_domain FROM ablls_items ORDER BY domain_code, order_in_domain"
    )
    .all() as Array<AbllsItem & { id: number }>;

  const itemsByDomain = new Map<string, Array<AbllsItem & { id: number }>>();
  for (const it of allItems) {
    const list = itemsByDomain.get(it.domain_code) ?? [];
    list.push(it);
    itemsByDomain.set(it.domain_code, list);
  }

  async function submitAssessment(formData: FormData) {
    "use server";
    const sessionNotes = (
      (formData.get("session_notes") as string) ?? ""
    ).trim();
    const evaluatorName = (
      (formData.get("evaluator_name") as string) ?? me.username
    ).trim();

    const insertSession = db.prepare(
      `INSERT INTO assessment_sessions (child_id, evaluator_user_id, evaluator_name, session_notes)
       VALUES (?, ?, ?, ?)`
    );
    const insertScore = db.prepare(
      `INSERT INTO assessment_scores (session_id, item_id, score, notes)
       VALUES (?, ?, ?, ?)`
    );

    const itemIds = db
      .prepare("SELECT id FROM ablls_items")
      .all() as Array<{ id: number }>;

    let scoredCount = 0;
    const tx = db.transaction(() => {
      const result = insertSession.run(
        childId,
        me.id,
        evaluatorName || me.username,
        sessionNotes || null
      );
      const sessionId = result.lastInsertRowid;

      for (const { id: itemId } of itemIds) {
        const raw = formData.get(`score_${itemId}`) as string | null;
        if (!raw) continue;
        const score = parseInt(raw);
        if (Number.isNaN(score) || score < 0 || score > 4) continue;
        const itemNotes = (
          (formData.get(`notes_${itemId}`) as string) ?? ""
        ).trim();
        insertScore.run(sessionId, itemId, score, itemNotes || null);
        scoredCount++;
      }

      return sessionId;
    });
    const sessionId = tx();

    redirect(`/children/${childId}/assessments/${sessionId}`);
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href={`/children/${childId}`}
            className="text-sm text-brand hover:underline"
          >
            ← 返回{child.name}的详情
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#374151]">
            ABLLS-R 评估 — {child.name}
          </h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            10 个领域共 92 项。每项 0-4 分,允许只评一部分;未选的项不会保存。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <form action={submitAssessment} className="space-y-6">
          {/* 评估元信息 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#374151]">
              本次评估信息
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-1">
                  评估师姓名
                </label>
                <input
                  type="text"
                  name="evaluator_name"
                  defaultValue={me.username}
                  className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-[#6b7280] mb-1">
                评估总体备注
              </label>
              <textarea
                name="session_notes"
                rows={2}
                placeholder="例如:孩子状态、配合情况、特殊说明..."
                className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </section>

          {/* 家长问卷参考 */}
          {questionnaire?.submitted_at && (
            <details
              open
              className="rounded-xl border border-amber-200 bg-amber-50/50"
            >
              <summary className="cursor-pointer select-none p-5">
                <span className="text-base font-semibold text-[#374151]">
                  家长问卷参考
                </span>
                <span className="ml-2 text-xs text-[#9ca3af]">
                  评估时可对照参考(点击可折叠)
                </span>
              </summary>
              <div className="space-y-4 px-5 pb-5 text-sm">
                {/* 家长信息行 */}
                {(questionnaire.parent_name || questionnaire.contact) && (
                  <p className="text-[#6b7280]">
                    <span className="text-[#9ca3af]">家长:</span>{" "}
                    {questionnaire.parent_name}
                    {questionnaire.relation && `(${questionnaire.relation})`}
                    {questionnaire.contact && ` · ${questionnaire.contact}`}
                  </p>
                )}

                {/* 孩子基本 + 诊断 */}
                {(questionnaire.child_gender ||
                  questionnaire.child_birth_date ||
                  questionnaire.diagnosis) && (
                  <div className="rounded bg-white border border-amber-100 p-3 space-y-1.5">
                    {(questionnaire.child_gender ||
                      questionnaire.child_birth_date) && (
                      <p className="text-[#6b7280]">
                        <span className="text-[#9ca3af]">孩子:</span>{" "}
                        {[
                          questionnaire.child_gender,
                          ageFromDob(questionnaire.child_birth_date),
                          questionnaire.child_birth_date &&
                            `出生 ${questionnaire.child_birth_date}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {questionnaire.diagnosis && (
                      <p className="text-[#6b7280]">
                        <span className="text-[#9ca3af]">诊断:</span>{" "}
                        {questionnaire.diagnosis}
                        {(questionnaire.diagnosis_hospital ||
                          questionnaire.diagnosis_date) &&
                          ` (${[
                            questionnaire.diagnosis_hospital,
                            questionnaire.diagnosis_date,
                          ]
                            .filter(Boolean)
                            .join(" · ")})`}
                      </p>
                    )}
                  </div>
                )}

                {/* 评估时关键信息:强化物 / 关注问题 / 过敏 */}
                {(questionnaire.main_reinforcers ||
                  questionnaire.top_concerns ||
                  questionnaire.allergies) && (
                  <div className="rounded border-2 border-amber-300 bg-amber-100/40 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-900">
                      ⚑ 评估时需特别留意
                    </p>
                    {questionnaire.main_reinforcers && (
                      <div>
                        <p className="text-xs text-[#6b7280]">
                          主要强化物(测试时可用作奖励):
                        </p>
                        <p className="whitespace-pre-wrap text-[#374151]">
                          {questionnaire.main_reinforcers}
                        </p>
                      </div>
                    )}
                    {questionnaire.top_concerns && (
                      <div>
                        <p className="text-xs text-[#6b7280]">
                          家长最关注的问题:
                        </p>
                        <p className="whitespace-pre-wrap text-[#374151]">
                          {questionnaire.top_concerns}
                        </p>
                      </div>
                    )}
                    {questionnaire.allergies && (
                      <p className="text-[#374151]">
                        <span className="text-xs text-[#6b7280]">
                          过敏 / 禁忌:
                        </span>{" "}
                        {questionnaire.allergies}
                      </p>
                    )}
                  </div>
                )}

                {/* 背景:训练 / 服药 / 日常 / 上次评估 / 期望 */}
                {(questionnaire.current_training ||
                  questionnaire.prior_training ||
                  questionnaire.medication ||
                  questionnaire.daily_behavior ||
                  questionnaire.prior_assessment ||
                  questionnaire.parent_expectations) && (
                  <div className="space-y-2">
                    {questionnaire.current_training && (
                      <div>
                        <p className="text-xs text-[#9ca3af]">当前康复训练:</p>
                        <p className="whitespace-pre-wrap text-[#6b7280] rounded bg-white border border-amber-100 p-2">
                          {questionnaire.current_training}
                        </p>
                      </div>
                    )}
                    {questionnaire.prior_training && (
                      <div>
                        <p className="text-xs text-[#9ca3af]">
                          之前的训练 / 治疗:
                        </p>
                        <p className="whitespace-pre-wrap text-[#6b7280] rounded bg-white border border-amber-100 p-2">
                          {questionnaire.prior_training}
                        </p>
                      </div>
                    )}
                    {questionnaire.medication && (
                      <div>
                        <p className="text-xs text-[#9ca3af]">服药情况:</p>
                        <p className="whitespace-pre-wrap text-[#6b7280] rounded bg-white border border-amber-100 p-2">
                          {questionnaire.medication}
                        </p>
                      </div>
                    )}
                    {questionnaire.daily_behavior && (
                      <div>
                        <p className="text-xs text-[#9ca3af]">日常表现:</p>
                        <p className="whitespace-pre-wrap text-[#6b7280] rounded bg-white border border-amber-100 p-2">
                          {questionnaire.daily_behavior}
                        </p>
                      </div>
                    )}
                    {questionnaire.prior_assessment && (
                      <p className="text-[#6b7280]">
                        <span className="text-xs text-[#9ca3af]">
                          上一次评估:
                        </span>{" "}
                        {questionnaire.prior_assessment}
                      </p>
                    )}
                    {questionnaire.parent_expectations && (
                      <div>
                        <p className="text-xs text-[#9ca3af]">家长期望:</p>
                        <p className="whitespace-pre-wrap text-[#6b7280] rounded bg-white border border-amber-100 p-2">
                          {questionnaire.parent_expectations}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          )}

          {/* 评分等级说明 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-[#f1f8e9]/40 p-5">
            <h2 className="mb-2 text-base font-semibold text-[#374151]">
              评分等级
            </h2>
            <div className="grid gap-1 text-xs text-[#6b7280] sm:grid-cols-5">
              {ABLLS_SCORE_LEVELS.map((lv) => (
                <div key={lv.value}>
                  <span className="font-semibold text-[#374151]">
                    {lv.value}
                  </span>{" "}
                  - {lv.label}
                  <p className="text-[#9ca3af]">{lv.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 10 个领域 */}
          {ABLLS_DOMAINS.map((domain) => {
            const items = itemsByDomain.get(domain.code) ?? [];
            return (
              <details
                key={domain.code}
                className="rounded-xl border border-[#e8e8e0] bg-white shadow-sm"
              >
                <summary className="cursor-pointer select-none rounded-xl p-4 hover:bg-[#f9fafb]">
                  <span className="text-base font-semibold text-[#374151]">
                    领域 {domain.code} — {domain.label}
                  </span>
                  <span className="ml-2 text-xs text-[#9ca3af]">
                    ({items.length} 项)
                  </span>
                </summary>
                <div className="border-t border-[#f3f4f6] p-4 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#f3f4f6] p-3"
                    >
                      <div className="mb-2">
                        <span className="font-mono text-xs text-[#9ca3af]">
                          {item.item_code}
                        </span>
                        <span className="ml-2 text-sm font-medium text-[#374151]">
                          {item.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#6b7280] mb-2">{item.goal}</p>

                      {(item.materials || item.procedure) && (
                        <details className="mb-2">
                          <summary className="cursor-pointer text-xs text-brand hover:underline">
                            测试细节
                          </summary>
                          <div className="mt-1 space-y-1 rounded bg-warm-bg p-2 text-xs text-[#6b7280]">
                            {item.materials && (
                              <p>
                                <span className="text-[#9ca3af]">材料:</span>{" "}
                                {item.materials}
                              </p>
                            )}
                            {item.procedure && (
                              <p className="whitespace-pre-wrap">
                                <span className="text-[#9ca3af]">程序:</span>{" "}
                                {item.procedure}
                              </p>
                            )}
                          </div>
                        </details>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1 text-xs text-[#9ca3af]">
                          <input
                            type="radio"
                            name={`score_${item.id}`}
                            value=""
                            defaultChecked
                            className="h-3.5 w-3.5"
                          />
                          未评
                        </label>
                        {[0, 1, 2, 3, 4].map((s) => (
                          <label
                            key={s}
                            className="flex items-center gap-1 text-xs text-[#6b7280]"
                          >
                            <input
                              type="radio"
                              name={`score_${item.id}`}
                              value={s}
                              className="h-3.5 w-3.5"
                            />
                            {s}
                          </label>
                        ))}
                      </div>

                      <input
                        type="text"
                        name={`notes_${item.id}`}
                        placeholder="备注(可选)"
                        className="mt-2 block w-full rounded border border-[#f3f4f6] px-2 py-1 text-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                  ))}
                </div>
              </details>
            );
          })}

          {/* 提交 */}
          <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-xl border border-[#e8e8e0] bg-white p-4 shadow-sm">
            <Link
              href={`/children/${childId}`}
              className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb]"
            >
              取消
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
            >
              保存评估
            </button>
            <span className="ml-auto text-xs text-[#9ca3af]">
              未选评分的项不会写入数据库,可以分多次评估
            </span>
          </div>
        </form>
      </main>
    </div>
  );
}
