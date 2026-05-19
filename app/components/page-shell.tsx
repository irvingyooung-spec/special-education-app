import Link from "next/link";
import Logo from "./logo";

interface PageShellProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  action?: React.ReactNode;
  showLogo?: boolean;
}

const maxWidthMap = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
};

export default function PageShell({
  title,
  subtitle,
  backHref,
  backLabel,
  maxWidth = "lg",
  children,
  action,
  showLogo = true,
}: PageShellProps) {
  const widthClass = maxWidthMap[maxWidth];

  return (
    <div className="min-h-screen bg-warm-bg">
      <header className="bg-white shadow-sm border-b border-[#e8e8e0]">
        <div className={`mx-auto ${widthClass} px-4 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showLogo && (
                <Link href="/">
                  <Logo size="sm" />
                </Link>
              )}
              {backHref && (
                <Link
                  href={backHref}
                  className="text-sm text-brand hover:text-brand-dark transition-colors"
                >
                  ← {backLabel ?? "返回"}
                </Link>
              )}
            </div>
            {action && <div className="flex items-center gap-3">{action}</div>}
          </div>
          {(title || subtitle) && (
            <div className="mt-3">
              {title && (
                <h1 className="text-2xl font-bold text-[#374151]">{title}</h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-[#9ca3af]">{subtitle}</p>
              )}
            </div>
          )}
        </div>
      </header>

      <main className={`mx-auto ${widthClass} px-4 py-8`}>{children}</main>
    </div>
  );
}
