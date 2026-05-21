import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import {
  CPEP_DOMAINS,
  CPEP_SCORE_LEVELS,
  CPEP_EMOTION_LEVELS,
} from "@/lib/cpep-catalog";
import {
  getItemsByDomain,
  getLatestDomainSession,
  getDomainScores,
  getDraftSession,
  createDraftSession,
  getDraftScores,
  submitDraftSession,
  saveDraftScore,
} from "@/lib/cpep";
import { Info, Save } from "lucide-react";
import SubmitButton from "@/app/components/submit-button";
import CpepAutoSave from "@/app/components/cpep-autosave";

interface Props {
  params: Promise<{ id: string; domain: string }>;
}

export default async function CpepDomainAssessPage({ params }: Props) {
  const me = await requireRole("teacher", "admin");
  const { id, domain } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const domainInfo = CPEP_DOMAINS.find((d) => d.code === domain);
  if (!domainInfo) notFound();

  const items = getItemsByDomain(domain) as Array<{
    id: number;
    domain_code: string;
    item_code: string;
    subdomain: string;
    name: string;
    goal: string;
    materials: string | null;
    method: string | null;
    criteria: string | null;
    age: string | null;
    marker: string | null;
    order_in_domain: number;
  }>;

  // Get last completed session for comparison
  const lastCompletedSession = getLatestDomainSession(childId, domain);
  const lastCompletedScores = lastCompletedSession
    ? getDomainScores(lastCompletedSession.id, domain)
    : [];

  const lastScoreMap = new Map<number, string>();
  for (const s of lastCompletedScores) {
    lastScoreMap.set(s.item_id, s.score);
  }

  // Get or create draft session
  let draftSession = getDraftSession(childId, domain);
  if (!draftSession) {
    const draftId = createDraftSession(childId, me.id, me.username, domain);
    draftSession = {
      id: draftId,
      child_id: childId,
      evaluator_user_id: me.id,
      evaluator_name: me.username,
      domain_code: domain,
      session_notes: null,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const draftScores = draftSession
    ? getDraftScores(draftSession.id)
    : [];

  const draftScoreMap = new Map<number, { score: string; notes: string | null }>();
  for (const s of draftScores) {
    draftScoreMap.set(s.item_id, { score: s.score, notes: s.notes });
  }

  // Group items by subdomain
  const itemsBySubdomain = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsBySubdomain.get(item.subdomain) ?? [];
    list.push(item);
    itemsBySubdomain.set(item.subdomain, list);
  }

  const isEmotion = domainInfo.is_emotion;
  const scoreLevels = isEmotion ? CPEP_EMOTION_LEVELS : CPEP_SCORE_LEVELS;

  async function handleAction(formData: FormData) {
    "use server";

    const intent = formData.get("intent") as string;
    const sessionId = parseInt(formData.get("session_id") as string);
    const evaluatorName = (
      (formData.get("evaluator_name") as string) ?? me.username
    ).trim();
    const sessionNotes = (
      (formData.get("session_notes") as string) ?? ""
    ).trim();

    if (!sessionId) {
      redirect(`/children/${childId}/cpep/${domain}?toast=error&message=会话ID无效`);
    }

    // Save all scores from the form (fallback if auto-save missed anything)
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
      `UPDATE cpep_sessions SET evaluator_name = ?, session_notes = ? WHERE id = ?`
    ).run(evaluatorName, sessionNotes || null, sessionId);

    if (intent === "save") {
      redirect(`/children/${childId}/cpep/${domain}?toast=success&message=${encodeURIComponent("评估已保存")}`);
    }

    // Submit the session
    submitDraftSession(sessionId, sessionNotes || null);

    redirect(`/children/${childId}/cpeps/${sessionId}?toast=success&message=${encodeURIComponent("评估已提交")}`);
  }

  // Count drafted scores
  const draftedCount = draftScores.length;

  return (
    <PageShell
      backHref={`/children/${childId}/cpep`}
      backLabel="返回领域列表"
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
        <div className="rounded-xl bg-[#f9fafb] border border-[#e8e8e0] p-3">
          <div className="flex flex-wrap gap-3 text-xs">
            {scoreLevels.map((level) => (
              <div key={level.value} className="flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white border border-[#d1d5db] font-mono font-medium text-[#374151]">
                  {level.value}
                </span>
                <span className="text-[#6b7280]">{level.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Items by subdomain */}
        {Array.from(itemsBySubdomain.entries()).map(([subdomain, subdomainItems]) => (
          <div key={subdomain} className="rounded-xl bg-white border border-[#e8e8e0] overflow-hidden">
            <div className="bg-[#f9fafb] px-4 py-2 border-b border-[#e8e8e0]">
              <h3 className="font-medium text-sm text-[#374151]">{subdomain}</h3>
            </div>
            <div className="divide-y divide-[#f0f0eb]">
              {subdomainItems.map((item) => {
                const lastScore = lastScoreMap.get(item.id);
                const draft = draftScoreMap.get(item.id);
                const draftScore = draft?.score;
                const draftNotes = draft?.notes;
                return (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-xs text-[#d1d5db] font-mono shrink-0">
                        {item.order_in_domain}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-[#374151]">
                              {item.name}
                              {item.marker === "★" && (
                                <span className="ml-1 text-red-500">★</span>
                              )}
                              {item.marker === "▲" && (
                                <span className="ml-1 text-blue-500">▲</span>
                              )}
                            </p>
                            <p className="text-xs text-[#9ca3af] mt-0.5">{item.goal}</p>
                            {item.age && (
                              <p className="text-xs text-[#d1d5db] mt-0.5">参考月龄: {item.age}</p>
                            )}
                          </div>
                        </div>

                        {/* Expandable details */}
                        {(item.materials || item.method || item.criteria) && (
                          <details className="mt-2">
                            <summary className="text-xs text-brand cursor-pointer hover:text-brand-dark flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              查看测试详情
                            </summary>
                            <div className="mt-2 space-y-2 text-xs text-[#6b7280] bg-[#f9fafb] rounded-lg p-3">
                              {item.materials && (
                                <div>
                                  <span className="font-medium text-[#374151]">材料:</span>{" "}
                                  {item.materials}
                                </div>
                              )}
                              {item.method && (
                                <div>
                                  <span className="font-medium text-[#374151]">方法:</span>{" "}
                                  <span className="whitespace-pre-wrap">{item.method}</span>
                                </div>
                              )}
                              {item.criteria && (
                                <div>
                                  <span className="font-medium text-[#374151]">标准:</span>{" "}
                                  <span className="whitespace-pre-wrap">{item.criteria}</span>
                                </div>
                              )}
                            </div>
                          </details>
                        )}

                        {/* Last score reference */}
                        {lastScore && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-[#9ca3af]">上次:</span>
                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium ${
                              lastScore === "P" || lastScore === "A"
                                ? "bg-green-100 text-green-700"
                                : lastScore === "E" || lastScore === "M"
                                ? "bg-yellow-100 text-yellow-700"
                                : lastScore === "F" || lastScore === "S"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
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
                              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors peer-checked:bg-brand peer-checked:text-white peer-checked:border-brand hover:bg-[#f9fafb] ${
                                draftScore === level.value
                                  ? "border-brand bg-brand text-white"
                                  : "border-[#d1d5db] bg-white text-[#374151]"
                              }`}>
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
        ))}

        {/* Submit */}
        <div className="sticky bottom-4 bg-white rounded-xl border border-[#e8e8e0] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-[#6b7280]">
              共 {items.length} 项 · 已保存 {draftedCount} 项
            </p>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                name="intent"
                value="save"
                className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors"
              >
                保存评估
              </button>
              <SubmitButton
                label="提交评估"
                loadingLabel="提交中..."
                className="rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
              />
            </div>
          </div>
        </div>
      </form>

      <CpepAutoSave
        sessionId={draftSession!.id}
        totalItems={items.length}
        initialSavedCount={draftedCount}
      />
    </PageShell>
  );
}
