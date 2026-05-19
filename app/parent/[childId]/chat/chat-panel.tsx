"use client";

import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "./actions";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface Props {
  childId: number;
  childName: string;
  initialMessages: Message[];
}

export default function ChatPanel({ childId, childName, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息来时自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setError(null);

    // 先把用户消息加到列表
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(childId, userMsg);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败,请重试");
      // 出错时把用户消息也保留,让用户能看到自己发了什么
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg mb-2">👋 你好,我是芽宝</p>
            <p className="text-sm">
              我可以帮你了解 {childName} 的评估结果、训练建议、居家干预方法等。
              <br />
              请问有什么可以帮你的?
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-none border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                <span className="ml-1">芽宝正在思考...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-gray-400">
          芽宝的回答仅供参考,不构成医疗诊断或用药建议
        </p>
      </div>
    </div>
  );
}
