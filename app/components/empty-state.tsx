import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-[#e8e8e0] bg-white p-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-[#c5e1a5]" strokeWidth={1.5} />
      <p className="mt-4 text-[#374151] font-medium">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-[#9ca3af]">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-block rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
