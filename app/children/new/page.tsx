import Link from "next/link";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";

export default async function NewChildPage() {
  await requireRole("teacher", "admin");

  async function addChild(formData: FormData) {
    "use server";

    const name = (formData.get("name") as string)?.trim();
    const child_gender = (formData.get("child_gender") as string) || null;
    const child_birth_date =
      (formData.get("child_birth_date") as string) || null;
    const diagnosis_notes = (formData.get("diagnosis_notes") as string) || null;
    const parent_expectations =
      (formData.get("parent_expectations") as string) || null;

    if (!name) {
      return;
    }

    const result = db
      .prepare(
        `INSERT INTO children (name, child_gender, child_birth_date, diagnosis_notes, parent_expectations)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        name,
        child_gender,
        child_birth_date,
        diagnosis_notes,
        parent_expectations
      );

    redirect(`/children/${result.lastInsertRowid}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← 返回首页
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            添加学生
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            性别和出生日期也可以让家长稍后通过问卷填写
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form
          action={addChild}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="请输入学生姓名"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  性别
                </label>
                <div className="mt-2 flex gap-4 text-sm text-gray-700">
                  {["男", "女", "其他"].map((g) => (
                    <label key={g} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="child_gender"
                        value={g}
                        className="h-4 w-4 text-blue-600"
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label
                  htmlFor="child_birth_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  出生日期
                </label>
                <input
                  type="date"
                  id="child_birth_date"
                  name="child_birth_date"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  实足年龄会根据出生日期自动算出
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="diagnosis_notes"
                className="block text-sm font-medium text-gray-700"
              >
                诊断备注
              </label>
              <textarea
                id="diagnosis_notes"
                name="diagnosis_notes"
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="简要描述学生的情况（可选）"
              />
            </div>

            <div>
              <label
                htmlFor="parent_expectations"
                className="block text-sm font-medium text-gray-700"
              >
                家长期望
              </label>
              <textarea
                id="parent_expectations"
                name="parent_expectations"
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="家长希望孩子在哪些方面进步？(可选)"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
