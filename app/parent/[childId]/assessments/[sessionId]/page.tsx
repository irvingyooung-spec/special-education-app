import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import {
  destroyCurrentSession,
  requireRole,
  roleLabel,
} from "@/lib/auth";
import { ABLLS_DOMAINS, ABLLS_SCORE_LEVELS } from "@/lib/ablls-catalog";
import {
  getScoresForSession,
  summarizeByDomain,
  type SessionRow,
} from "@/lib/assessment";
import { getReportForSession, REPORT_FIELDS } from "@/lib/report";

interface Props {
  params: Promise<{ childId: string; sessionId: string }>;
}

export default async function ParentAssessmentSessionPage({ params }: Props) {
  const user = await requireRole("parent");
  const { childId: childIdStr, sessionId: sessionIdStr } = await params;
  const childId = parseInt(childIdStr);
  const sessionId = parseInt(sessionIdStr);

  const binding = db
    .prepare(
      "SELECT 1 FROM parent_child WHERE parent_user_id = ? AND child_id = ?"
    )
    .get(user.id, childId);
  if (!binding) {
    redirect("/parent");
  }

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;
  if (!child) notFound();

  const session = db
    .prepare(
      "SELECT * FROM assessment_sessions WHERE id = ? AND child_id = ?"
    )
    .get(sessionId, childId) as SessionRow | undefined;
  if (!session) notFound();

  const scores = getScoresForSession(sessionId);
  const summary = summarizeByDomain(scores);
  const report = getReportForSession(sessionId);

  const scoresByDomain = new Map<string, typeof scores>();
  for (const s of scores) {
    const list = scoresByDomain.get(s.domain_code) ?? [];
    list.push(s);
    scoresByDomain.set(s.domain_code, list);
  }

  async function logout() {
    "use server";
    await destroyCurrentSession();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-start justify-between px-4 py-6">
          <div>
            <Link
              href={`/parent/${childId}/assessments`}
              className="text-sm text-brand hover:underline"
            >
              ← 返回评估历史
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-[#374151]">
              评估详情 — {child.name}
            </h1>
            <p className="mt-1 text-sm text-[#9ca3af]">
              {new Date(session.created_at).toLocaleString("zh-CN")}
              {session.evaluator_name &&
                ` · 评估师 ${session.evaluator_name}`}
              {" · "}共评 {scores.length} / 92 项
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[#6b7280]">
              {user.username}{" "}
              <span className="text-xs text-[#9ca3af]">
                ({roleLabel[user.role]})
              </span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-brand hover:underline"
              >
                退出
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {session.session_notes && (
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-[#374151]">
              评估备注
            </h2>
            <p className="text-sm text-[#6b7280] whitespace-pre-wrap">
              {session.session_notes}
            </p>
          </section>
        )}

        {report && (
          <section className="rounded-xl border border-[#c5e1a5] bg-[#f1f8e9]/50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#374151]">
              评估报告与干预建议
            </h2>
            <p className="mt-1 text-xs text-[#9ca3af]">
              基于本次评估,老师审核后发布。仅供教育参考,不构成医学诊断与用药建议。
            </p>
            <div className="mt-4 space-y-4">
              {REPORT_FIELDS.map((f) => {
                const v = report[f.key];
                if (!v) return null;
                return (
                  <div
                    key={f.key}
                    className="rounded-lg border border-[#dcedc8] bg-white p-3"
                  >
                    <p className="text-xs font-semibold text-brand-dark mb-1">
                      {f.label}
                    </p>
                    <p className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">
                      {v}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#374151]">
            各领域得分汇总
          </h2>
          <div className="space-y-2">
            {summary.map((d) => (
              <div key={d.code} className="flex items-center gap-3">
                <span className="w-32 text-sm text-[#6b7280]">
                  <span className="font-mono text-xs text-[#d1d5db]">
                    {d.code}
                  </span>{" "}
                  {d.label}
                </span>
                <div className="flex-1 h-2 bg-[#e8e8e0] rounded-full overflow-hidden">
                  {d.average !== null && (
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(d.average / 4) * 100}%` }}
                    />
                  )}
                </div>
                <span className="w-24 text-right text-xs text-[#6b7280]">
                  {d.average !== null
                    ? `${d.average} · ${d.level?.label}`
                    : "未评"}
                </span>
                <span className="w-12 text-right text-xs text-[#d1d5db]">
                  {d.scored_count}/{d.total_items}
                </span>
              </div>
            ))}
          </div>
        </section>

        {ABLLS_DOMAINS.map((domain) => {
          const items = scoresByDomain.get(domain.code) ?? [];
          if (items.length === 0) return null;
          return (
            <section
              key={domain.code}
              className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-semibold text-[#374151]">
                领域 {domain.code} — {domain.label}
              </h2>
              <ul className="divide-y divide-[#f3f4f6]">
                {items.map((s) => {
                  const levelLabel = ABLLS_SCORE_LEVELS.find(
                    (lv) => lv.value === s.score
                  )?.label;
                  return (
                    <li key={s.item_id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-mono text-xs text-[#d1d5db]">
                              {s.item_code}
                            </span>{" "}
                            <span className="font-medium text-[#374151]">
                              {s.name}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-[#9ca3af]">
                            {s.goal}
                          </p>
                          {s.notes && (
                            <p className="mt-1 rounded bg-warm-bg p-2 text-xs text-[#6b7280] whitespace-pre-wrap">
                              {s.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-brand">
                            {s.score}
                          </span>
                          <p className="text-xs text-[#9ca3af]">{levelLabel}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {scores.length === 0 && (
          <section className="rounded-xl border border-[#e8e8e0] bg-white p-12 text-center shadow-sm">
            <p className="text-[#9ca3af]">本次评估没有评分项</p>
          </section>
        )}
      </main>
    </div>
  );
}
