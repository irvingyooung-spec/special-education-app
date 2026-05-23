import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import SubmitButton from "@/app/components/submit-button";
import {
  getCarsReportForSession,
  saveCarsReportEdits,
  CARS_REPORT_FIELDS,
} from "@/lib/cars-report";

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function CarsReportEditPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id, sessionId } = await params;
  const childId = parseInt(id);
  const sessionIdNum = parseInt(sessionId);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const session = db
    .prepare("SELECT * FROM cars_sessions WHERE id = ? AND child_id = ?")
    .get(sessionIdNum, childId) as
    | {
        id: number;
        evaluator_name: string | null;
        created_at: string;
      }
    | undefined;

  if (!session) notFound();

  const report = getCarsReportForSession(sessionIdNum);

  async function saveEdits(formData: FormData) {
    "use server";
    await requireRole("teacher", "admin");

    const fields: Record<string, string> = {};
    for (const field of CARS_REPORT_FIELDS) {
      const value = formData.get(field.key) as string;
      if (value !== null) {
        fields[field.key] = value;
      }
    }

    saveCarsReportEdits(sessionIdNum, fields);
    redirect(`/children/${childId}/carss/${sessionIdNum}`);
  }

  return (
    <PageShell
      backHref={`/children/${childId}/carss/${sessionIdNum}`}
      backLabel="返回评估详情"
      title="编辑评估报告"
      subtitle={`${child.name} · 修改后保存，会立即对家长可见`}
      maxWidth="lg"
      showLogo
    >
      <form action={saveEdits} className="space-y-6">
        {CARS_REPORT_FIELDS.map((field) => {
          const existingValue =
            report?.[field.key as keyof typeof report] ?? "";
          return (
            <div key={field.key} className="space-y-2">
              <label className="block text-sm font-medium text-[#374151]">
                {field.label}
              </label>
              <textarea
                name={field.key}
                defaultValue={existingValue}
                placeholder={field.placeholder}
                rows={6}
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-y"
              />
            </div>
          );
        })}

        <div className="sticky bottom-4 bg-white rounded-xl border border-[#e8e8e0] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/children/${childId}/carss/${sessionIdNum}`}
              className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors"
            >
              取消
            </Link>
            <SubmitButton
              label="保存报告"
              loadingLabel="保存中..."
              className="rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
            />
          </div>
        </div>
      </form>
    </PageShell>
  );
}
