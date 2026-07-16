import type { ReactNode } from "react";

export function StatusPill({ children }: { children: ReactNode }) {
  return <span className="ui-status">{children}</span>;
}
