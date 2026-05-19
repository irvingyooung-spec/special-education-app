"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function ToastTrigger() {
  const search = useSearchParams();

  useEffect(() => {
    const toastType = search.get("toast");
    const message = search.get("message");
    if (!toastType) return;

    const msg = message ?? "操作成功";
    if (toastType === "success") {
      toast.success(msg);
    } else if (toastType === "error") {
      toast.error(msg);
    } else if (toastType === "info") {
      toast.info(msg);
    }

    // 清理 URL 参数（不刷新页面）
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    url.searchParams.delete("message");
    window.history.replaceState({}, "", url);
  }, [search]);

  return null;
}
