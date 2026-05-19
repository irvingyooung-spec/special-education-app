import BottomNav from "@/app/components/bottom-nav";

export default function ParentChildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  // 从 params 中提取 childId 传给 BottomNav
  // BottomNav 是客户端组件，但我们需要从服务端 layout 传参
  // 所以用 async 包装
  return (
    <ParentChildLayoutInner params={params}>{children}</ParentChildLayoutInner>
  );
}

async function ParentChildLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav childId={parseInt(childId)} />
    </>
  );
}
