import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import {
  destroyCurrentSession,
  requireRole,
  roleLabel,
} from "@/lib/auth";
import {
  addDays,
  bucketByDay,
  dayKey,
  formatEndTime,
  formatMonthDay,
  formatTimeOnly,
  getMonday,
  parseWeekParam,
  weekRangeLabel,
  WEEKDAY_LABELS,
  type ScheduleRow,
} from "@/lib/schedule";

interface Props {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ week?: string }>;
}

export default async function ParentSchedulePage({
  params,
  searchParams,
}: Props) {
  const user = await requireRole("parent");
  const { childId: childIdStr } = await params;
  const childId = parseInt(childIdStr);
  const search = await searchParams;

  // 校验绑定
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

  const weekStart = parseWeekParam(search.week) ?? getMonday(new Date());
  const weekEnd = addDays(weekStart, 7);

  const courses = db
    .prepare(
      `SELECT s.*
       FROM schedules s
       JOIN schedule_children sc ON sc.schedule_id = s.id
       WHERE sc.child_id = ?
       AND s.start_at >= ?
       AND s.start_at < ?
       ORDER BY s.start_at ASC`
    )
    .all(
      childId,
      weekStart.toISOString(),
      weekEnd.toISOString()
    ) as ScheduleRow[];

  const buckets = bucketByDay(weekStart, courses);

  const prevWeek = dayKey(addDays(weekStart, -7));
  const nextWeek = dayKey(addDays(weekStart, 7));
  const todayMonday = getMonday(new Date());
  const isCurrentWeek = dayKey(weekStart) === dayKey(todayMonday);

  async function logout() {
    "use server";
    await destroyCurrentSession();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-start justify-between px-4 py-6">
          <div>
            <Link
              href={`/parent/${childId}`}
              className="text-sm text-brand hover:underline"
            >
              ← 返回{child.name}的主页
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-[#374151]">
              课表 — {child.name}
            </h1>
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

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8e8e0] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Link
              href={`/parent/${childId}/schedule?week=${prevWeek}`}
              className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#6b7280] hover:bg-[#f9fafb]"
            >
              ← 上一周
            </Link>
            {!isCurrentWeek && (
              <Link
                href={`/parent/${childId}/schedule`}
                className="rounded-lg border border-brand-light bg-[#f1f8e9] px-3 py-1.5 text-sm text-brand-dark hover:bg-[#e8f5e9]"
              >
                本周
              </Link>
            )}
            <Link
              href={`/parent/${childId}/schedule?week=${nextWeek}`}
              className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#6b7280] hover:bg-[#f9fafb]"
            >
              下一周 →
            </Link>
          </div>
          <p className="text-sm text-[#6b7280]">{weekRangeLabel(weekStart)}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-7">
          {buckets.map((b, idx) => {
            const isToday = dayKey(b.date) === dayKey(new Date());
            return (
              <div
                key={dayKey(b.date)}
                className={`rounded-xl border bg-white p-3 shadow-sm ${
                  isToday
                    ? "border-brand-light ring-1 ring-brand/20"
                    : "border-[#e8e8e0]"
                }`}
              >
                <div className="mb-2 flex items-baseline justify-between border-b border-[#f3f4f6] pb-2">
                  <span className="text-sm font-medium text-[#374151]">
                    {WEEKDAY_LABELS[idx]}
                  </span>
                  <span className="text-xs text-[#9ca3af]">
                    {formatMonthDay(b.date)}
                  </span>
                </div>
                {b.courses.length === 0 ? (
                  <p className="text-xs text-[#d1d5db]">—</p>
                ) : (
                  <ul className="space-y-2">
                    {b.courses.map((c) => (
                      <li
                        key={c.id}
                        className="rounded border border-[#e8e8e0] bg-warm-bg p-2"
                      >
                        <p className="text-xs text-[#9ca3af]">
                          {formatTimeOnly(c.start_at)} -{" "}
                          {formatEndTime(c.start_at, c.duration_minutes)}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-[#374151]">
                          {c.course_name}
                        </p>
                        {c.notes && (
                          <p className="mt-0.5 text-xs text-[#9ca3af] whitespace-pre-wrap">
                            {c.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
