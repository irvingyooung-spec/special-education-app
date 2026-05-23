import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import {
  getToken,
  markTokenUsed,
  createSession,
  saveScores,
  getItemId,
} from "@/lib/conners";
import {
  CONNERS_SCORE_LEVELS,
  getItemsByQuestionnaire,
  getFactorsForQuestionnaire,
} from "@/lib/conners-catalog";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ParentConnersPage({ params }: Props) {
  const { token } = await params;

  const tokenRecord = getToken(token);
  if (!tokenRecord) {
    notFound();
  }

  const child = db
    .prepare(
      "SELECT id, name, child_gender, child_birth_date FROM children WHERE id = ?"
    )
    .get(tokenRecord.child_id) as
    | {
        id: number;
        name: string;
        child_gender: string | null;
        child_birth_date: string | null;
      }
    | undefined;

  if (!child) {
    notFound();
  }

  // 如果 token 已使用，显示感谢信息
  if (tokenRecord.used_session_id) {
    const session = db
      .prepare("SELECT * FROM conners_sessions WHERE id = ?")
      .get(tokenRecord.used_session_id) as {
        id: number;
        created_at: string;
      } | undefined;

    return (
      <div className="min-h-screen bg-[#f9fafb]">
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-2xl px-4 py-6">
            <h1 className="text-2xl font-bold text-[#374151]">
              Conners 父母问卷 — {child.name}
            </h1>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <p className="text-lg text-green-800 font-medium">
              感谢您的配合！
            </p>
            <p className="mt-2 text-sm text-green-700">
              您已于 {new Date(session?.created_at ?? "1970-01-01").toLocaleString("zh-CN")} 提交了问卷。
            </p>
            <p className="mt-1 text-sm text-green-600">
              评估结果将由老师整理后与您沟通。
            </p>
          </div>
        </main>
      </div>
    );
  }

  const items = getItemsByQuestionnaire("parent");
  const factors = getFactorsForQuestionnaire("parent");

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

  async function submitQuestionnaire(formData: FormData) {
    "use server";

    const parentName = (formData.get("parent_name") as string) || "家长";
    const respondentRole = (formData.get("respondent_role") as string) || "parent";

    // 创建 session（无 evaluator，因为是家长直接填写）
    const sessionId = createSession(
      tokenRecord!.child_id,
      null,
      null,
      "parent",
      respondentRole,
      parentName,
      null
    );

    // 收集评分
    const scores: Array<{ itemId: number; score: number; notes: string | null }> = [];
    for (const item of items) {
      const scoreStr = formData.get(`score_${item.item_number}`) as string;
      if (scoreStr !== null && scoreStr !== "") {
        const itemId = getItemId("parent", item.item_number);
        if (itemId !== undefined) {
          scores.push({
            itemId,
            score: parseInt(scoreStr),
            notes: null,
          });
        }
      }
    }

    saveScores(sessionId, scores);
    markTokenUsed(tokenRecord!.id, sessionId);

    redirect(`/q/conners/${token}?submitted=1`);
  }

  // 检查是否刚刚提交: token 已使用时会显示感谢页(见上方 tokenRecord.used_session_id 分支)

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-bold text-[#374151]">
            Conners 父母问卷 — {child.name}
          </h1>
          <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
            请您根据孩子最近一年的表现，对以下48项行为进行评分。
            评分方式：0=没有，1=偶尔有一点，2=相当多，3=非常多。
            请尽量如实填写，所有信息仅用于教育评估。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form action={submitQuestionnaire} className="space-y-6">
          {/* 填写人信息 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#374151]">
              填写人信息
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#6b7280] mb-1">
                  您的姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="parent_name"
                  required
                  placeholder="请输入姓名"
                  className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#374151] placeholder:text-[#9ca3af] focus:border-[#4a7c59] focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#6b7280] mb-1">
                  与孩子的关系 <span className="text-red-500">*</span>
                </label>
                <select
                  name="respondent_role"
                  required
                  className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#374151] focus:border-[#4a7c59] focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/20 bg-white"
                >
                  <option value="">请选择</option>
                  <option value="father">父亲</option>
                  <option value="mother">母亲</option>
                  <option value="other">其他监护人</option>
                </select>
              </div>
            </div>
          </section>

          {/* 评分标准 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-4 shadow-sm">
            <div className="grid grid-cols-4 gap-2">
              {CONNERS_SCORE_LEVELS.map((level) => (
                <div key={level.value} className="text-center rounded-lg bg-[#f9fafb] p-2">
                  <span className="text-sm font-medium text-[#4a7c59]">{level.value}</span>
                  <p className="text-xs text-[#6b7280] mt-0.5">{level.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 题目 - 按因子分组 */}
          {factors.map((factor) => {
            const factorItems = itemsByFactor.get(factor.code) || [];
            if (factorItems.length === 0) return null;

            return (
              <section key={factor.code} className="rounded-xl border border-[#e8e8e0] bg-white overflow-hidden shadow-sm">
                <div className="bg-[#f9fafb] px-5 py-3 border-b border-[#e8e8e0]">
                  <h3 className="text-sm font-medium text-[#374151]">
                    {factor.code !== "HI" ? `因子${factor.code}` : ""} {factor.label}
                    <span className="text-xs text-[#9ca3af] ml-2">({factorItems.length}项)</span>
                  </h3>
                </div>
                <div className="divide-y divide-[#f3f4f6]">
                  {factorItems.map((item) => (
                    <div key={item.item_number} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-xs font-mono text-[#d1d5db] w-6 text-right shrink-0">
                          {item.item_number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#374151] leading-relaxed">{item.name}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            {[0, 1, 2, 3].map((val) => (
                              <label key={val} className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`score_${item.item_number}`}
                                  value={val}
                                  required
                                  className="h-4 w-4 text-[#4a7c59] border-[#d1d5db] focus:ring-[#4a7c59]"
                                />
                                <span className="text-xs text-[#6b7280]">{val}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* 不属于任何因子的题目 */}
          {itemsWithoutFactor.length > 0 && (
            <section className="rounded-xl border border-[#e8e8e0] bg-white overflow-hidden shadow-sm">
              <div className="bg-[#f9fafb] px-5 py-3 border-b border-[#e8e8e0]">
                <h3 className="text-sm font-medium text-[#374151]">其他项目</h3>
              </div>
              <div className="divide-y divide-[#f3f4f6]">
                {itemsWithoutFactor.map((item) => (
                  <div key={item.item_number} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-xs font-mono text-[#d1d5db] w-6 text-right shrink-0">
                        {item.item_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#374151] leading-relaxed">{item.name}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {[0, 1, 2, 3].map((val) => (
                            <label key={val} className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`score_${item.item_number}`}
                                value={val}
                                required
                                className="h-4 w-4 text-[#4a7c59] border-[#d1d5db] focus:ring-[#4a7c59]"
                              />
                              <span className="text-xs text-[#6b7280]">{val}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="sticky bottom-6 z-10 rounded-xl border border-[#e8e8e0] bg-white p-4 shadow-lg">
            <button
              type="submit"
              className="w-full rounded-lg bg-[#4a7c59] px-4 py-3 text-sm font-medium text-white hover:bg-[#3d6b4a] transition-all duration-200 active:scale-[0.98]"
            >
              提交问卷
            </button>
            <p className="mt-2 text-xs text-center text-[#9ca3af]">
              提交后评估结果将由老师整理并与您沟通
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
