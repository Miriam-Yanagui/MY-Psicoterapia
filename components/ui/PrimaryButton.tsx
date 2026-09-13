import Image from "next/image";
import type { ButtonHTMLAttributes } from "react";

export function PrimaryButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`primary-button ${className}`} {...props}><span>{children}</span><Image src="/assets/f02-arrow-right.png" alt="" width={18} height={18} /></button>;
}
