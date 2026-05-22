import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  Plus,
  History,
  QrCode,
  Users,
  GraduationCap,
  FileQuestion,
} from "lucide-react";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import Card from "@/app/components/card";
import { requireRole } from "@/lib/auth";
import {
  getSessionsForChild,
  questionnaireLabel,
} from "@/lib/conners";
import { CONNERS_QUESTIONNAIRES } from "@/lib/conners-catalog";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConnersPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT * FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) {
    notFound();
  }

  const sessions = getSessionsForChild(childId);

  // 每种问卷的最新评估
  const latestByType = new Map<string, (typeof sessions)[0]>();
  for (const s of sessions) {
    if (!latestByType.has(s.questionnaire_type)) {
      latestByType.set(s.questionnaire_type, s);
    }
  }

  const questionnaireIcons = {
    parent: Users,
    teacher: GraduationCap,
    brief: FileQuestion,
  };

  const questionnaireColors = {
    parent: "bg-[#e53935] hover:bg-[#c62828]",
    teacher: "bg-[#5c6bc0] hover:bg-[#3f51b5]",
    brief: "bg-[#66bb6a] hover:bg-[#43a047]",
  };

  return (
    <PageShell
      backHref={`/children/${childId}`}
      backLabel="返回学生详情"
      title="Conners 儿童行为问卷"
      subtitle={`${child.name} — 用于筛查行为问题（特别是 ADHD）`}
      maxWidth="md"
      showLogo
    >
      <div className="space-y-6">
        {/* 说明卡片 */}
        <div className="rounded-xl border border-[#e8e8e0] bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#fff3e0] p-2">
              <Activity className="h-4 w-4 text-[#e65100]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#374151]">
                关于 Conners 评估
              </p>
              <p className="mt-1 text-xs text-[#6b7280] leading-relaxed">
                Conners 儿童行为问卷是筛查儿童行为问题（特别是 ADHD）的经典量表。
                评分方式：0=没有，1=偶尔有一点，2=相当多，3=非常多。
                包含父母问卷（48项）、教师问卷（28项）和简明问卷（10项）三种版本。
              </p>
            </div>
          </div>
        </div>

        {/* 二维码入口：父母问卷 */}
        <Card
          title="家长扫码填写"
          icon={QrCode}
          action={
            <Link
              href={`/children/${childId}/conners/qrcode`}
              className="inline-flex items-center gap-1 rounded-lg bg-[#e53935] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#c62828] transition-all duration-200 active:scale-[0.98]"
            >
              <QrCode className="h-3.5 w-3.5" />
              生成二维码
            </Link>
          }
        >
          <p className="text-sm text-[#6b7280]">
            生成二维码让家长微信扫码填写父母问卷（48项）。家长填写后数据会自动同步到系统中。
          </p>
        </Card>

        {/* 三种问卷卡片 */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-[#374151]">新建评估</h2>
          {CONNERS_QUESTIONNAIRES.map((q) => {
            const Icon = questionnaireIcons[q.type];
            const latest = latestByType.get(q.type);
            return (
              <div
                key={q.type}
                className="rounded-xl border border-[#e8e8e0] bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-[#f3f4f6] p-2">
                      <Icon className="h-4 w-4 text-[#6b7280]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-[#374151]">
                        {q.label}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#9ca3af]">
                        {q.item_count}项 · {q.age_range} · 填写人：{q.respondent}
                      </p>
                      {latest && (
                        <p className="mt-1 text-xs text-[#6b7280]">
                          上次评估：{new Date(latest.created_at).toLocaleDateString("zh-CN")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/children/${childId}/conners/assess?type=${q.type}`}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 active:scale-[0.98] ${questionnaireColors[q.type]}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    开始
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* 历史记录 */}
        {sessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-[#374151]">历史记录</h2>
            <Link
              href={`/children/${childId}/connerss`}
              className="flex items-center justify-between rounded-xl border border-[#e8e8e0] bg-white p-4 hover:border-[#d1d5db] transition-colors"
            >
              <div className="flex items-center gap-3">
                <History className="h-4 w-4 text-[#6b7280]" />
                <span className="text-sm text-[#374151]">
                  查看全部 {sessions.length} 次评估记录
                </span>
              </div>
              <span className="text-xs text-[#9ca3af]">→</span>
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}
