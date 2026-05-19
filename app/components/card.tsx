import { type LucideIcon } from "lucide-react";

interface CardProps {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "danger" | "highlight" | "brand";
  className?: string;
}

const variantMap = {
  default:
    "bg-white border-[#e8e8e0] shadow-sm",
  danger:
    "bg-red-50/40 border-red-200",
  highlight:
    "bg-gradient-to-r from-[#f3e5f5] to-[#e3f2fd] border-purple-200",
  brand:
    "bg-gradient-to-r from-[#f1f8e9] to-[#fffde7] border-[#aed581]",
};

export default function Card({
  title,
  icon: Icon,
  action,
  children,
  variant = "default",
  className = "",
}: CardProps) {
  return (
    <section
      className={`rounded-xl border p-6 ${variantMap[variant]} ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-brand" />}
            {title && (
              <h2 className="text-lg font-semibold text-[#374151]">{title}</h2>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
