import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  verifyParentChild,
  getOrCreateConversation,
  getAllMessagesForConversation,
} from "@/lib/chat";
import db from "@/lib/db";
import ChatPanel from "./chat-panel";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function ChatPage({ params }: Props) {
  const user = await requireRole("parent");
  const { childId: childIdStr } = await params;
  const childId = parseInt(childIdStr);

  // 安全验证:这个孩子是不是当前家长绑定的?
  if (!verifyParentChild(user.id, childId)) {
    redirect("/parent");
  }

  const child = db
    .prepare("SELECT name FROM children WHERE id = ?")
    .get(childId) as { name: string } | undefined;

  if (!child) {
    notFound();
  }

  // 获取或创建会话
  const conversation = getOrCreateConversation(childId, user.id);

  // 读取全部历史消息(用于 UI 展示)
  const messages = getAllMessagesForConversation(conversation.id);

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href={`/parent/${childId}`}
            className="text-sm text-brand hover:underline"
          >
            ← 返回
          </Link>
          <h1 className="text-lg font-bold text-[#374151]">
            芽宝 · {child.name}
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl h-[calc(100dvh-56px)]">
        <ChatPanel
          childId={childId}
          childName={child.name}
          initialMessages={messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))}
        />
      </main>
    </div>
  );
}
