import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import CpepSubmitButton from "@/app/components/cpep-submit-button";
import { CPEP_DOMAINS } from "@/lib/cpep-catalog";
import {
  getUnifiedDraftSession,
  createUnifiedDraftSession,
  getCpepProgress,
  getLatestUnifiedCompletedSession,
  getScoresForSession,
  summarizeByDomain,
  submitDraftSession,
  getDraftScores,
} from "@/lib/cpep";
import {
  Eye,
  Footprints,
  Hand,
  MessageCircle,
  Brain,
  Users,
  Shirt,
  Heart,
  ChevronRight,
  ClipboardList,
  Play,
} from "lucide-react";

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  perception: <Eye className="h-5 w-5" />,
  gross_motor: <Footprints className="h-5 w-5" />,
  fine_motor: <Hand className="h-5 w-5" />,
  language: <MessageCircle className="h-5 w-5" />,
  cognition: <Brain className="h-5 w-5" />,
  social: <Users className="h-5 w-5" />,
  self_care: <Shirt className="h-5 w-5" />,
  emotion_behavior: <Heart className="h-5 w-5" />,
};

const TOTAL_ITEMS = 507;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CpepPage({ params }: Props) {
  const me = await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) notFound();

  // Unified draft session
  let draft = getUnifiedDraftSession(childId);

  // Progress data for each domain
  let domainProgress = CPEP_DOMAINS.map((domain) => ({
    ...domain,
    scored: 0,
    total: domain.item_count,
  }));
  let totalScored = 0;

  // Last completed session for reference
  const lastCompleted = getLatestUnifiedCompletedSession(childId);
  let lastCompletedSummary = null as ReturnType<typeof summarizeByDomain> | null;
  if (lastCompleted) {
    const scores = getScoresForSession(lastCompleted.id);
    lastCompletedSummary = summarizeByDomain(scores);
  }

  if (draft) {
    const progress = getCpepProgress(draft.id);
    domainProgress = CPEP_DOMAINS.map((domain) => {
      const p = progress.find((x) => x.code === domain.code);
      return {
        ...domain,
        scored: p?.scored ?? 0,
        total: domain.item_count,
      };
    });
    totalScored = progress.reduce((sum, p) => sum + p.scored, 0);
  }

  // Find first incomplete domain to jump to
  const firstIncompleteDomain = domainProgress.find((d) => d.scored < d.total);

  async function startAssessment() {
    "use server";
    let draftSession = getUnifiedDraftSession(childId);
    if (!draftSession) {
      createUnifiedDraftSession(childId, me.id, me.username);
      draftSession = getUnifiedDraftSession(childId);
    }

    if (draftSession) {
      const progress = getCpepProgress(draftSession.id);
      const firstIncomplete = progress.find((p) => p.scored < p.total);
      if (firstIncomplete) {
        redirect(`/children/${childId}/cpep/${firstIncomplete.code}`);
      }
    }
    redirect(`/children/${childId}/cpep/perception`);
  }

  async function submitAssessment() {
    "use server";
    const d = getUnifiedDraftSession(childId);
    if (!d) return;

    submitDraftSession(d.id, d.session_notes);
    redirect(`/children/${childId}/cpeps/${d.id}?toast=success&message=${encodeURIComponent("CPEP 评估已提交")}`);
  }

  return (
    <PageShell
      backHref={`/children/${childId}`}
      backLabel="返回儿童详情"
      title={`${child.name} - CPEP 评估`}
      subtitle={draft ? `已评 ${totalScored} / ${TOTAL_ITEMS} 项` : "共 8 个领域，507 个项目"}
      maxWidth="md"
      showLogo
    >
      <div className="space-y-4">
        {/* Overview card */}
        <div className="rounded-xl bg-white p-4 border border-[#e8e8e0]">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
              <ClipboardList className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h2 className="font-medium text-[#374151]">CPEP 孤独症儿童发展能力评估</h2>
              <p className="text-xs text-[#9ca3af]">共 8 个领域，507 个项目</p>
            </div>
          </div>
          {/* Overall progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6b7280]">整体进度</span>
              <span className="text-[#374151] font-medium">{totalScored} / {TOTAL_ITEMS}</span>
            </div>
            <div className="h-2 bg-[#e8e8e0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{
                  width: `${(totalScored / TOTAL_ITEMS) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Start / Continue / Submit actions */}
        {draft ? (
          <div className="grid grid-cols-2 gap-3">
            <form action={startAssessment}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
              >
                <Play className="h-4 w-4" />
                {firstIncompleteDomain ? `继续：${firstIncompleteDomain.label}` : "继续评估"}
              </button>
            </form>
            <form action={submitAssessment}>
              <CpepSubmitButton totalScored={totalScored} totalItems={TOTAL_ITEMS} />
            </form>
          </div>
        ) : (
          <form action={startAssessment}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
            >
              <Play className="h-4 w-4" />
              开始新评估
            </button>
          </form>
        )}

        {/* Domain cards */}
        <div className="space-y-3">
          {domainProgress.map((domain) => {
            const lastDomainSummary = lastCompletedSummary?.find(
              (s) => s.code === domain.code
            );
            return (
              <Link
                key={domain.code}
                href={`/children/${childId}/cpep/${domain.code}`}
                className="block rounded-xl bg-white border border-[#e8e8e0] p-4 hover:border-brand/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f0] text-[#6b7280]">
                    {DOMAIN_ICONS[domain.code]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#374151]">{domain.label}</h3>
                      <ChevronRight className="h-4 w-4 text-[#d1d5db]" />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#e8e8e0] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${(domain.scored / domain.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#9ca3af] shrink-0">
                        {domain.scored}/{domain.total}
                      </span>
                    </div>
                    {/* Reference: last completed pass rate */}
                    {!draft && lastDomainSummary && lastDomainSummary.pass_rate !== null && (
                      <p className="text-xs text-[#6b7280] mt-1">
                        上次评估：{domain.is_emotion ? "正常率" : "通过率"} {lastDomainSummary.pass_rate}%
                      </p>
                    )}
                    {draft && domain.scored === domain.total && (
                      <p className="text-xs text-green-600 mt-1">已完成</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* History link */}
        <div className="pt-2">
          <Link
            href={`/children/${childId}/cpeps`}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#d1d5db] bg-white py-3 text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            查看全部评估历史
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
