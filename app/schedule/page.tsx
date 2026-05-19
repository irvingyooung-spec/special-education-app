import Link from "next/link";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
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
import { ConfirmButton } from "@/app/admin/users/_components/confirm-button";

interface Props {
  searchParams: Promise<{ week?: string }>;
}

type CourseWithChildren = ScheduleRow & {
  children: Array<{ id: number; name: string }>;
};

export default async function ScheduleHubPage({ searchParams }: Props) {
  await requireRole("teacher", "admin");
  const search = await searchParams;

  const weekStart = parseWeekParam(search.week) ?? getMonday(new Date());
  const weekEnd = addDays(weekStart, 7);

  const courses = db
    .prepare(
      `SELECT * FROM schedules
       WHERE start_at >= ?
       AND start_at < ?
       ORDER BY start_at ASC`
    )
    .all(weekStart.toISOString(), weekEnd.toISOString()) as ScheduleRow[];

  // 一次性把这周所有课程的学生绑定查出来
  let coursesWithChildren: CourseWithChildren[] = [];
  if (courses.length > 0) {
    const ids = courses.map((c) => c.id);
    const placeholders = ids.map(() => "?").join(",");
    const links = db
      .prepare(
        `SELECT sc.schedule_id, c.id, c.name
         FROM schedule_children sc
         JOIN children c ON c.id = sc.child_id
         WHERE sc.schedule_id IN (${placeholders})
         ORDER BY c.name`
      )
      .all(...ids) as Array<{ schedule_id: number; id: number; name: string }>;

    const byCourse = new Map<number, Array<{ id: number; name: string }>>();
    for (const l of links) {
      const list = byCourse.get(l.schedule_id) ?? [];
      list.push({ id: l.id, name: l.name });
      byCourse.set(l.schedule_id, list);
    }
    coursesWithChildren = courses.map((c) => ({
      ...c,
      children: byCourse.get(c.id) ?? [],
    }));
  }

  const buckets = bucketByDay(weekStart, coursesWithChildren);

  const prevWeek = dayKey(addDays(weekStart, -7));
  const nextWeek = dayKey(addDays(weekStart, 7));
  const todayMonday = getMonday(new Date());
  const isCurrentWeek = dayKey(weekStart) === dayKey(todayMonday);
  const defaultDate = dayKey(weekStart);

  const allChildren = db
    .prepare("SELECT id, name FROM children ORDER BY name")
    .all() as Array<{ id: number; name: string }>;

  async function addCourse(formData: FormData) {
    "use server";
    const date = ((formData.get("date") as string) ?? "").trim();
    const time = ((formData.get("time") as string) ?? "").trim();
    const duration = parseInt((formData.get("duration") as string) ?? "60");
    const name = ((formData.get("course_name") as string) ?? "").trim();
    const notes = ((formData.get("notes") as string) ?? "").trim();
    const childIds = formData
      .getAll("child_ids")
      .map((v) => parseInt(v as string))
      .filter((n) => !Number.isNaN(n));

    if (!date || !time || !name || !duration || duration < 1) return;
    if (childIds.length === 0) return;

    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) return;

    const insertSched = db.prepare(
      `INSERT INTO schedules (start_at, duration_minutes, course_name, notes)
       VALUES (?, ?, ?, ?)`
    );
    const insertLink = db.prepare(
      "INSERT INTO schedule_children (schedule_id, child_id) VALUES (?, ?)"
    );

    const tx = db.transaction((cids: number[]) => {
      const result = insertSched.run(
        start.toISOString(),
        duration,
        name,
        notes || null
      );
      for (const cid of cids) insertLink.run(result.lastInsertRowid, cid);
    });
    tx(childIds);
  }

  async function deleteCourse(formData: FormData) {
    "use server";
    const scheduleId = parseInt((formData.get("schedule_id") as string) ?? "");
    if (!scheduleId) return;
    db.prepare("DELETE FROM schedules WHERE id = ?").run(scheduleId);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← 返回学生列表
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">课表</h1>
          <p className="mt-1 text-sm text-gray-500">
            统一管理所有课程，每节课可以同时绑定多个学生。家长只看到自己孩子参加的课。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Week nav */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Link
              href={`/schedule?week=${prevWeek}`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              ← 上一周
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/schedule"
                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
              >
                本周
              </Link>
            )}
            <Link
              href={`/schedule?week=${nextWeek}`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              下一周 →
            </Link>
          </div>
          <p className="text-sm text-gray-600">{weekRangeLabel(weekStart)}</p>
        </div>

        {/* Week grid */}
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
                    {(b.courses as CourseWithChildren[]).map((c) => (
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
                        <p className="mt-0.5 text-xs text-gray-600">
                          {c.children.length === 0
                            ? "（未选学生）"
                            : c.children.map((s) => s.name).join("、")}
                        </p>
                        {c.notes && (
                          <p className="mt-0.5 text-xs text-gray-500 whitespace-pre-wrap">
                            {c.notes}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-3">
                          <Link
                            href={`/schedule/${c.id}/edit`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            编辑
                          </Link>
                          <form action={deleteCourse}>
                            <input
                              type="hidden"
                              name="schedule_id"
                              value={c.id}
                            />
                            <ConfirmButton
                              label="删除"
                              confirmMessage={`确认删除"${c.course_name}"?`}
                              className="text-xs text-red-600 hover:underline"
                            />
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Add course */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">添加课程</h2>
          {allChildren.length === 0 ? (
            <p className="text-sm text-gray-400">
              还没有学生，
              <Link
                href="/children/new"
                className="text-blue-600 hover:underline"
              >
                先去添加学生
              </Link>
              。
            </p>
          ) : (
            <form action={addCourse} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    日期
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={defaultDate}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    开始时间
                  </label>
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="09:00"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    时长(分)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    required
                    min={1}
                    max={600}
                    defaultValue={60}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    课程名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="course_name"
                    required
                    placeholder="如：语言训练"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  参加学生 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3 rounded-md border border-gray-200 p-3">
                  {allChildren.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-1.5 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        name="child_ids"
                        value={c.id}
                        className="h-4 w-4 text-blue-600"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  备注
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="可选"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                添加课程
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
