"use client";

import { useState, useCallback } from "react";
import SubmitButton from "./submit-button";

interface Props {
  action: (formData: FormData) => void;
  totalItems: number;
  draftSessionId: number;
  children: React.ReactNode;
}

export default function CpepAssessForm({
  action,
  totalItems,
  draftSessionId,
  children,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const handleAutoSave = useCallback(
    async (itemId: number, score: string, notes: string) => {
      setSaving(true);
      try {
        const formData = new FormData();
        formData.append("session_id", draftSessionId.toString());
        formData.append("item_id", itemId.toString());
        formData.append("score", score);
        formData.append("notes", notes);

        await fetch("/api/cpep/auto-save", {
          method: "POST",
          body: formData,
        });
        setSavedCount((prev) => prev + 1);
      } catch (e) {
        console.error("Auto-save failed:", e);
      } finally {
        setSaving(false);
      }
    },
    [draftSessionId]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const radios = form.querySelectorAll<HTMLInputElement>(
      'input[type="radio"]:checked'
    );
    const scoredCount = radios.length;
    const unscored = totalItems - scoredCount;

    if (unscored > 0) {
      const confirmed = window.confirm(
        `还有 ${unscored} 项未评分，确定要提交吗？`
      );
      if (!confirmed) {
        e.preventDefault();
      }
    }
  };

  // Inject auto-save listeners after mount
  const setFormRef = useCallback(
    (formEl: HTMLFormElement | null) => {
      if (!formEl) return;

      // Listen to radio changes for auto-save
      formEl.querySelectorAll<HTMLInputElement>('.auto-save-trigger').forEach((radio) => {
        radio.addEventListener('change', function (this: HTMLInputElement) {
          const itemId = parseInt(this.dataset.itemId || "0");
          const score = this.value;
          const notesInput = formEl.querySelector<HTMLInputElement>(
            `input[name="notes_${itemId}"]`
          );
          const notes = notesInput?.value || "";
          handleAutoSave(itemId, score, notes);
        });
      });

      // Listen to notes blur for auto-save
      formEl.querySelectorAll<HTMLInputElement>('.auto-save-notes').forEach((input) => {
        input.addEventListener('blur', function (this: HTMLInputElement) {
          const itemId = parseInt(this.dataset.itemId || "0");
          const notes = this.value;
          const radio = formEl.querySelector<HTMLInputElement>(
            `input[name="score_${itemId}"]:checked`
          );
          if (radio) {
            handleAutoSave(itemId, radio.value, notes);
          }
        });
      });
    },
    [handleAutoSave]
  );

  return (
    <form ref={setFormRef} action={action} onSubmit={handleSubmit} className="space-y-6">
      {children}

      {/* Sticky submit bar */}
      <div className="sticky bottom-4 bg-white rounded-xl border border-[#e8e8e0] p-4 shadow-lg z-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#6b7280]">
            共 {totalItems} 项
            {savedCount > 0 && (
              <span className="ml-1">
                · 已自动保存 {savedCount} 项
                {saving && <span className="text-brand">(保存中...)</span>}
              </span>
            )}
          </p>
          <SubmitButton
            label="提交评估"
            loadingLabel="提交中..."
            className="rounded-lg bg-brand px-6 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-all duration-200 active:scale-[0.98]"
          />
        </div>
      </div>
    </form>
  );
}
