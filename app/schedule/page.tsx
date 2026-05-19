import Link from "next/link";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import SubmitButton from "@/app/components/submit-button";
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

    redirect(`/schedule?week=${dayKey(start)}&toast=success&message=课程已添加`);
  }

  async function deleteCourse(formData: FormData) {
    "use server";
    const scheduleId = parseInt((formData.get("schedule_id") as string) ?? "");
    if (!scheduleId) return;
    db.prepare("DELETE FROM schedules WHERE id = ?").run(scheduleId);
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Link href="/" className="text-sm text-brand hover:underline">
            ← 返回学生列表
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#374151]">课表</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            统一管理所有课程，每节课可以同时绑定多个学生。家长只看到自己孩子参加的课。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Week nav */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8e8e0] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Link
              href={`/schedule?week=${prevWeek}`}
              className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#6b7280] hover:bg-[#f9fafb]"
            >
              ← 上一周
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/schedule"
                className="rounded-lg border border-brand-light bg-[#f1f8e9] px-3 py-1.5 text-sm text-brand-dark hover:bg-[#e8f5e9]"
              >
                本周
              </Link>
            )}
            <Link
              href={`/schedule?week=${nextWeek}`}
              className="rounded-lg border border-[#d1d5db] px-3 py-1.5 text-sm text-[#6b7280] hover:bg-[#f9fafb]"
            >
              下一周 →
            </Link>
          </div>
          <p className="text-sm text-[#6b7280]">{weekRangeLabel(weekStart)}</p>
        </div>

        {/* Week grid */}
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
                    {(b.courses as CourseWithChildren[]).map((c) => (
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
                        <p className="mt-0.5 text-xs text-[#6b7280]">
                          {c.children.length === 0
                            ? "（未选学生）"
                            : c.children.map((s) => s.name).join("、")}
                        </p>
                        {c.notes && (
                          <p className="mt-0.5 text-xs text-[#9ca3af] whitespace-pre-wrap">
                            {c.notes}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-3">
                          <Link
                            href={`/schedule/${c.id}/edit`}
                            className="text-xs text-brand hover:underline"
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
        <section className="rounded-xl border border-[#e8e8e0] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#374151]">添加课程</h2>
          {allChildren.length === 0 ? (
            <p className="text-sm text-[#d1d5db]">
              还没有学生，
              <Link
                href="/children/new"
                className="text-brand hover:underline"
              >
                先去添加学生
              </Link>
              。
            </p>
          ) : (
            <form action={addCourse} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">
                    日期
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={defaultDate}
                    className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">
                    开始时间
                  </label>
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="09:00"
                    className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">
                    时长(分)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    required
                    min={1}
                    max={600}
                    defaultValue={60}
                    className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">
                    课程名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="course_name"
                    required
                    placeholder="如：语言训练"
                    className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-1">
                  参加学生 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3 rounded-lg border border-[#e8e8e0] p-3">
                  {allChildren.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-1.5 text-sm text-[#6b7280]"
                    >
                      <input
                        type="checkbox"
                        name="child_ids"
                        value={c.id}
                        className="h-4 w-4 text-brand"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-1">
                  备注
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="可选"
                  className="block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <SubmitButton label="添加课程" loadingLabel="添加中..." />
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
