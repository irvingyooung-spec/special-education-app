"use client";

import { useRef } from "react";

interface Props {
  totalItems: number;
  children: React.ReactNode;
  onSubmit: (formData: FormData) => void;
}

export default function ConnersAssessForm({ totalItems, children, onSubmit }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;

    // 统计已评分项
    let scoredCount = 0;
    form.querySelectorAll('input[type="radio"]:checked').forEach((r) => {
      const radio = r as HTMLInputElement;
      if (radio.name.startsWith("score_") && radio.value !== "") {
        scoredCount++;
      }
    });

    const unScored = totalItems - scoredCount;
    if (unScored > 0) {
      const confirmed = window.confirm(
        `还有 ${unScored} 项未评估，是否确认提交？`
      );
      if (!confirmed) {
        e.preventDefault();
        return;
      }
    }

    onSubmit(new FormData(form));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {children}
      <div className="sticky bottom-4 z-10 flex items-center justify-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl border border-[#e8e8e0] p-3 shadow-sm">
        <button
          type="submit"
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
        >
          提交评估
        </button>
      </div>
    </form>
  );
}
