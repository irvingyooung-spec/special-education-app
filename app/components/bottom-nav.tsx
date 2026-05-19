"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, CalendarDays, Sprout } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface BottomNavProps {
  childId: number;
}

export default function BottomNav({ childId }: BottomNavProps) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      label: "首页",
      href: `/parent/${childId}`,
      icon: Home,
    },
    {
      label: "评估",
      href: `/parent/${childId}/assessments`,
      icon: ClipboardList,
    },
    {
      label: "课表",
      href: `/parent/${childId}/schedule`,
      icon: CalendarDays,
    },
    {
      label: "芽宝",
      href: `/parent/${childId}/chat`,
      icon: Sprout,
    },
  ];

  // 判断当前页面是否匹配某个 Tab（支持子页面匹配）
  const isActive = (href: string) => {
    if (href === `/parent/${childId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e8e8e0] bg-white/95 backdrop-blur-sm safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
                active
                  ? "text-brand"
                  : "text-[#9ca3af] hover:text-[#6b7280]"
              }`}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[11px] ${active ? "font-medium" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
