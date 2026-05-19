import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";

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

    redirect(`/children/${childId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link
            href={`/children/${childId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← 返回{child.name}的详情
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {existingPlan ? "编辑" : "制定"}治疗计划 — {child.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form
          action={saveTreatment}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              治疗/教育计划内容
            </label>
            <textarea
              id="content"
              name="content"
              rows={12}
              defaultValue={existingPlan?.content || ""}
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="在这里填写针对该学生的治疗和教育计划...&#10;&#10;可以包括：&#10;- 每日/每周的训练目标&#10;- 具体的活动和方法&#10;- 家庭配合建议&#10;- 注意事项"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href={`/children/${childId}`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              保存计划
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
