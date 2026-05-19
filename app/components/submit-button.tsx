"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  label: string;
  loadingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}

const variantMap = {
  primary:
    "bg-brand text-white hover:bg-brand-dark disabled:bg-[#c5e1a5]",
  secondary:
    "border border-[#d1d5db] text-[#374151] bg-white hover:bg-[#f9fafb] disabled:bg-[#f3f4f6]",
  danger:
    "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

export default function SubmitButton({
  label,
  loadingLabel = "处理中...",
  variant = "primary",
  className = "",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed ${variantMap[variant]} ${className}`}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? loadingLabel : label}
    </button>
  );
}
