import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  getReportForSession,
  REPORT_FIELDS,
  saveReportEdits,
} from "@/lib/report";

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function EditReportPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id, sessionId: sessionIdStr } = await params;
  const childId = parseInt(id);
  const sessionId = parseInt(sessionIdStr);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;
  if (!child) notFound();

  const session = db
    .prepare(
      "SELECT id FROM assessment_sessions WHERE id = ? AND child_id = ?"
    )
    .get(sessionId, childId) as { id: number } | undefined;
  if (!session) notFound();

  const report = getReportForSession(sessionId);

  async function saveEdits(formData: FormData) {
    "use server";
    await requireRole("teacher", "admin");

    const text = (k: string) =>
      ((formData.get(k) as string) ?? "").trim() || null;

    saveReportEdits(sessionId, {
      strengths: text("strengths"),
      weaknesses: text("weaknesses"),
      analysis: text("analysis"),
      short_term_goals: text("short_term_goals"),
      mid_term_goals: text("mid_term_goals"),
      long_term_goals: text("long_term_goals"),
      family_advice: text("family_advice"),
    });

    redirect(
      `/children/${childId}/assessments/${sessionId}?ok=generated`
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href={`/children/${childId}/assessments/${sessionId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← 返回评估详情
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            编辑评估报告 — {child.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            修改后保存,会立即对家长可见。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form action={saveEdits} className="space-y-5">
          {REPORT_FIELDS.map((f) => (
            <section
              key={f.key}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <label
                htmlFor={f.key}
                className="block text-sm font-semibold text-gray-800"
              >
                {f.label}
              </label>
              {f.placeholder && (
                <p className="mt-1 text-xs text-gray-500">{f.placeholder}</p>
              )}
              <textarea
                id={f.key}
                name={f.key}
                rows={5}
                defaultValue={report?.[f.key] ?? ""}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </section>
          ))}

          <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-md">
            <Link
              href={`/children/${childId}/assessments/${sessionId}`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
