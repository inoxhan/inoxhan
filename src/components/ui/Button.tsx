import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "metallic" | "dark" | "outline" | "ghost-dark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-all duration-200 rounded-md cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // Koyu zeminde parlayan inox CTA — tasarımın imza butonu
  metallic:
    "gradient-steel text-steel-950 shadow-elevated hover:brightness-105 active:brightness-95 relative overflow-hidden",
  // Açık zeminde birincil aksiyon
  dark: "bg-steel-950 text-steel-50 hover:bg-steel-800 active:bg-steel-900",
  // Açık zeminde ikincil
  outline:
    "border border-steel-300 text-steel-800 hover:border-steel-500 hover:bg-steel-100",
  // Koyu zeminde ikincil
  "ghost-dark":
    "border border-steel-700 text-steel-100 hover:border-steel-500 hover:bg-steel-800/60",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[15px]",
  lg: "h-13 px-8 text-base",
};

export function buttonStyles(opts?: { variant?: Variant; size?: Size; className?: string }) {
  const { variant = "dark", size = "md", className } = opts ?? {};
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonStyles({ variant, size, className })} {...props} />;
}
