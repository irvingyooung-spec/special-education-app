import { NextResponse, type NextRequest } from "next/server";

// 完全公开的精确路径
const PUBLIC_EXACT = new Set(["/login"]);

// 完全公开的前缀（家长二维码问卷链接，无需登录）
const PUBLIC_PREFIXES = ["/q/"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 静态资源直接放行
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|css|js|json)$/.test(pathname)) {
    return NextResponse.next();
  }

  // 公开路径直接放行
  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 检查 session cookie；无则跳 /login（并带上原路径以便登录后回跳）
  const sid = request.cookies.get("sid")?.value;
  if (!sid) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") {
      url.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(url);
  }

  // 有 cookie 就放行；具体角色判断在各页面用 requireRole() 完成
  // （proxy 在 Edge 运行时无法访问 better-sqlite3）
  return NextResponse.next();
}

export const config = {
  // 跳过 Next.js 内部资源和静态文件
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
