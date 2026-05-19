"use server";

import { getCurrentUser } from "@/lib/auth";
import { chatWithAssistant } from "@/lib/chat";

/**
 * 家长发送消息给芽宝。
 * 返回芽宝的完整回复文本。
 */
export async function sendChatMessage(
  childId: number,
  message: string
): Promise<string> {
  const user = await getCurrentUser();
  if (!user || user.role !== "parent") {
    throw new Error("请先登录家长账号");
  }

  if (!message.trim()) {
    throw new Error("消息不能为空");
  }

  return chatWithAssistant(childId, user.id, message.trim());
}
