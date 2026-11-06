import type { ReactNode } from "react";

/** The pages used to fade in section by section; they do not any more. This keeps the old call sites (the dashboard) as plain boxes. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={className}>{children}</div>;
}
