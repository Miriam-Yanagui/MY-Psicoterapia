import type { ReactNode } from "react";

export function MobileScreen({ children, className = "", fullViewport = false }: { children: ReactNode; className?: string; fullViewport?: boolean }) {
  if (fullViewport) return <main className={`mobile-screen mobile-screen--full ${className}`}>{children}</main>;
  return <div className="mobile-stage"><main className={`mobile-screen ${className}`}>{children}</main></div>;
}
