import type { ReactNode } from "react";

export function MobileScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className="mobile-stage"><main className={`mobile-screen ${className}`}>{children}</main></div>;
}
