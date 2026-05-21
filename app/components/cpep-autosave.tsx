"use client";

import { useEffect } from "react";

interface Props {
  sessionId: number;
  totalItems: number;
  initialSavedCount: number;
}

export default function CpepAutoSave({
  sessionId,
  totalItems,
  initialSavedCount,
}: Props) {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(
      "form[data-draft-session-id]"
    );
    if (!form) return;

    const statusEl = document.getElementById("autosave-status");
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingSaves = new Set<string>();
    const savedItemIds = new Set<number>();

    // 初始化时包含已加载的 draft 项
    if (initialSavedCount > 0) {
      // 从已选中的 radio 中收集 itemId
      form
        .querySelectorAll<HTMLInputElement>(
          '.auto-save-trigger:checked[value]:not([value=""])'
        )
        .forEach((radio) => {
          const itemId = radio.dataset.itemId;
          if (itemId) savedItemIds.add(parseInt(itemId));
        });
    }

    function updateStatus() {
      if (statusEl) {
        statusEl.textContent =
          "已自动保存 " + savedItemIds.size + " 项评分";
      }
    }

    // 初始化状态显示
    updateStatus();

    async function saveItem(itemId: string, score: string, notes: string) {
      pendingSaves.add(itemId);
      try {
        const formData = new FormData();
        formData.append("session_id", String(sessionId));
        formData.append("item_id", itemId);
        formData.append("score", score);
        formData.append("notes", notes || "");

        const resp = await fetch("/api/cpep/auto-save", {
          method: "POST",
          body: formData,
        });

        if (resp.ok) {
          savedItemIds.add(parseInt(itemId));
        }
      } catch (e) {
        console.error("Auto-save failed:", e);
      } finally {
        pendingSaves.delete(itemId);
      }
    }

    // Listen to radio changes
    form
      .querySelectorAll<HTMLInputElement>(".auto-save-trigger")
      .forEach((radio) => {
        radio.addEventListener("change", function () {
          const itemId = this.dataset.itemId!;
          const score = this.value;
          const notesInput = form.querySelector<HTMLInputElement>(
            'input[name="notes_' + itemId + '"]'
          );
          const notes = notesInput ? notesInput.value : "";

          if (saveTimer) clearTimeout(saveTimer);
          if (statusEl) statusEl.textContent = "正在保存...";

          saveTimer = setTimeout(() => {
            saveItem(itemId, score, notes).then(() => {
              updateStatus();
            });
          }, 500);
        });
      });

    // Listen to notes changes
    form
      .querySelectorAll<HTMLInputElement>(".auto-save-notes")
      .forEach((input) => {
        input.addEventListener("blur", function () {
          const itemId = this.dataset.itemId!;
          const notes = this.value;
          const radio = form.querySelector<HTMLInputElement>(
            'input[name="score_' + itemId + '"]:checked'
          );
          if (radio) {
            saveItem(itemId, radio.value, notes).then(() => {
              updateStatus();
            });
          }
        });
      });

    // Submit handler: confirm if incomplete + wait for pending saves
    const handleSubmit = (e: SubmitEvent) => {
      const submitter = e.submitter as HTMLButtonElement | null;
      const intent = submitter?.value || "submit";

      // 只有"提交评估"才需要确认
      if (intent === "submit") {
        // Count scored items
        const checkedRadios = form.querySelectorAll<HTMLInputElement>(
          '.auto-save-trigger:checked[value]:not([value=""])'
        );
        const scoredCount = checkedRadios.length;
        const unScored = totalItems - scoredCount;

        if (unScored > 0) {
          const confirmed = window.confirm(
            `还有 ${unScored} 项未评估（共 ${totalItems} 项），是否确认提交？\n\n提交后仍可生成 AI 报告。`
          );
          if (!confirmed) {
            e.preventDefault();
            return;
          }
        }
      }

      // Wait for pending saves
      if (pendingSaves.size > 0) {
        e.preventDefault();
        if (statusEl) statusEl.textContent = "正在保存...";
        const checkInterval = setInterval(() => {
          if (pendingSaves.size === 0) {
            clearInterval(checkInterval);
            (e.target as HTMLFormElement).submit();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          (e.target as HTMLFormElement).submit();
        }, 3000);
      }
    };

    form.addEventListener("submit", handleSubmit);

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      form.removeEventListener("submit", handleSubmit);
    };
  }, [sessionId, totalItems, initialSavedCount]);

  return null;
}
