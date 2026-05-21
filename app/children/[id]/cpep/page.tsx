import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import Card from "@/app/components/card";
import { CPEP_DOMAINS } from "@/lib/cpep-catalog";
import {
  getLatestDomainSession,
  getLatestCompletedDomainSession,
  getDomainScores,
  summarizeByDomain,
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

  // Get progress for each domain
  const domainProgress = CPEP_DOMAINS.map((domain) => {
    const session = getLatestDomainSession(childId, domain.code);
    let progress = { scored: 0, total: domain.item_count };
    let passRate: number | null = null;

    if (session) {
      const scores = getDomainScores(session.id, domain.code);
      const summary = summarizeByDomain(scores);
      const domainSummary = summary.find((s) => s.code === domain.code);
      if (domainSummary) {
        progress.scored =
          domainSummary.p_count +
          domainSummary.e_count +
          domainSummary.f_count +
          domainSummary.x_count;
        passRate = domainSummary.pass_rate;
      }
    }

    return {
      ...domain,
      progress,
      passRate,
      hasAssessment: !!session,
      latestSessionId: session?.id,
    };
  });

  // Count total completed domains (only status = 'completed')
  const completedDomains = CPEP_DOMAINS.filter((domain) => {
    const completedSession = getLatestCompletedDomainSession(childId, domain.code);
    return !!completedSession;
  }).length;

  return (
    <PageShell
      backHref={`/children/${childId}`}
      backLabel="返回儿童详情"
      title={`${child.name} - CPEP 评估`}
      subtitle={`已完成 ${completedDomains}/8 个领域`}
      maxWidth="md"
      showLogo
    >
      <div className="space-y-4">
        {/* Overview */}
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
          <div className="h-2 bg-[#e8e8e0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{
                width: `${(completedDomains / 8) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Domain cards */}
        <div className="space-y-3">
          {domainProgress.map((domain) => (
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
                          width: `${(domain.progress.scored / domain.progress.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#9ca3af] shrink-0">
                      {domain.progress.scored}/{domain.progress.total}
                    </span>
                  </div>
                  {domain.hasAssessment && domain.passRate !== null && (
                    <p className="text-xs text-[#6b7280] mt-1">
                      {domain.is_emotion
                        ? `正常率 ${domain.passRate}%`
                        : `通过率 ${domain.passRate}%`}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
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
