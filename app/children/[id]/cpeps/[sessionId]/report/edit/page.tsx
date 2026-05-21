import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import SubmitButton from "@/app/components/submit-button";
import {
  getCpepReportForSession,
  CPEP_REPORT_FIELDS,
  saveCpepReportEdits,
} from "@/lib/report";

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function EditCpepReportPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id, sessionId: sessionIdStr } = await params;
  const childId = parseInt(id);
  const sessionId = parseInt(sessionIdStr);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;
  if (!child) notFound();

  const session = db
    .prepare("SELECT id FROM cpep_sessions WHERE id = ? AND child_id = ?")
    .get(sessionId, childId) as { id: number } | undefined;
  if (!session) notFound();

  const report = getCpepReportForSession(sessionId);

  async function saveEdits(formData: FormData) {
    "use server";
    await requireRole("teacher", "admin");

    const text = (k: string) =>
      ((formData.get(k) as string) ?? "").trim() || null;

    saveCpepReportEdits(sessionId, {
      domain_analysis: text("domain_analysis"),
      emotion_analysis: text("emotion_analysis"),
      training_goals: text("training_goals"),
      family_advice: text("family_advice"),
    });

    redirect(`/children/${childId}/cpeps/${sessionId}`);
  }

  return (
    <PageShell
      backHref={`/children/${childId}/cpeps/${sessionId}`}
      backLabel="返回评估详情"
      title={`编辑报告 — ${child.name}`}
      subtitle="修改后保存，会立即对家长可见"
      maxWidth="lg"
      showLogo
    >
      <form action={saveEdits} className="space-y-5">
        {CPEP_REPORT_FIELDS.map((f) => (
          <section key={f.key} className="rounded-xl bg-white border border-[#e8e8e0] p-4">
            <label className="block text-sm font-medium text-[#374151] mb-2">
              {f.label}
            </label>
            <textarea
              name={f.key}
              rows={6}
              defaultValue={report?.[f.key] ?? ""}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-y"
            />
          </section>
        ))}

        <div className="flex items-center justify-between gap-4 sticky bottom-4 bg-white rounded-xl border border-[#e8e8e0] p-4 shadow-lg">
          <Link
            href={`/children/${childId}/cpeps/${sessionId}`}
            className="text-sm text-[#6b7280] hover:text-[#374151] transition-colors"
          >
            取消
          </Link>
          <SubmitButton
            label="保存报告"
            loadingLabel="保存中..."
            className="rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
          />
        </div>
      </form>
    </PageShell>
  );
}
