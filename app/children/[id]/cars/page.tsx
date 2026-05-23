import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import {
  CARS_DOMAINS,
  isPathologyDomain,
} from "@/lib/cars-catalog";
import {
  getDraftSession,
  createDraftSession,
  getCarsProgress,
  getLatestCompletedSession,
  getScoresForSession,
  summarizeByDomain,
  submitDraftSession,
} from "@/lib/cars";
import {
  Eye,
  Ear,
  Hand,
  MessageCircle,
  Brain,
  Users,
  Gamepad2,
  Heart,
  ChevronRight,
  ClipboardList,
  Play,
  AlertTriangle,
} from "lucide-react";

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  perception_visual: <Eye className="h-5 w-5" />,
  perception_auditory: <Ear className="h-5 w-5" />,
  imitation_motor: <Hand className="h-5 w-5" />,
  imitation_verbal: <MessageCircle className="h-5 w-5" />,
  fine_motor: <Hand className="h-5 w-5" />,
  eye_hand: <Eye className="h-5 w-5" />,
  gross_motor: <Hand className="h-5 w-5" />,
  verbal_cognition: <MessageCircle className="h-5 w-5" />,
  cognition_performance: <Brain className="h-5 w-5" />,
  sensation: <Eye className="h-5 w-5" />,
  emotion: <Heart className="h-5 w-5" />,
  social_interaction: <Users className="h-5 w-5" />,
  play_interest: <Gamepad2 className="h-5 w-5" />,
};

const TOTAL_ITEMS = 121;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CarsPage({ params }: Props) {
  const me = await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const draft = getDraftSession(childId);

  let domainProgress = CARS_DOMAINS.map((domain) => ({
    ...domain,
    scored: 0,
    total: domain.item_count,
  }));
  let totalScored = 0;

  const lastCompleted = getLatestCompletedSession(childId);
  let lastCompletedSummary = null as ReturnType<typeof summarizeByDomain> | null;
  if (lastCompleted) {
    const scores = getScoresForSession(lastCompleted.id);
    lastCompletedSummary = summarizeByDomain(scores);
  }

  if (draft) {
    const progress = getCarsProgress(draft.id);
    domainProgress = CARS_DOMAINS.map((domain) => {
      const p = progress.find((x) => x.code === domain.code);
      return {
        ...domain,
        scored: p?.scored ?? 0,
        total: domain.item_count,
      };
    });
    totalScored = progress.reduce((sum, p) => sum + p.scored, 0);
  }

  const firstIncompleteDomain = domainProgress.find((d) => d.scored < d.total);

  async function startAssessment() {
    "use server";
    let draftSession = getDraftSession(childId);
    if (!draftSession) {
      createDraftSession(childId, me.id, me.username);
      draftSession = getDraftSession(childId);
    }

    if (draftSession) {
      const progress = getCarsProgress(draftSession.id);
      const firstIncomplete = progress.find((p) => p.scored < p.total);
      if (firstIncomplete) {
        redirect(`/children/${childId}/cars/${firstIncomplete.code}`);
      }
    }
    redirect(`/children/${childId}/cars/perception_visual`);
  }

  async function submitAssessment() {
    "use server";
    const d = getDraftSession(childId);
    if (!d) return;

    submitDraftSession(d.id, d.session_notes);
    redirect(
      `/children/${childId}/carss/${d.id}?toast=success&message=${encodeURIComponent(
        "CARS 评估已提交"
      )}`
    );
  }

  return (
    <PageShell
      backHref={`/children/${childId}`}
      backLabel="返回儿童详情"
      title={`${child.name} - CARS 评估`}
      subtitle={
        draft
          ? `已评 ${totalScored} / ${TOTAL_ITEMS} 项`
          : "共 14 个领域，121 个项目"
      }
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
              <h2 className="font-medium text-[#374151]">
                CARS 孤独症评定量表
              </h2>
              <p className="text-xs text-[#9ca3af]">
                双轨评估系统 · 9个功能领域 + 4个病理学领域
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6b7280]">整体进度</span>
              <span className="text-[#374151] font-medium">
                {totalScored} / {TOTAL_ITEMS}
              </span>
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
                {firstIncompleteDomain
                  ? `继续：${firstIncompleteDomain.label}`
                  : "继续评估"}
              </button>
            </form>
            <form action={submitAssessment}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand px-4 py-3 text-sm font-medium text-brand hover:bg-brand/5 transition-colors"
              >
                提交评估
              </button>
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
            const isPathology = isPathologyDomain(domain.code);
            return (
              <Link
                key={domain.code}
                href={`/children/${childId}/cars/${domain.code}`}
                className="block rounded-xl bg-white border border-[#e8e8e0] p-4 hover:border-brand/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isPathology
                        ? "bg-red-50 text-red-500"
                        : "bg-[#f5f5f0] text-[#6b7280]"
                    }`}
                  >
                    {isPathology ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      DOMAIN_ICONS[domain.code]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#374151]">
                        {domain.label}
                      </h3>
                      <ChevronRight className="h-4 w-4 text-[#d1d5db]" />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#e8e8e0] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${
                              (domain.scored / domain.total) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#9ca3af] shrink-0">
                        {domain.scored}/{domain.total}
                      </span>
                    </div>
                    {!draft &&
                      lastDomainSummary &&
                      lastDomainSummary.pass_rate !== null && (
                        <p className="text-xs text-[#6b7280] mt-1">
                          上次评估：
                          {isPathology
                            ? `异常率 ${lastDomainSummary.pass_rate}%`
                            : `通过率 ${lastDomainSummary.pass_rate}%`}
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
            href={`/children/${childId}/carss`}
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
