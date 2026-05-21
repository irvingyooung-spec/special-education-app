import Link from "next/link";
import { notFound } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import PageShell from "@/app/components/page-shell";
import { getSessionsForChild, summarizeByDomain, getScoresForSession } from "@/lib/cpep";
import { CPEP_DOMAINS } from "@/lib/cpep-catalog";
import { Calendar, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function ParentCpepHistoryPage({ params }: Props) {
  await requireRole("parent");
  const { childId } = await params;
  const childIdNum = parseInt(childId);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childIdNum) as { id: number; name: string } | undefined;

  if (!child) notFound();

  const sessions = getSessionsForChild(childIdNum).filter((s) => s.status === "completed");

  return (
    <PageShell
      backHref={`/parent/${childId}`}
      backLabel="返回"
      title={`${child.name} - CPEP 评估记录`}
      subtitle={`共 ${sessions.length} 次评估`}
      maxWidth="md"
      showLogo
    >
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#e8e8e0] p-8 text-center">
            <p className="text-[#d1d5db] text-sm">暂无评估记录</p>
          </div>
        ) : (
          sessions.map((session) => {
            const scores = getScoresForSession(session.id);
            const summary = summarizeByDomain(scores);

            return (
              <Link
                key={session.id}
                href={`/parent/${childId}/cpeps/${session.id}`}
                className="block rounded-xl bg-white border border-[#e8e8e0] p-4 hover:border-brand/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(session.created_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {summary.slice(0, 3).map((s) => (
                        <div key={s.code} className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-[#6b7280]">{s.label}</span>
                          <div className="flex-1 h-1.5 bg-[#e8e8e0] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{
                                width: s.pass_rate !== null ? `${s.pass_rate}%` : "0%",
                              }}
                            />
                          </div>
                          <span className="w-12 text-right text-[#9ca3af]">
                            {s.pass_rate !== null ? `${s.pass_rate}%` : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#d1d5db] shrink-0 mt-1" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </PageShell>
  );
}
