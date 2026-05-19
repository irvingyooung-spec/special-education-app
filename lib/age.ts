// 根据出生日期(ISO 字符串 YYYY-MM-DD)计算实足年龄(整周岁)
export function ageFromDob(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return years >= 0 ? years : null;
}

// 格式化为"X 岁"或 null
export function ageLabel(iso: string | null | undefined): string | null {
  const y = ageFromDob(iso);
  return y === null ? null : `${y} 岁`;
}
