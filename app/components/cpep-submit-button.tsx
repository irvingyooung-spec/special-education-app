"use client";

import { Send } from "lucide-react";

interface Props {
  totalScored: number;
  totalItems: number;
}

export default function CpepSubmitButton({ totalScored, totalItems }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const unScored = totalItems - totalScored;
    if (unScored > 0) {
      const confirmed = window.confirm(
        `还有 ${unScored} 项未评估（共 ${totalItems} 项），是否确认提交？\n\n提交后仍可生成 AI 报告。`
      );
      if (!confirmed) {
        e.preventDefault();
      }
    }
  };

  return (
    <button
      type="submit"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand text-brand px-4 py-3 text-sm font-medium hover:bg-brand/5 transition-colors"
    >
      <Send className="h-4 w-4" />
      提交评估
    </button>
  );
}
