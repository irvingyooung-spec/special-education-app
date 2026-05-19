"use client";

import { useState, useRef, useEffect } from "react";
import { Sprout, User, Send } from "lucide-react";
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

const quickQuestions = [
  "孩子的评估结果怎么看？",
  "在家怎么配合训练？",
  "有哪些居家干预方法？",
  "孩子最近进步怎么样？",
];

export default function ChatPanel({ childId, childName, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setError(null);

    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(childId, userMsg);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败,请重试");
    } finally {
      setIsLoading(false);
    }
  }

  async function sendQuickQuestion(question: string) {
    if (isLoading) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(childId, question);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败,请重试");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center rounded-full bg-[#f1f8e9] p-4 mb-4">
              <Sprout className="h-8 w-8 text-brand" />
            </div>
            <p className="text-lg font-medium text-[#374151] mb-2">
              👋 你好，我是芽宝
            </p>
            <p className="text-sm text-[#9ca3af] max-w-sm mx-auto">
              我可以帮你了解 {childName} 的评估结果、训练建议、居家干预方法等。
              <br />
              请问有什么可以帮你的？
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuickQuestion(q)}
                  disabled={isLoading}
                  className="rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-sm text-[#374151] hover:border-brand hover:bg-[#f1f8e9] transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f1f8e9] flex items-center justify-center">
                <Sprout className="h-4 w-4 text-brand" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand text-white rounded-br-none"
                  : "bg-white border border-[#e8e8e0] text-[#374151] rounded-bl-none shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#fffde7] flex items-center justify-center">
                <User className="h-4 w-4 text-[#f9a825]" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f1f8e9] flex items-center justify-center">
              <Sprout className="h-4 w-4 text-brand" />
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-bl-none border border-[#e8e8e0] bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: "150ms" }} />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: "300ms" }} />
                <span className="ml-1">芽宝正在思考...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mx-auto max-w-[80%]">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t border-[#e8e8e0] bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-[#d1d5db] px-4 py-2.5 text-sm outline-none text-[#374151] placeholder:text-[#9ca3af] focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-[#f3f4f6] transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:bg-[#d1d5db] disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
            发送
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-[#9ca3af]">
          芽宝的回答仅供参考，不构成医疗诊断或用药建议
        </p>
      </div>
    </div>
  );
}
