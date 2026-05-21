"use client";

import { useRef } from "react";

interface Props {
  totalItems: number;
  draftSessionId: number | null;
  children: React.ReactNode;
  onSaveDraft: (formData: FormData) => void;
  onSubmit: (formData: FormData) => void;
}

export default function AbllsAssessForm({
  totalItems,
  draftSessionId,
  children,
  onSaveDraft,
  onSubmit,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const intent = submitter?.value;

    if (intent === "submit") {
      // 统计已评分项
      const checkedRadios = form.querySelectorAll<HTMLInputElement>(
        'input[type="radio"]:checked'
      );
      let scoredCount = 0;
      checkedRadios.forEach((r) => {
        // 只统计 score_* 名称的 radio，且值不为空
        if (r.name.startsWith("score_") && r.value !== "") {
          scoredCount++;
        }
      });

      const unScored = totalItems - scoredCount;
      if (unScored > 0) {
        const confirmed = window.confirm(
          `还有 ${unScored} 项未评估（共 ${totalItems} 项），是否确认提交？\n\n提交后仍可继续编辑报告。`
        );
        if (!confirmed) {
          e.preventDefault();
          return;
        }
      }

      // 调用提交 action
      const formData = new FormData(form);
      onSubmit(formData);
    } else if (intent === "draft") {
      const formData = new FormData(form);
      onSaveDraft(formData);
    }
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        // default action fallback
        const intent = formData.get("intent") as string;
        if (intent === "draft") {
          onSaveDraft(formData);
        } else {
          onSubmit(formData);
        }
      }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {draftSessionId && (
        <input type="hidden" name="draft_session_id" value={draftSessionId} />
      )}
      {children}
      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-xl border border-[#e8e8e0] bg-white p-4 shadow-sm">
        <button
          type="submit"
          name="intent"
          value="draft"
          className="rounded-lg border border-[#d1d5db] px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors"
        >
          保存草稿
        </button>
        <button
          type="submit"
          name="intent"
          value="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
        >
          提交评估
        </button>
        <span className="ml-auto text-xs text-[#9ca3af]">
          已保存{" "}
          <span id="draft-count">
            {draftSessionId ? "草稿" : "0 项"}
          </span>
        </span>
      </div>
    </form>
  );
}
