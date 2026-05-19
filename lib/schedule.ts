/**
 * 课表周视图相关的工具函数。客户端和服务端都可以用。
 */

export type ScheduleRow = {
  id: number;
  child_id: number;
  start_at: string; // ISO datetime
  duration_minutes: number;
  course_name: string;
  notes: string | null;
};

/** 取一周里的周一（00:00 本地时间） */
export function getMonday(d: Date): Date {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = result.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
  const offset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + offset);
  return result;
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

/** YYYY-MM-DD（本地时区） */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 把 ?week=YYYY-MM-DD 解析成对应那周的周一；非法则返回 null。 */
export function parseWeekParam(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map((x) => parseInt(x));
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return getMonday(date);
}

export const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/** 把一周里所有课程按天分桶，返回 7 个数组 */
export function bucketByDay(
  weekStart: Date,
  courses: ScheduleRow[]
): Array<{ date: Date; courses: ScheduleRow[] }> {
  const buckets: Array<{ date: Date; courses: ScheduleRow[] }> = [];
  for (let i = 0; i < 7; i++) {
    buckets.push({ date: addDays(weekStart, i), courses: [] });
  }
  for (const c of courses) {
    const cDate = new Date(c.start_at);
    const key = dayKey(cDate);
    const bucket = buckets.find((b) => dayKey(b.date) === key);
    bucket?.courses.push(c);
  }
  // 每天内部按开始时间升序
  for (const b of buckets) {
    b.courses.sort((a, b) => a.start_at.localeCompare(b.start_at));
  }
  return buckets;
}

export function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatEndTime(iso: string, durationMin: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + durationMin);
  return formatTimeOnly(d.toISOString());
}

export function formatMonthDay(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 给周一日期返回 "2026 年 5 月 18 日 - 5 月 24 日" 这种标签 */
export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const y = weekStart.getFullYear();
  return `${y} 年 ${weekStart.getMonth() + 1} 月 ${weekStart.getDate()} 日 - ${end.getMonth() + 1} 月 ${end.getDate()} 日`;
}
