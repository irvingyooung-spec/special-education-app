import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import {
  CARS_DOMAINS,
  getScoreLevelsForDomain,
  CARS_DRAWING_CRITERIA,
  isPathologyDomain,
} from "@/lib/cars-catalog";
import {
  getItemsByDomain,
  getDraftScores,
  getLatestCompletedDomainScores,
  getDraftSession,
  createDraftSession,
  saveDraftScore,
} from "@/lib/cars";
import { Info, Save, ArrowLeft, Eye } from "lucide-react";
import SubmitButton from "@/app/components/submit-button";
import CarsAutoSave from "@/app/components/cars-autosave";

interface Props {
  params: Promise<{ id: string; domain: string }>;
}

export default async function CarsDomainAssessPage({ params }: Props) {
  const me = await requireRole("teacher", "admin");
  const { id, domain } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const domainInfo = CARS_DOMAINS.find((d) => d.code === domain);
  if (!domainInfo) notFound();

  const items = getItemsByDomain(domain) as Array<{
    id: number;
    domain_code: string;
    item_code: string;
    name: string;
    goal: string;
    materials: string | null;
    method: string | null;
    is_observation: number;
    order_in_domain: number;
  }>;

  // Get last completed scores for reference
  const lastCompletedScores = getLatestCompletedDomainScores(childId, domain);
  const lastScoreMap = new Map<number, string>();
  for (const s of lastCompletedScores) {
    lastScoreMap.set(s.item_id, s.score);
  }

  // Get or create draft session
  let draftSession = getDraftSession(childId);
  if (!draftSession) {
    const draftId = createDraftSession(childId, me.id, me.username);
    draftSession = {
      id: draftId,
      child_id: childId,
      evaluator_user_id: me.id,
      evaluator_name: me.username,
      session_notes: null,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Filter draft scores for this domain
  const allDraftScores = draftSession ? getDraftScores(draftSession.id) : [];
  const domainItemIds = new Set(items.map((i) => i.id));
  const draftScores = allDraftScores.filter((s) =>
    domainItemIds.has(s.item_id)
  );

  const draftScoreMap = new Map<
    number,
    { score: string; notes: string | null }
  >();
  for (const s of draftScores) {
    draftScoreMap.set(s.item_id, { score: s.score, notes: s.notes });
  }

  const scoreLevels = getScoreLevelsForDomain(domain);
  const isPathology = isPathologyDomain(domain);

  // Drawing criteria for items 32-36
  const drawingCriteriaMap = new Map<string, (typeof CARS_DRAWING_CRITERIA)[0]>();
  for (const c of CARS_DRAWING_CRITERIA) {
    drawingCriteriaMap.set(c.item_code, c);
  }

  async function handleAction(formData: FormData) {
    "use server";

    const sessionId = parseInt(formData.get("session_id") as string);
    const evaluatorName = (
      (formData.get("evaluator_name") as string) ?? me.username
    ).trim();
    const sessionNotes = (
      (formData.get("session_notes") as string) ?? ""
    ).trim();

    if (!sessionId) {
      redirect(
        `/children/${childId}/cars/${domain}?toast=error&message=${encodeURIComponent(
          "会话ID无效"
        )}`
      );
    }

    // Save all scores from the form
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("score_")) {
        const itemId = parseInt(key.replace("score_", ""));
        const score = value as string;
        const notes = formData.get(`notes_${itemId}`) as string | null;
        if (score && !Number.isNaN(itemId)) {
          saveDraftScore(sessionId, itemId, score, notes || null);
        }
      }
    }

    // Update evaluator name and notes
    db.prepare(
      `UPDATE cars_sessions SET evaluator_name = ?, session_notes = ? WHERE id = ?`
    ).run(evaluatorName, sessionNotes || null, sessionId);

    redirect(
      `/children/${childId}/cars?toast=success&message=${encodeURIComponent(
        "评估已保存"
      )}`
    );
  }

  const draftedCount = draftScores.length;

  return (
    <PageShell
      backHref={`/children/${childId}/cars`}
      backLabel="返回总览"
      title={`${domainInfo.label} 评估`}
      subtitle={`${child.name} · 共 ${items.length} 项 · 已保存 ${draftedCount} 项`}
      maxWidth="lg"
      showLogo
    >
      <form
        action={handleAction}
        className="space-y-6"
        data-draft-session-id={draftSession?.id}
      >
        <input type="hidden" name="session_id" value={draftSession?.id} />

        {/* Evaluator info */}
        <div className="rounded-xl bg-white border border-[#e8e8e0] p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                评估者
              </label>
              <input
                type="text"
                name="evaluator_name"
                defaultValue={draftSession?.evaluator_name ?? me.username}
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                评估备注
              </label>
              <input
                type="text"
                name="session_notes"
                defaultValue={draftSession?.session_notes ?? ""}
                placeholder="本次评估的特殊情况..."
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>
          </div>
          {/* Auto-save indicator */}
          <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
            <Save className="h-3 w-3" />
            <span id="autosave-status">已自动保存 {draftedCount} 项评分</span>
          </div>
        </div>

        {/* Score legend */}
        <div
          className={`rounded-xl border p-3 ${
            isPathology
              ? "bg-red-50 border-red-100"
              : "bg-[#f9fafb] border-[#e8e8e0]"
          }`}
        >
          <div className="flex flex-wrap gap-3 text-xs">
            {scoreLevels.map((level) => (
              <div key={level.value} className="flex items-center gap-1">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded border font-mono font-medium text-[10px] ${
                    isPathology
                      ? "bg-white border-red-200 text-red-600"
                      : "bg-white border-[#d1d5db] text-[#374151]"
                  }`}
                >
                  {level.value}
                </span>
                <span className="text-[#6b7280]">{level.label}</span>
                <span className="text-[#9ca3af]">({level.desc})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden">
          <div className="divide-y divide-[#f0f0eb]">
            {items.map((item) => {
              const lastScore = lastScoreMap.get(item.id);
              const draft = draftScoreMap.get(item.id);
              const draftScore = draft?.score;
              const draftNotes = draft?.notes;
              const drawingCriteria = drawingCriteriaMap.get(item.item_code);

              return (
                <div key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xs text-[#d1d5db] font-mono shrink-0">
                      {item.item_code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[#374151]">
                            {item.name}
                            {item.is_observation && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                <Eye className="h-3 w-3" />
                                观察项目
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[#9ca3af] mt-0.5">
                            {item.goal}
                          </p>
                        </div>
                      </div>

                      {/* Expandable details */}
                      {(item.materials || item.method || drawingCriteria) && (
                        <details className="mt-2">
                          <summary className="text-xs text-brand cursor-pointer hover:text-brand-dark flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            查看测试详情
                          </summary>
                          <div className="mt-2 space-y-2 text-xs text-[#6b7280] bg-[#f9fafb] rounded-lg p-3">
                            {item.materials && (
                              <div>
                                <span className="font-medium text-[#374151]">
                                  材料:
                                </span>{" "}
                                {item.materials}
                              </div>
                            )}
                            {item.method && (
                              <div>
                                <span className="font-medium text-[#374151]">
                                  方法:
                                </span>{" "}
                                <span className="whitespace-pre-wrap">
                                  {item.method}
                                </span>
                              </div>
                            )}
                            {drawingCriteria && (
                              <div className="space-y-1 border-t border-[#e8e8e0] pt-2 mt-2">
                                <p className="font-medium text-[#374151]">
                                  仿画评分标准:
                                </p>
                                <p>
                                  <span className="text-green-600">通过:</span>{" "}
                                  {drawingCriteria.pass_standard}
                                </p>
                                <p>
                                  <span className="text-yellow-600">
                                    中间反应:
                                  </span>{" "}
                                  {drawingCriteria.mid_standard}
                                </p>
                                <p>
                                  <span className="text-red-600">
                                    通不过:
                                  </span>{" "}
                                  {drawingCriteria.fail_standard}
                                </p>
                              </div>
                            )}
                          </div>
                        </details>
                      )}

                      {/* Last score reference */}
                      {lastScore && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-[#9ca3af]">上次:</span>
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium ${
                              lastScore === "P" || lastScore === "N"
                                ? "bg-green-100 text-green-700"
                                : lastScore === "M" || lastScore === "L"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {lastScore}
                          </span>
                        </div>
                      )}

                      {/* Score options */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {scoreLevels.map((level) => (
                          <label
                            key={level.value}
                            className="inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`score_${item.id}`}
                              value={level.value}
                              defaultChecked={draftScore === level.value}
                              data-item-id={item.id}
                              className="sr-only peer auto-save-trigger"
                            />
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors peer-checked:bg-brand peer-checked:text-white peer-checked:border-brand hover:bg-[#f9fafb] ${
                                draftScore === level.value
                                  ? "border-brand bg-brand text-white"
                                  : "border-[#d1d5db] bg-white text-[#374151]"
                              }`}
                            >
                              {level.value}
                            </span>
                          </label>
                        ))}
                        <input
                          type="text"
                          name={`notes_${item.id}`}
                          placeholder="备注..."
                          defaultValue={draftNotes || ""}
                          data-item-id={item.id}
                          className="flex-1 min-w-[120px] rounded-lg border border-[#d1d5db] px-2 py-1 text-xs focus:border-brand focus:ring-1 focus:ring-brand outline-none auto-save-notes"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save and return */}
        <div className="sticky bottom-4 bg-white rounded-xl border border-[#e8e8e0] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-[#6b7280]">
              共 {items.length} 项 · 已保存 {draftedCount} 项
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/children/${childId}/cars`}
                className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                返回
              </Link>
              <SubmitButton
                label="保存并返回"
                loadingLabel="保存中..."
                className="rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
              />
            </div>
          </div>
        </div>
      </form>

      <CarsAutoSave
        sessionId={draftSession!.id}
        totalItems={items.length}
        initialSavedCount={draftedCount}
      />
    </PageShell>
  );
}
