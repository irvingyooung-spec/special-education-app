import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import db from "@/lib/db";
import { getAllMessagesForConversation } from "@/lib/chat";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeacherChatHistoryPage({ params }: Props) {
  await requireRole("teacher", "admin");
  const { id } = await params;
  const childId = parseInt(id);

  const child = db
    .prepare("SELECT name FROM children WHERE id = ?")
    .get(childId) as { name: string } | undefined;

  if (!child) {
    notFound();
  }

  // 查找这个孩子的所有聊天会话
  const conversations = db
    .prepare(
      `SELECT c.id, c.title, c.created_at, c.updated_at, u.username as parent_name
       FROM chat_conversations c
       JOIN users u ON u.id = c.parent_user_id
       WHERE c.child_id = ?
       ORDER BY c.updated_at DESC`
    )
    .all(childId) as Array<{
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
    parent_name: string;
  }>;

  // 读取所有消息
  const allMessages: Array<{
    conversationId: number;
    conversationTitle: string;
    parentName: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }> = [];

  for (const conv of conversations) {
    const messages = getAllMessagesForConversation(conv.id);
    for (const msg of messages) {
      allMessages.push({
        conversationId: conv.id,
        conversationTitle: conv.title,
        parentName: conv.parent_name,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at,
      });
    }
  }

  // 按时间排序
  allMessages.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <Link
              href={`/children/${childId}`}
              className="text-sm text-brand hover:underline"
            >
              ← 返回 {child.name} 的详情页
            </Link>
            <h1 className="mt-1 text-xl font-bold text-[#374151]">
              家长与芽宝的聊天记录 · {child.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {allMessages.length === 0 ? (
          <div className="rounded-xl border border-[#e8e8e0] bg-white p-12 text-center">
            <p className="text-[#9ca3af]">该家长尚未使用芽宝</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand text-white rounded-br-none"
                      : "bg-white border border-[#e8e8e0] text-[#374151] rounded-bl-none shadow-sm"
                  }`}
                >
                  <p className="text-xs opacity-70 mb-1">
                    {msg.role === "user"
                      ? `家长 ${msg.parentName}`
                      : "芽宝"}
                    · {new Date(msg.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
