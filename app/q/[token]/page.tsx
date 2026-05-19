import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type Questionnaire = {
  id: number;
  child_id: number;
  token: string;
  // 联系信息
  parent_name: string | null;
  relation: string | null;
  contact: string | null;
  // 孩子基本信息(来自 ABLLS-R sheet 1)
  child_gender: string | null;
  child_birth_date: string | null;
  diagnosis: string | null;
  diagnosis_hospital: string | null;
  diagnosis_date: string | null;
  // 健康/干预
  current_training: string | null;
  medication: string | null;
  allergies: string | null;
  prior_training: string | null;
  prior_assessment: string | null;
  // 孩子特点
  daily_behavior: string | null;
  main_reinforcers: string | null;
  // 关注与期望
  top_concerns: string | null;
  parent_expectations: string | null;
  submitted_at: string | null;
  updated_at: string;
};

export default async function ParentQuestionnairePage({
  params,
  searchParams,
}: Props) {
  const { token } = await params;
  const search = await searchParams;
  const justSaved = search.saved === "1";

  const q = db
    .prepare("SELECT * FROM parent_questionnaires WHERE token = ?")
    .get(token) as Questionnaire | undefined;

  if (!q) {
    notFound();
  }

  const child = db
    .prepare(
      "SELECT id, name, child_gender, child_birth_date FROM children WHERE id = ?"
    )
    .get(q.child_id) as
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

  // 表单初始值:问卷里如果还没填,就用学生档案里老师录入的值兜底
  const defaultGender = q.child_gender ?? child.child_gender ?? "";
  const defaultBirthDate = q.child_birth_date ?? child.child_birth_date ?? "";

  async function saveQuestionnaire(formData: FormData) {
    "use server";

    const text = (k: string) =>
      ((formData.get(k) as string) ?? "").trim() || null;

    const parent_name = text("parent_name");
    const parent_expectations = text("parent_expectations");

    if (!parent_name || !parent_expectations) {
      return;
    }

    db.prepare(
      `UPDATE parent_questionnaires
       SET parent_name = ?, relation = ?, contact = ?,
           child_gender = ?, child_birth_date = ?,
           diagnosis = ?, diagnosis_hospital = ?, diagnosis_date = ?,
           current_training = ?, medication = ?, allergies = ?,
           prior_training = ?, prior_assessment = ?,
           daily_behavior = ?, main_reinforcers = ?,
           top_concerns = ?, parent_expectations = ?,
           submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE token = ?`
    ).run(
      parent_name,
      text("relation"),
      text("contact"),
      text("child_gender"),
      text("child_birth_date"),
      text("diagnosis"),
      text("diagnosis_hospital"),
      text("diagnosis_date"),
      text("current_training"),
      text("medication"),
      text("allergies"),
      text("prior_training"),
      text("prior_assessment"),
      text("daily_behavior"),
      text("main_reinforcers"),
      text("top_concerns"),
      parent_expectations,
      token
    );

    db.prepare("UPDATE children SET parent_expectations = ? WHERE id = ?").run(
      parent_expectations,
      q!.child_id
    );

    // 同步孩子基本信息(性别 + 出生日期)到 children 表,只在家长填了的时候覆盖。
    // 让学生档案 / 列表 / 评估页都能直接读到。
    const gender = text("child_gender");
    const dob = text("child_birth_date");
    if (gender !== null) {
      db.prepare("UPDATE children SET child_gender = ? WHERE id = ?").run(
        gender,
        q!.child_id
      );
    }
    if (dob !== null) {
      db.prepare("UPDATE children SET child_birth_date = ? WHERE id = ?").run(
        dob,
        q!.child_id
      );
    }

    redirect(`/q/${token}?saved=1`);
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-bold text-[#374151]">
            家长问卷 — {child.name}
          </h1>
          <p className="mt-2 text-sm text-[#6b7280] leading-relaxed">
            感谢您配合填写。您提供的信息将帮助老师更全面地了解 {child.name}
            ,并据此制定个性化的教育计划。除"姓名"和"您的期望"必填外,其余项均可选填。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {justSaved && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              ✓ 已提交成功,感谢您的配合!您可关闭页面,也可继续修改后再提交。
            </p>
          </div>
        )}

        {q.submitted_at && !justSaved && (
          <div className="mb-6 rounded-lg border border-[#c5e1a5] bg-[#f1f8e9] p-4">
            <p className="text-sm text-brand-dark">
              您已于 {new Date(q.submitted_at).toLocaleString("zh-CN")}{" "}
              提交过此问卷。可以重新编辑后再次提交。
            </p>
          </div>
        )}

        <form action={saveQuestionnaire} className="space-y-6">
          {/* 一、家长信息 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#374151]">
              一、您的信息
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="parent_name"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  您的姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="parent_name"
                  name="parent_name"
                  required
                  defaultValue={q.parent_name ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="relation"
                    className="block text-sm font-medium text-[#6b7280]"
                  >
                    与孩子的关系
                  </label>
                  <select
                    id="relation"
                    name="relation"
                    defaultValue={q.relation ?? ""}
                    className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">请选择</option>
                    <option value="父亲">父亲</option>
                    <option value="母亲">母亲</option>
                    <option value="祖父母/外祖父母">祖父母 / 外祖父母</option>
                    <option value="其他监护人">其他监护人</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="contact"
                    className="block text-sm font-medium text-[#6b7280]"
                  >
                    联系方式(手机或微信)
                  </label>
                  <input
                    type="text"
                    id="contact"
                    name="contact"
                    defaultValue={q.contact ?? ""}
                    className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 二、孩子基本信息 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#374151]">
              二、孩子基本信息
            </h2>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#6b7280]">
                    性别
                  </label>
                  <div className="mt-2 flex gap-4 text-sm text-[#6b7280]">
                    {["男", "女", "其他"].map((g) => (
                      <label key={g} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="child_gender"
                          value={g}
                          defaultChecked={defaultGender === g}
                          className="h-4 w-4 text-brand"
                        />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="child_birth_date"
                    className="block text-sm font-medium text-[#6b7280]"
                  >
                    出生日期
                  </label>
                  <input
                    type="date"
                    id="child_birth_date"
                    name="child_birth_date"
                    defaultValue={defaultBirthDate}
                    className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 三、诊断信息 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#374151]">
              三、诊断信息
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="diagnosis"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  诊断结果
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  例如:自闭症谱系障碍、发育迟缓等
                </p>
                <input
                  type="text"
                  id="diagnosis"
                  name="diagnosis"
                  defaultValue={q.diagnosis ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="diagnosis_hospital"
                    className="block text-sm font-medium text-[#6b7280]"
                  >
                    诊断医院
                  </label>
                  <input
                    type="text"
                    id="diagnosis_hospital"
                    name="diagnosis_hospital"
                    defaultValue={q.diagnosis_hospital ?? ""}
                    className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="diagnosis_date"
                    className="block text-sm font-medium text-[#6b7280]"
                  >
                    诊断日期
                  </label>
                  <input
                    type="date"
                    id="diagnosis_date"
                    name="diagnosis_date"
                    defaultValue={q.diagnosis_date ?? ""}
                    className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 四、健康与干预 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#374151]">
              四、健康与干预情况
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="current_training"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  当前是否接受康复训练?
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  请说明训练类型和时长,例如:"是,语言治疗,每周 2 次,每次 1 小时" 或 "无"
                </p>
                <textarea
                  id="current_training"
                  name="current_training"
                  rows={2}
                  defaultValue={q.current_training ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="prior_training"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  之前接受过的训练或治疗
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">如有请简要说明</p>
                <textarea
                  id="prior_training"
                  name="prior_training"
                  rows={2}
                  defaultValue={q.prior_training ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="medication"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  是否服用药物?
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  请说明药物名称和用药时间;无则填"无"
                </p>
                <textarea
                  id="medication"
                  name="medication"
                  rows={2}
                  defaultValue={q.medication ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="allergies"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  过敏史 / 禁忌事项
                </label>
                <input
                  type="text"
                  id="allergies"
                  name="allergies"
                  defaultValue={q.allergies ?? ""}
                  placeholder="无 或 具体说明"
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </section>

          {/* 五、孩子的特点 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#374151]">
              五、孩子的特点
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="daily_behavior"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  孩子在家的日常表现
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  例如:沟通方式、情绪特点、与家人的互动、兴趣爱好等
                </p>
                <textarea
                  id="daily_behavior"
                  name="daily_behavior"
                  rows={4}
                  defaultValue={q.daily_behavior ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="main_reinforcers"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  主要强化物
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  孩子最喜欢的物品 / 活动 / 食物(老师会用这些做奖励)
                </p>
                <textarea
                  id="main_reinforcers"
                  name="main_reinforcers"
                  rows={2}
                  defaultValue={q.main_reinforcers ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="prior_assessment"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  上一次评估
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  如有,请简要说明评估时间和使用的工具
                </p>
                <input
                  type="text"
                  id="prior_assessment"
                  name="prior_assessment"
                  defaultValue={q.prior_assessment ?? ""}
                  placeholder="例如:2025-06,使用 PEP-3"
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </section>

          {/* 六、关注和期望 */}
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#374151]">
              六、您的关注和期望
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="top_concerns"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  您最关注的 2-3 个问题
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  例如:语言发展、社交、自理能力、注意力等当前最担心的
                </p>
                <textarea
                  id="top_concerns"
                  name="top_concerns"
                  rows={3}
                  defaultValue={q.top_concerns ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="parent_expectations"
                  className="block text-sm font-medium text-[#6b7280]"
                >
                  您对孩子的期望 <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  希望孩子能在哪些方面有进步、未来理想的状态等
                </p>
                <textarea
                  id="parent_expectations"
                  name="parent_expectations"
                  rows={4}
                  required
                  defaultValue={q.parent_expectations ?? ""}
                  className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-xl border border-[#e8e8e0] bg-white p-4 shadow-sm">
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
            >
              {q.submitted_at ? "更新提交" : "提交问卷"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
