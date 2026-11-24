import type { ReactNode } from 'react';

export function PageState({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <main className="page-state" role={error ? 'alert' : undefined}>{children}</main>;
}
