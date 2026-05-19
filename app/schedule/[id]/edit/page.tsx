import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { dayKey, formatTimeOnly, type ScheduleRow } from "@/lib/schedule";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSchedulePage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id } = await params;
  const scheduleId = parseInt(id);

  const course = db
    .prepare("SELECT * FROM schedules WHERE id = ?")
    .get(scheduleId) as ScheduleRow | undefined;

  if (!course) notFound();

  const startDate = new Date(course.start_at);
  // 表单需要 YYYY-MM-DD 和 HH:MM 本地时区字符串
  const dateValue = dayKey(startDate);
  const timeValue = formatTimeOnly(course.start_at);

  const allChildren = db
    .prepare("SELECT id, name FROM children ORDER BY name")
    .all() as Array<{ id: number; name: string }>;

  const linkedRows = db
    .prepare("SELECT child_id FROM schedule_children WHERE schedule_id = ?")
    .all(scheduleId) as Array<{ child_id: number }>;
  const linkedIds = new Set(linkedRows.map((r) => r.child_id));

  // 用来跳回原本的周
  const returnWeek = dayKey(startDate);

  async function saveEdit(formData: FormData) {
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

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE schedules
         SET start_at = ?, duration_minutes = ?, course_name = ?, notes = ?
         WHERE id = ?`
      ).run(start.toISOString(), duration, name, notes || null, scheduleId);

      db.prepare("DELETE FROM schedule_children WHERE schedule_id = ?").run(
        scheduleId
      );
      const insertLink = db.prepare(
        "INSERT INTO schedule_children (schedule_id, child_id) VALUES (?, ?)"
      );
      for (const cid of childIds) insertLink.run(scheduleId, cid);
    });
    tx();

    redirect(`/schedule?week=${dayKey(start)}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link
            href={`/schedule?week=${returnWeek}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← 返回课表
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">编辑课程</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form
          action={saveEdit}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                日期
              </label>
              <input
                type="date"
                name="date"
                required
                defaultValue={dateValue}
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
                defaultValue={timeValue}
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
                defaultValue={course.duration_minutes}
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
                defaultValue={course.course_name}
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
                    defaultChecked={linkedIds.has(c.id)}
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
              defaultValue={course.notes ?? ""}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href={`/schedule?week=${returnWeek}`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </Link>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              保存修改
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
