import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import SubmitButton from "@/app/components/submit-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TreatmentPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT * FROM children WHERE id = ?")
    .get(childId) as {
    id: number;
    name: string;
  } | undefined;

  if (!child) {
    notFound();
  }

  const existingPlan = db
    .prepare("SELECT * FROM treatment_plans WHERE child_id = ?")
    .get(childId) as {
    id: number;
    content: string;
  } | undefined;

  async function saveTreatment(formData: FormData) {
    "use server";

    const content = formData.get("content") as string;

    if (!content.trim()) {
      return;
    }

    if (existingPlan) {
      db.prepare(
        "UPDATE treatment_plans SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(content, existingPlan.id);
    } else {
      db.prepare(
        "INSERT INTO treatment_plans (child_id, content) VALUES (?, ?)"
      ).run(childId, content);
    }

    redirect(`/children/${childId}?toast=success&message=${encodeURIComponent("治疗计划已保存")}`);
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link
            href={`/children/${childId}`}
            className="text-sm text-brand hover:underline"
          >
            ← 返回{child.name}的详情
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#374151]">
            {existingPlan ? "编辑" : "制定"}治疗计划 — {child.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form
          action={saveTreatment}
          className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-[#6b7280] mb-2"
            >
              治疗/教育计划内容
            </label>
            <textarea
              id="content"
              name="content"
              rows={12}
              defaultValue={existingPlan?.content || ""}
              required
              className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="在这里填写针对该学生的治疗和教育计划...&#10;&#10;可以包括：&#10;- 每日/每周的训练目标&#10;- 具体的活动和方法&#10;- 家庭配合建议&#10;- 注意事项"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href={`/children/${childId}`}
              className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb]"
            >
              取消
            </Link>
            <SubmitButton label="保存计划" loadingLabel="保存中..." />
          </div>
        </form>
      </main>
    </div>
  );
}
