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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-5xl items-start justify-between px-4 py-6">
          <div>
            <Link
              href={`/parent/${childId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              ← 返回{child.name}的主页
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              课表 — {child.name}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-700">
              {user.username}{" "}
              <span className="text-xs text-gray-500">
                ({roleLabel[user.role]})
              </span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-blue-600 hover:underline"
              >
                退出
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Link
              href={`/parent/${childId}/schedule?week=${prevWeek}`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              ← 上一周
            </Link>
            {!isCurrentWeek && (
              <Link
                href={`/parent/${childId}/schedule`}
                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
              >
                本周
              </Link>
            )}
            <Link
              href={`/parent/${childId}/schedule?week=${nextWeek}`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              下一周 →
            </Link>
          </div>
          <p className="text-sm text-gray-600">{weekRangeLabel(weekStart)}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-7">
          {buckets.map((b, idx) => {
            const isToday = dayKey(b.date) === dayKey(new Date());
            return (
              <div
                key={dayKey(b.date)}
                className={`rounded-lg border bg-white p-3 shadow-sm ${
                  isToday
                    ? "border-blue-300 ring-1 ring-blue-100"
                    : "border-gray-200"
                }`}
              >
                <div className="mb-2 flex items-baseline justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-800">
                    {WEEKDAY_LABELS[idx]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatMonthDay(b.date)}
                  </span>
                </div>
                {b.courses.length === 0 ? (
                  <p className="text-xs text-gray-300">—</p>
                ) : (
                  <ul className="space-y-2">
                    {b.courses.map((c) => (
                      <li
                        key={c.id}
                        className="rounded border border-gray-200 bg-gray-50 p-2"
                      >
                        <p className="text-xs text-gray-500">
                          {formatTimeOnly(c.start_at)} -{" "}
                          {formatEndTime(c.start_at, c.duration_minutes)}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-gray-800">
                          {c.course_name}
                        </p>
                        {c.notes && (
                          <p className="mt-0.5 text-xs text-gray-500 whitespace-pre-wrap">
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
