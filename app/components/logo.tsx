import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { width: 120, height: 55 },
  md: { width: 160, height: 73 },
  lg: { width: 240, height: 109 },
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const dims = sizeMap[size];
  return (
    <Image
      src="/logo.png"
      alt="新芽儿童乐园"
      width={dims.width}
      height={dims.height}
      priority
      className={`object-contain ${className}`}
    />
  );
}
