import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import db from "@/lib/db";
import PageShell from "@/app/components/page-shell";
import { requireRole } from "@/lib/auth";
import {
  createToken,
  getLatestTokenForChild,
  questionnaireLabel,
} from "@/lib/conners";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConnersQrCodePage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT id, name FROM children WHERE id = ?")
    .get(childId) as { id: number; name: string } | undefined;

  if (!child) {
    notFound();
  }

  // 获取或创建 token
  const tokenRecord = getLatestTokenForChild(childId);
  let token: string;
  if (!tokenRecord) {
    token = createToken(childId);
  } else {
    token = tokenRecord.token;
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const fullUrl = `${proto}://${host}/q/conners/${token}`;

  const qrSvg = await QRCode.toString(fullUrl, {
    type: "svg",
    margin: 1,
    width: 240,
  });

  // 检查是否已有家长通过此 token 填写过
  const usedSession = tokenRecord?.used_session_id
    ? (db
        .prepare("SELECT * FROM conners_sessions WHERE id = ?")
        .get(tokenRecord.used_session_id) as {
        id: number;
        questionnaire_type: string;
        created_at: string;
      } | undefined)
    : null;

  return (
    <PageShell
      backHref={`/children/${childId}/conners`}
      backLabel="返回 Conners 总览"
      title="Conners 父母问卷二维码"
      subtitle={`${child.name} — 家长扫码填写`}
      maxWidth="md"
      showLogo
    >
      <div className="space-y-6">
        {/* 二维码 */}
        <div className="rounded-xl border border-[#e8e8e0] bg-white p-6">
          <div className="flex flex-col items-center">
            <div
              className="rounded-lg border border-[#e8e8e0] bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-4 text-xs text-[#9ca3af]">
              让家长用微信 / 相机扫码
            </p>
          </div>

          <div className="mt-6 rounded-lg bg-[#f9fafb] p-3">
            <p className="text-xs text-[#9ca3af] mb-1">问卷链接:</p>
            <p className="text-sm text-[#374151] break-all font-mono">
              {fullUrl}
            </p>
          </div>
        </div>

        {/* 使用状态 */}
        {usedSession ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            家长已通过此二维码提交了
            {questionnaireLabel(usedSession.questionnaire_type as "parent" | "teacher")}，
            提交时间：{new Date(usedSession.created_at).toLocaleString("zh-CN")}
            <div className="mt-2">
              <Link
                href={`/children/${childId}/connerss/${usedSession.id}`}
                className="text-green-700 underline"
              >
                查看评估结果 →
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#e8e8e0] bg-white p-6">
            <h2 className="text-sm font-medium text-[#374151]">提交状态</h2>
            <p className="mt-2 text-sm text-[#d1d5db]">
              家长尚未通过此二维码提交问卷
            </p>
          </div>
        )}

        {/* 重新生成 */}
        <div className="rounded-xl border border-[#e8e8e0] bg-white p-6">
          <h2 className="text-sm font-medium text-[#374151] mb-2">
            重新生成二维码
          </h2>
          <p className="text-xs text-[#6b7280] mb-3">
            如果需要让家长重新填写（比如之前的填写有误），可以生成新的二维码。旧二维码将失效。
          </p>
          <form
            action={async () => {
              "use server";
              await requireRole("teacher", "admin");
              createToken(childId);
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm text-[#374151] bg-white hover:bg-[#f9fafb] transition-colors"
            >
              生成新二维码
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
