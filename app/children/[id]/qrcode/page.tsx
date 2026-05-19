import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import db from "@/lib/db";
import { requireRole } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

type Questionnaire = {
  id: number;
  child_id: number;
  token: string;
  parent_name: string | null;
  relation: string | null;
  contact: string | null;
  child_gender: string | null;
  child_birth_date: string | null;
  diagnosis: string | null;
  diagnosis_hospital: string | null;
  diagnosis_date: string | null;
  current_training: string | null;
  medication: string | null;
  allergies: string | null;
  prior_training: string | null;
  prior_assessment: string | null;
  daily_behavior: string | null;
  main_reinforcers: string | null;
  top_concerns: string | null;
  parent_expectations: string | null;
  submitted_at: string | null;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  // ISO date string like 2026-05-17
  return iso;
}

function ageFromDob(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return `${years} 岁`;
}

function Row({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {multiline ? (
        <p className="rounded bg-gray-50 p-2 text-sm text-gray-700 whitespace-pre-wrap">
          {value}
        </p>
      ) : (
        <p className="text-sm text-gray-800">{value}</p>
      )}
    </div>
  );
}

export default async function ChildQrCodePage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) {
    notFound();
  }

  let questionnaire = db
    .prepare("SELECT * FROM parent_questionnaires WHERE child_id = ?")
    .get(childId) as Questionnaire | undefined;

  if (!questionnaire) {
    const token = randomUUID();
    db.prepare(
      "INSERT INTO parent_questionnaires (child_id, token) VALUES (?, ?)"
    ).run(childId, token);
    questionnaire = db
      .prepare("SELECT * FROM parent_questionnaires WHERE child_id = ?")
      .get(childId) as Questionnaire;
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const fullUrl = `${proto}://${host}/q/${questionnaire.token}`;

  const qrSvg = await QRCode.toString(fullUrl, {
    type: "svg",
    margin: 1,
    width: 240,
  });

  const q = questionnaire;
  const dobAge = ageFromDob(q.child_birth_date);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href={`/children/${childId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← 返回学生详情
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            家长问卷 — {child.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            让家长扫码填写问卷,或把下方链接发给家长
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* 二维码 */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center">
            <div
              className="rounded-md border border-gray-200 bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-4 text-xs text-gray-500">用手机微信 / 相机扫码</p>
          </div>

          <div className="mt-6 rounded-md bg-gray-50 p-3">
            <p className="text-xs text-gray-500 mb-1">问卷链接:</p>
            <p className="text-sm text-gray-800 break-all font-mono">
              {fullUrl}
            </p>
          </div>
        </section>

        {/* 提交状态 / 内容 */}
        {!q.submitted_at ? (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">提交状态</h2>
            <p className="mt-3 text-sm text-gray-400">家长尚未提交问卷</p>
          </section>
        ) : (
          <>
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
              ✓ 家长已于 {new Date(q.submitted_at).toLocaleString("zh-CN")} 提交
            </div>

            {/* 一、家长信息 */}
            {(q.parent_name || q.relation || q.contact) && (
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-gray-800">
                  一、家长信息
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Row label="姓名" value={q.parent_name} />
                  <Row label="关系" value={q.relation} />
                  <Row label="联系方式" value={q.contact} />
                </div>
              </section>
            )}

            {/* 二、孩子基本信息 */}
            {(q.child_gender || q.child_birth_date) && (
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-gray-800">
                  二、孩子基本信息
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Row label="性别" value={q.child_gender} />
                  <Row
                    label="出生日期"
                    value={formatDate(q.child_birth_date)}
                  />
                  <Row label="实足年龄" value={dobAge} />
                </div>
              </section>
            )}

            {/* 三、诊断信息 */}
            {(q.diagnosis || q.diagnosis_hospital || q.diagnosis_date) && (
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-gray-800">
                  三、诊断信息
                </h2>
                <div className="space-y-3">
                  <Row label="诊断结果" value={q.diagnosis} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Row label="诊断医院" value={q.diagnosis_hospital} />
                    <Row label="诊断日期" value={formatDate(q.diagnosis_date)} />
                  </div>
                </div>
              </section>
            )}

            {/* 四、健康与干预 */}
            {(q.current_training ||
              q.prior_training ||
              q.medication ||
              q.allergies) && (
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-gray-800">
                  四、健康与干预
                </h2>
                <div className="space-y-3">
                  <Row
                    label="当前康复训练"
                    value={q.current_training}
                    multiline
                  />
                  <Row
                    label="之前的训练 / 治疗"
                    value={q.prior_training}
                    multiline
                  />
                  <Row label="服药情况" value={q.medication} multiline />
                  <Row label="过敏 / 禁忌" value={q.allergies} />
                </div>
              </section>
            )}

            {/* 五、孩子特点 */}
            {(q.daily_behavior ||
              q.main_reinforcers ||
              q.prior_assessment) && (
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-gray-800">
                  五、孩子的特点
                </h2>
                <div className="space-y-3">
                  <Row label="日常表现" value={q.daily_behavior} multiline />
                  <Row
                    label="主要强化物"
                    value={q.main_reinforcers}
                    multiline
                  />
                  <Row label="上一次评估" value={q.prior_assessment} />
                </div>
              </section>
            )}

            {/* 六、关注与期望 */}
            {(q.top_concerns || q.parent_expectations) && (
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-gray-800">
                  六、关注与期望
                </h2>
                <div className="space-y-3">
                  <Row label="最关注的问题" value={q.top_concerns} multiline />
                  <Row
                    label="家长期望"
                    value={q.parent_expectations}
                    multiline
                  />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
