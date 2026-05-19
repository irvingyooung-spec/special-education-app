"use client";

type Props = {
  label?: string;
  confirmMessage: string;
  className?: string;
};

export function ConfirmButton({
  label = "删除",
  confirmMessage,
  className = "text-sm text-red-600 hover:underline",
}: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
