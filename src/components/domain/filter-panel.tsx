"use client";

import { useEffect, useRef } from "react";

/** Filters standaard open op desktop, ingeklapt op mobiel (zodat resultaten direct zichtbaar zijn). */
export function FilterPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && window.matchMedia("(min-width: 1024px)").matches) ref.current.open = true;
  }, []);
  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
