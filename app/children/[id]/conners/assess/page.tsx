import { notFound, redirect } from "next/navigation";
import {
  Activity,
  Info,
} from "lucide-react";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import ConnersAssessForm from "@/app/components/conners-assess-form";
import { requireRole } from "@/lib/auth";
import {
  type QuestionnaireType,
  CONNERS_SCORE_LEVELS,
  getItemsByQuestionnaire,
  getFactorsForQuestionnaire,
} from "@/lib/conners-catalog";
import { createSession, saveScores, getItemId } from "@/lib/conners";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export default async function ConnersAssessPage({ params, searchParams }: Props) {
  const me = await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);
  const { type } = await searchParams;

  const questionnaireType = type as QuestionnaireType;
  if (!questionnaireType || !["parent", "teacher", "brief"].includes(questionnaireType)) {
    redirect(`/children/${childId}/conners`);
  }

  const child = db
    .prepare("SELECT * FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) {
    notFound();
  }

  const items = getItemsByQuestionnaire(questionnaireType);
  const factors = getFactorsForQuestionnaire(questionnaireType);

  // 按因子分组题目
  const itemsByFactor = new Map<string, typeof items>();
  const itemsWithoutFactor: typeof items = [];

  for (const item of items) {
    if (item.factor_code) {
      if (!itemsByFactor.has(item.factor_code)) {
        itemsByFactor.set(item.factor_code, []);
      }
      itemsByFactor.get(item.factor_code)!.push(item);
    } else {
      itemsWithoutFactor.push(item);
    }
  }

  // Server Action: 提交评估
  async function submitAssessment(formData: FormData) {
    "use server";

    const evaluatorName = (formData.get("evaluator_name") as string) || me.username;
    const respondentRole = (formData.get("respondent_role") as string) || null;
    const respondentName = (formData.get("respondent_name") as string) || null;
    const sessionNotes = (formData.get("session_notes") as string) || null;

    // 创建 session
    const sessionId = createSession(
      childId,
      me.id,
      evaluatorName,
      questionnaireType,
      respondentRole,
      respondentName,
      sessionNotes
    );

    // 收集评分
    const scores: Array<{ itemId: number; score: number; notes: string | null }> = [];
    for (const item of items) {
      const scoreStr = formData.get(`score_${item.item_number}`) as string;
      const notes = formData.get(`notes_${item.item_number}`) as string;
      if (scoreStr !== null && scoreStr !== "") {
        const itemId = getItemId(questionnaireType, item.item_number);
        if (itemId !== undefined) {
          scores.push({
            itemId,
            score: parseInt(scoreStr),
            notes: notes || null,
          });
        }
      }
    }

    saveScores(sessionId, scores);

    redirect(`/children/${childId}/connerss/${sessionId}?toast=success&message=评估已提交`);
  }

  const questionnaireLabels: Record<QuestionnaireType, string> = {
    parent: "父母问卷（48项）",
    teacher: "教师问卷（28项）",
    brief: "简明问卷（10项）",
  };

  const respondentRoleOptions =
    questionnaireType === "parent"
      ? [
          { value: "", label: "请选择" },
          { value: "father", label: "父亲" },
          { value: "mother", label: "母亲" },
          { value: "other", label: "其他监护人" },
        ]
      : [
          { value: "", label: "请选择" },
          { value: "teacher", label: "教师" },
          { value: "evaluator", label: "评估师代填" },
        ];

  return (
    <PageShell
      backHref={`/children/${childId}/conners`}
      backLabel="返回 Conners 总览"
      title={questionnaireLabels[questionnaireType]}
      subtitle={`${child.name}`}
      maxWidth="md"
      showLogo
    >
      <ConnersAssessForm totalItems={items.length} onSubmit={submitAssessment}>
        {/* 评估信息 */}
        <div className="rounded-xl border border-[#e8e8e0] bg-white p-5 space-y-4">
          <h2 className="text-sm font-medium text-[#374151] flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand" />
            评估信息
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">评估师姓名</label>
              <input
                type="text"
                name="evaluator_name"
                defaultValue={me.username}
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">填写人角色</label>
              <select
                name="respondent_role"
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
              >
                {respondentRoleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">填写人姓名</label>
              <input
                type="text"
                name="respondent_name"
                placeholder="如：张三"
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#374151] placeholder:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#6b7280] mb-1">评估备注</label>
            <textarea
              name="session_notes"
              rows={2}
              placeholder="可选：填写本次评估的背景信息或观察..."
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#374151] placeholder:text-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
            />
          </div>
        </div>

        {/* 评分标准 */}
        <div className="rounded-xl border border-[#e8e8e0] bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-[#6b7280]" />
            <span className="text-xs font-medium text-[#374151]">评分标准</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {CONNERS_SCORE_LEVELS.map((level) => (
              <div key={level.value} className="text-center rounded-lg bg-[#f9fafb] p-2">
                <span className="text-sm font-medium text-brand">{level.value}</span>
                <p className="text-xs text-[#6b7280] mt-0.5">{level.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 题目列表 - 按因子分组 */}
        {factors.map((factor) => {
          const factorItems = itemsByFactor.get(factor.code) || [];
          if (factorItems.length === 0) return null;

          return (
            <div key={factor.code} className="rounded-xl border border-[#e8e8e0] bg-white overflow-hidden">
              <div className="bg-[#f9fafb] px-5 py-3 border-b border-[#e8e8e0]">
                <h3 className="text-sm font-medium text-[#374151]">
                  {factor.code !== "HI" ? `因子${factor.code}` : ""} {factor.label}
                  <span className="text-xs text-[#9ca3af] ml-2">({factor.item_numbers.length}项)</span>
                </h3>
              </div>
              <div className="divide-y divide-[#f3f4f6]">
                {factorItems.map((item) => (
                  <ConnersItemRow key={item.item_number} item={item} />
                ))}
              </div>
            </div>
          );
        })}

        {/* 不属于任何因子的题目 */}
        {itemsWithoutFactor.length > 0 && (
          <div className="rounded-xl border border-[#e8e8e0] bg-white overflow-hidden">
            <div className="bg-[#f9fafb] px-5 py-3 border-b border-[#e8e8e0]">
              <h3 className="text-sm font-medium text-[#374151]">其他项目</h3>
            </div>
            <div className="divide-y divide-[#f3f4f6]">
              {itemsWithoutFactor.map((item) => (
                <ConnersItemRow key={item.item_number} item={item} />
              ))}
            </div>
          </div>
        )}
      </ConnersAssessForm>
    </PageShell>
  );
}

function ConnersItemRow({ item }: { item: { item_number: number; name: string } }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xs font-mono text-[#d1d5db] w-6 text-right shrink-0">
          {item.item_number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#374151] leading-relaxed">{item.name}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[0, 1, 2, 3].map((val) => (
              <label
                key={val}
                className="inline-flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`score_${item.item_number}`}
                  value={val}
                  className="h-4 w-4 text-brand border-[#d1d5db] focus:ring-brand"
                />
                <span className="text-xs text-[#6b7280]">{val}</span>
              </label>
            ))}
            <input
              type="text"
              name={`notes_${item.item_number}`}
              placeholder="备注（可选）"
              className="ml-2 flex-1 min-w-[120px] rounded-lg border border-[#e8e8e0] px-2 py-1 text-xs text-[#374151] placeholder:text-[#d1d5db] focus:outline-none focus:ring-1 focus:ring-brand/20 focus:border-brand"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
